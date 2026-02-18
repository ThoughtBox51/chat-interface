import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface ChatInterfaceStackProps extends cdk.StackProps {
  config: {
    environment: string;
    domainName: string;
    hostedZoneName: string;
    instanceType: string;
    maxUsers: number;
  };
}

export class ChatInterfaceStackMinimal extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChatInterfaceStackProps) {
    super(scope, id, props);

    const { config } = props;

    // ========================================
    // VPC - Simple Public Subnet Only
    // ========================================
    const vpc = new ec2.Vpc(this, 'ChatInterfaceVPC', {
      maxAzs: 2,
      natGateways: 0, // No NAT Gateway = Save €35/month
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // ========================================
    // Security Group for EC2
    // ========================================
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      description: 'Security group for EC2 backend instance',
      allowAllOutbound: true,
    });
    
    // Allow HTTPS from CloudFront (or anywhere for simplicity)
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from anywhere'
    );
    
    // Allow HTTP for backend API
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5000),
      'Allow backend API access'
    );
    
    // Allow SSH from your IP (optional, for debugging)
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH (restrict to your IP in production)'
    );

    // ========================================
    // DynamoDB Tables
    // ========================================
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'chatinterface-users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const chatsTable = new dynamodb.Table(this, 'ChatsTable', {
      tableName: 'chatinterface-chats',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'chat_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });
    chatsTable.addGlobalSecondaryIndex({
      indexName: 'chat_id-index',
      partitionKey: { name: 'chat_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
    chatsTable.addGlobalSecondaryIndex({
      indexName: 'conversation_id-index',
      partitionKey: { name: 'conversation_id', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const modelsTable = new dynamodb.Table(this, 'ModelsTable', {
      tableName: 'chatinterface-models',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    const rolesTable = new dynamodb.Table(this, 'RolesTable', {
      tableName: 'chatinterface-roles',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // ========================================
    // IAM Role for EC2
    // ========================================
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for ChatInterface EC2 backend instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant DynamoDB permissions
    usersTable.grantReadWriteData(ec2Role);
    chatsTable.grantReadWriteData(ec2Role);
    modelsTable.grantReadWriteData(ec2Role);
    rolesTable.grantReadWriteData(ec2Role);

    // ========================================
    // Elastic IP for EC2
    // ========================================
    const eip = new ec2.CfnEIP(this, 'BackendEIP', {
      domain: 'vpc',
      tags: [{ key: 'Name', value: 'ChatInterface-Backend-EIP' }],
    });

    // ========================================
    // EC2 Instance for Backend
    // ========================================
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Update system',
      'yum update -y',
      '',
      '# Install Python 3.11',
      'yum install -y python3.11 python3.11-pip git',
      '',
      '# Create application directory',
      'mkdir -p /opt/chatinterface',
      'cd /opt/chatinterface',
      '',
      '# Install CloudWatch agent',
      'wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm',
      'rpm -U ./amazon-cloudwatch-agent.rpm',
      '',
      '# Create systemd service',
      'cat > /etc/systemd/system/chatinterface.service << EOF',
      '[Unit]',
      'Description=ChatInterface Backend API',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=ec2-user',
      'WorkingDirectory=/opt/chatinterface/backend',
      'Environment="AWS_DEFAULT_REGION=eu-west-1"',
      'Environment="AWS_REGION=eu-west-1"',
      'ExecStart=/usr/bin/python3.11 run.py',
      'Restart=always',
      'RestartSec=10',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      '',
      'echo "EC2 instance setup complete"'
    );

    const backendInstance = new ec2.Instance(this, 'BackendInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Public subnet (no NAT needed)
      instanceType: new ec2.InstanceType(config.instanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // Associate Elastic IP with EC2 instance
    new ec2.CfnEIPAssociation(this, 'EIPAssociation', {
      eip: eip.ref,
      instanceId: backendInstance.instanceId,
    });

    // ========================================
    // Route53 Hosted Zone Lookup
    // ========================================
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: config.hostedZoneName,
    });

    // ========================================
    // ACM Certificate for CloudFront (us-east-1)
    // ========================================
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: config.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // ========================================
    // S3 Bucket for Frontend
    // ========================================
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `chatinterface-frontend-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [
        {
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // ========================================
    // CloudFront Distribution
    // ========================================
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'FrontendOAI',
      {
        comment: 'OAI for ChatInterface frontend',
      }
    );

    frontendBucket.grantRead(originAccessIdentity);

    // Cache policies
    const frontendCachePolicy = new cloudfront.CachePolicy(this, 'FrontendCachePolicy', {
      cachePolicyName: 'ChatInterfaceFrontendCache',
      comment: 'Cache policy for static frontend assets',
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    });

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: 'ChatInterfaceApiCache',
      comment: 'Cache policy for API requests',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: 'ChatInterface Frontend Distribution',
      domainNames: [config.domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: frontendCachePolicy,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(eip.ref, {
            httpPort: 5000,
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: apiCachePolicy,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          compress: true,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // ========================================
    // Route53 A Record for CloudFront
    // ========================================
    new route53.ARecord(this, 'CloudFrontAliasRecord', {
      zone: hostedZone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      comment: 'Alias record for ChatInterface CloudFront distribution',
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
      exportName: 'ChatInterface-VpcId',
    });

    new cdk.CfnOutput(this, 'BackendInstanceId', {
      value: backendInstance.instanceId,
      description: 'Backend EC2 Instance ID',
      exportName: 'ChatInterface-BackendInstanceId',
    });

    new cdk.CfnOutput(this, 'BackendElasticIP', {
      value: eip.ref,
      description: 'Backend Elastic IP',
      exportName: 'ChatInterface-BackendEIP',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: 'ChatInterface-FrontendBucket',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'ChatInterface-CloudFrontDistributionId',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: 'ChatInterface-CloudFrontDomain',
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: usersTable.tableName,
      description: 'DynamoDB Users Table Name',
    });

    new cdk.CfnOutput(this, 'ChatsTableName', {
      value: chatsTable.tableName,
      description: 'DynamoDB Chats Table Name',
    });

    new cdk.CfnOutput(this, 'ModelsTableName', {
      value: modelsTable.tableName,
      description: 'DynamoDB Models Table Name',
    });

    new cdk.CfnOutput(this, 'RolesTableName', {
      value: rolesTable.tableName,
      description: 'DynamoDB Roles Table Name',
    });

    new cdk.CfnOutput(this, 'ApplicationUrl', {
      value: `https://${config.domainName}`,
      description: 'Application URL',
      exportName: 'ChatInterface-ApplicationUrl',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });
  }
}

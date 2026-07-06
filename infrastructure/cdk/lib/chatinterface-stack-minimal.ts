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
  // Certificate must come from us-east-1 stack (required by CloudFront)
  certificate: acm.Certificate;
}

export class ChatInterfaceStackMinimal extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChatInterfaceStackProps) {
    super(scope, id, props);

    const { config, certificate } = props;

    // ========================================
    // VPC - Simple Public Subnet Only
    // ========================================
    const vpc = new ec2.Vpc(this, 'ChatInterfaceVPC', {
      maxAzs: 2,
      natGateways: 0,
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
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(5000), 'Allow backend API');
    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');

    // ========================================
    // DynamoDB Tables
    // ========================================
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'chatgenie-users',
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
      tableName: 'chatgenie-chats',
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
      tableName: 'chatgenie-models',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    const rolesTable = new dynamodb.Table(this, 'RolesTable', {
      tableName: 'chatgenie-roles',
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
      description: 'IAM role for ChatGenie EC2 backend instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    usersTable.grantReadWriteData(ec2Role);
    chatsTable.grantReadWriteData(ec2Role);
    modelsTable.grantReadWriteData(ec2Role);
    rolesTable.grantReadWriteData(ec2Role);

    // ========================================
    // Elastic IP for EC2
    // ========================================
    const eip = new ec2.CfnEIP(this, 'BackendEIP', {
      domain: 'vpc',
      tags: [{ key: 'Name', value: 'ChatGenie-Backend-EIP' }],
    });

    // ========================================
    // EC2 Instance for Backend
    // ========================================
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      'yum update -y',
      'yum install -y python3.11 python3.11-pip git',
      'mkdir -p /opt/chatgenie',
      'cat > /etc/systemd/system/chatgenie.service << EOF',
      '[Unit]',
      'Description=ChatGenie Backend API',
      'After=network.target',
      '',
      '[Service]',
      'Type=simple',
      'User=ec2-user',
      'WorkingDirectory=/opt/chatgenie/backend',
      'Environment="AWS_DEFAULT_REGION=eu-central-1"',
      'Environment="AWS_REGION=eu-central-1"',
      'ExecStart=/usr/bin/python3.11 run.py',
      'Restart=always',
      'RestartSec=10',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'EOF',
      'echo "EC2 setup complete"'
    );

    const backendInstance = new ec2.Instance(this, 'BackendInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
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

    // Route53 A record for backend API → EC2 Elastic IP
    const apiSubdomain = `api.${config.domainName}`;
    new route53.ARecord(this, 'BackendApiRecord', {
      zone: hostedZone,
      recordName: apiSubdomain,
      target: route53.RecordTarget.fromIpAddresses(eip.ref),
      ttl: cdk.Duration.seconds(300),
    });

    // ========================================
    // S3 Bucket for Frontend
    // ========================================
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `chatgenie-frontend-v2-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
      lifecycleRules: [{ noncurrentVersionExpiration: cdk.Duration.days(30) }],
    });

    // ========================================
    // CloudFront Distribution
    // Uses certificate from us-east-1 CertificateStack
    // ========================================

    const frontendCachePolicy = new cloudfront.CachePolicy(this, 'FrontendCachePolicy', {
      cachePolicyName: 'ChatGenieFrontendCache',
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
      cachePolicyName: 'ChatGenieApiCache',
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Content-Type'),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
    });

    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: 'ChatGenie Frontend Distribution',
      domainNames: [config.domainName],
      certificate,  // from us-east-1 CertificateStack
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: frontendCachePolicy,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiSubdomain, {
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
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html', ttl: cdk.Duration.seconds(0) },
      ],
    });

    // Route53 alias for CloudFront
    new route53.ARecord(this, 'CloudFrontAliasRecord', {
      zone: hostedZone,
      recordName: config.domainName,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'BackendInstanceId', { value: backendInstance.instanceId, exportName: 'ChatGenie-BackendInstanceId' });
    new cdk.CfnOutput(this, 'BackendElasticIP', { value: eip.ref, exportName: 'ChatGenie-BackendEIP' });
    new cdk.CfnOutput(this, 'FrontendBucketName', { value: frontendBucket.bucketName, exportName: 'ChatGenie-FrontendBucket' });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: distribution.distributionId, exportName: 'ChatGenie-CloudFrontId' });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: distribution.distributionDomainName, exportName: 'ChatGenie-CloudFrontDomain' });
    new cdk.CfnOutput(this, 'ApplicationUrl', { value: `https://${config.domainName}`, exportName: 'ChatGenie-ApplicationUrl' });
    new cdk.CfnOutput(this, 'BackendApiUrl', { value: `https://${apiSubdomain}`, exportName: 'ChatGenie-BackendApiUrl' });
  }
}

# ChatInterface AWS CDK Infrastructure

This directory contains AWS CDK code to deploy the ChatInterface MVP to AWS EU region (eu-west-1).

## Architecture

The CDK stack creates:

- **VPC**: 2 AZs with public and private subnets
- **EC2**: t3.small instance for Python FastAPI backend
- **ALB**: Application Load Balancer for backend
- **DynamoDB**: 4 tables (users, chats, models, roles) with GSIs
- **S3**: Bucket for React frontend hosting
- **CloudFront**: CDN distribution with custom cache policies
- **IAM**: Roles and policies for EC2 DynamoDB access
- **Security Groups**: Proper network isolation

## Prerequisites

1. **AWS CLI** configured with credentials
2. **Node.js** 18+ and npm
3. **AWS CDK** CLI installed globally
4. **AWS Account** with appropriate permissions

```bash
# Install AWS CDK globally
npm install -g aws-cdk

# Verify installation
cdk --version
```

## Setup

1. **Install dependencies**:
```bash
cd infrastructure/cdk
npm install
```

2. **Configure environment variables** (optional):
```bash
# Set your domain name (optional)
export DOMAIN_NAME=yourdomain.com

# Set existing ACM certificate ARN (optional)
export CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxx
```

3. **Bootstrap CDK** (first time only):
```bash
cdk bootstrap aws://ACCOUNT-ID/eu-west-1
```

## Deployment Commands

### Synthesize CloudFormation Template
```bash
npm run synth
```
This generates CloudFormation templates in `cdk.out/` directory.

### View Changes (Diff)
```bash
npm run diff
```

### Deploy Stack
```bash
npm run deploy
```

Or with approval bypass:
```bash
cdk deploy --require-approval never
```

### Destroy Stack
```bash
npm run destroy
```

## CloudFormation Template

After running `npm run synth`, the CloudFormation template will be available at:
```
cdk.out/ChatInterfaceStack.template.json
```

You can deploy this template directly via AWS Console or CLI:
```bash
aws cloudformation create-stack \
  --stack-name ChatInterfaceStack \
  --template-body file://cdk.out/ChatInterfaceStack.template.json \
  --capabilities CAPABILITY_IAM \
  --region eu-west-1
```

## Stack Outputs

After deployment, the stack outputs:

- `VpcId`: VPC identifier
- `BackendInstanceId`: EC2 instance ID
- `ALBDnsName`: Load balancer DNS name
- `FrontendBucketName`: S3 bucket name for frontend
- `CloudFrontDistributionId`: CloudFront distribution ID
- `CloudFrontDomainName`: CloudFront URL (your app URL)
- `UsersTableName`: DynamoDB users table
- `ChatsTableName`: DynamoDB chats table
- `ModelsTableName`: DynamoDB models table
- `RolesTableName`: DynamoDB roles table

## Post-Deployment Steps

### 1. Deploy Backend Code

SSH into EC2 instance (via Session Manager):
```bash
aws ssm start-session --target <BackendInstanceId> --region eu-west-1
```

Then on the instance:
```bash
cd /opt/chatinterface
git clone https://github.com/yourusername/chatinterface.git .
cd backend
pip3.11 install -r requirements.txt

# Create .env file
cat > .env << EOF
AWS_REGION=eu-west-1
AWS_DEFAULT_REGION=eu-west-1
DYNAMODB_USERS_TABLE=chatinterface-users
DYNAMODB_CHATS_TABLE=chatinterface-chats
DYNAMODB_MODELS_TABLE=chatinterface-models
DYNAMODB_ROLES_TABLE=chatinterface-roles
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-key
EOF

# Start service
sudo systemctl enable chatinterface
sudo systemctl start chatinterface
sudo systemctl status chatinterface
```

### 2. Deploy Frontend

Build and upload React app:
```bash
# From project root
npm run build

# Upload to S3
aws s3 sync dist/ s3://<FrontendBucketName>/ \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html separately with no-cache
aws s3 cp dist/index.html s3://<FrontendBucketName>/ \
  --cache-control "no-cache"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <CloudFrontDistributionId> \
  --paths "/*"
```

### 3. Initialize Database

Run initialization scripts:
```bash
# SSH into EC2
cd /opt/chatinterface/backend

# Create tables (if not using CDK-created tables)
python3.11 create_dynamodb_tables.py

# Create admin user
python3.11 create_admin.py

# Add initial models
python3.11 test_setup.py
```

### 4. Update Frontend Config

Update `src/config.js` with CloudFront URL:
```javascript
export const API_BASE_URL = 'https://<CloudFrontDomainName>/api';
```

Rebuild and redeploy frontend.

## Configuration

### Modify Instance Type

Edit `bin/app.ts`:
```typescript
const config = {
  instanceType: 't3.micro', // Current: t3.micro (Free Tier)
  // Options: t3.small, t3.medium, t3.large, etc.
  // ...
};
```

**Free Tier Eligible**: t2.micro, t3.micro (750 hours/month for 12 months)

### Add Custom Domain

1. Create ACM certificate in `us-east-1` (for CloudFront)
2. Set environment variable:
```bash
export CERTIFICATE_ARN=arn:aws:acm:us-east-1:xxx:certificate/xxx
```
3. Update stack to add certificate to CloudFront
4. Create Route53 alias record pointing to CloudFront

## Cost Optimization

Current configuration is optimized for MVP (<100 users):

- Single NAT Gateway (instead of 2)
- t3.micro instance (Free Tier eligible)
- Pay-per-request DynamoDB billing (Free Tier: 25 GB, 25 WCU, 25 RCU)
- CloudFront PriceClass 100 (EU + US only)
- No Auto Scaling (can add later)

**Estimated monthly cost**: 
- With Free Tier (first 12 months): €55-75/month
- After Free Tier: €90-120/month

**Free Tier Benefits**:
- EC2 t3.micro: 750 hours/month (covers 24/7 operation)
- DynamoDB: 25 GB storage + 25 WCU + 25 RCU
- S3: 5 GB storage + 20,000 GET + 2,000 PUT
- Data Transfer: 100 GB/month outbound
- CloudFront: 1 TB data transfer + 10M requests

## Monitoring

CloudWatch logs are automatically configured for:
- EC2 instance metrics
- ALB access logs
- CloudFront access logs
- DynamoDB metrics

Access logs in CloudWatch Console or via CLI:
```bash
aws logs tail /aws/ec2/chatinterface --follow --region eu-west-1
```

## Backup and Recovery

- **DynamoDB**: Point-in-time recovery enabled
- **S3**: Versioning enabled
- **EC2**: Create AMI snapshots regularly

Create EC2 snapshot:
```bash
aws ec2 create-image \
  --instance-id <BackendInstanceId> \
  --name "ChatInterface-Backup-$(date +%Y%m%d)" \
  --region eu-west-1
```

## Troubleshooting

### Backend not responding
```bash
# Check EC2 instance status
aws ec2 describe-instance-status --instance-ids <BackendInstanceId>

# Check service logs
aws ssm start-session --target <BackendInstanceId>
sudo journalctl -u chatinterface -f
```

### Frontend not loading
```bash
# Check S3 bucket contents
aws s3 ls s3://<FrontendBucketName>/

# Check CloudFront distribution status
aws cloudfront get-distribution --id <CloudFrontDistributionId>
```

### DynamoDB access issues
```bash
# Verify IAM role permissions
aws iam get-role --role-name ChatInterfaceStack-EC2Role*

# Test DynamoDB access from EC2
aws dynamodb list-tables --region eu-west-1
```

## Security Best Practices

✅ Implemented:
- VPC with private subnets for backend
- Security groups with minimal access
- DynamoDB encryption at rest
- S3 bucket not publicly accessible
- CloudFront HTTPS redirect
- IAM roles with least privilege
- EBS encryption

🔒 Additional recommendations:
- Enable AWS WAF on CloudFront
- Set up AWS Config for compliance
- Enable GuardDuty for threat detection
- Use AWS Secrets Manager for sensitive data
- Enable MFA for AWS account

## Cleanup

To delete all resources:
```bash
npm run destroy
```

Or via CloudFormation:
```bash
aws cloudformation delete-stack \
  --stack-name ChatInterfaceStack \
  --region eu-west-1
```

**Note**: DynamoDB tables and S3 bucket have `RETAIN` policy and won't be deleted automatically. Delete manually if needed.

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review stack events in CloudFormation console
3. Verify all prerequisites are met
4. Ensure AWS credentials have sufficient permissions

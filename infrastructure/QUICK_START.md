# ChatInterface AWS Deployment - Quick Start Guide

Deploy your ChatInterface application to AWS using CDK with custom domain `chatgenie.thought-box.in`.

## Prerequisites

✅ AWS CLI configured with profile "Venkatesh"
✅ Node.js 18+ installed
✅ Domain `thought-box.in` already in Route53
✅ AWS account with appropriate permissions

## Deployment Steps

### 1. Install Dependencies

```bash
cd infrastructure/cdk
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
# Get your AWS account ID
aws sts get-caller-identity --profile Venkatesh --query Account --output text

# Bootstrap CDK
cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-west-1 --profile Venkatesh
```

### 3. Deploy Infrastructure

From the project root:

```bash
chmod +x infrastructure/deploy.sh
./infrastructure/deploy.sh
```

This will:
- Create VPC with public/private subnets
- Deploy EC2 instance for backend
- Create Application Load Balancer
- Set up 4 DynamoDB tables with GSIs
- Create S3 bucket for frontend
- Configure CloudFront distribution
- Create ACM certificate for `chatgenie.thought-box.in`
- Set up Route53 A record pointing to CloudFront

**Deployment time**: ~15-20 minutes (ACM certificate validation takes longest)

### 4. Deploy Backend Code

```bash
chmod +x infrastructure/deploy-backend.sh
./infrastructure/deploy-backend.sh
```

You'll be prompted for:
- `SECRET_KEY` (press Enter to auto-generate)
- `OPENAI_API_KEY` (required)

### 5. Deploy Frontend

```bash
chmod +x infrastructure/deploy-frontend.sh
./infrastructure/deploy-frontend.sh
```

This will:
- Build React app with production config
- Upload to S3 with proper cache headers
- Invalidate CloudFront cache
- Configure API endpoint to use custom domain

### 6. Initialize Database

SSH into EC2 instance:

```bash
# Get instance ID from deployment-outputs.json
INSTANCE_ID=$(jq -r '.[] | select(.OutputKey=="BackendInstanceId") | .OutputValue' deployment-outputs.json)

# Connect via Session Manager
aws ssm start-session --target $INSTANCE_ID --region eu-west-1 --profile Venkatesh
```

On the EC2 instance:

```bash
cd /opt/chatinterface/backend

# Create admin user
python3.11 create_admin.py

# Add initial AI models
python3.11 test_setup.py

# Verify service is running
sudo systemctl status chatinterface
```

### 7. Access Your Application

Open your browser and navigate to:

```
https://chatgenie.thought-box.in
```

Login with the admin credentials you created.

## What Gets Created

### Networking
- VPC with 2 AZs
- Public subnets (for ALB)
- Private subnets (for EC2)
- 1 NAT Gateway (cost optimized)
- Internet Gateway
- Security Groups

### Compute
- EC2 t3.micro instance (backend) - Free Tier eligible
- Application Load Balancer
- Target Group with health checks

### Storage
- DynamoDB tables:
  - `chatinterface-users` (with email-index GSI)
  - `chatinterface-chats` (with chat_id-index and conversation_id-index GSIs)
  - `chatinterface-models`
  - `chatinterface-roles`
- S3 bucket for frontend (versioned, encrypted)

### CDN & DNS
- CloudFront distribution with custom domain
- ACM certificate for HTTPS
- Route53 A record: `chatgenie.thought-box.in` → CloudFront

### IAM
- EC2 instance role with DynamoDB permissions
- SSM permissions for remote access

## Cost Estimate

Monthly costs for <100 users:

| Service | Cost | Free Tier |
|---------|------|-----------|
| EC2 t3.micro | ~€0 | ✅ 750 hrs/month (12 months) |
| ALB | ~€20 | ❌ |
| NAT Gateway | ~€35 | ❌ |
| DynamoDB | ~€0-5 | ✅ 25 GB storage, 25 WCU, 25 RCU |
| S3 + CloudFront | ~€0-5 | ✅ 5 GB storage, 20k GET, 2k PUT |
| Data Transfer | ~€0-10 | ✅ 100 GB/month |
| **Total** | **€55-75/month** | **€0-20/month with Free Tier** |

**Note**: Free Tier benefits apply for first 12 months. Main costs are ALB (~€20) and NAT Gateway (~€35).

## Monitoring

### Check Backend Logs

```bash
# Via Session Manager
aws ssm start-session --target $INSTANCE_ID --region eu-west-1 --profile Venkatesh

# View logs
sudo journalctl -u chatinterface -f
```

### Check CloudWatch

```bash
# Backend metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --profile Venkatesh
```

### Check DynamoDB

```bash
# List tables
aws dynamodb list-tables --region eu-west-1 --profile Venkatesh

# Scan users table
aws dynamodb scan \
  --table-name chatinterface-users \
  --region eu-west-1 \
  --profile Venkatesh
```

## Troubleshooting

### Certificate Validation Stuck

If ACM certificate validation takes too long:

1. Check Route53 for CNAME records
2. Verify hosted zone is correct
3. Wait up to 30 minutes for DNS propagation

### Backend Not Responding

```bash
# Check EC2 instance status
aws ec2 describe-instance-status \
  --instance-ids $INSTANCE_ID \
  --region eu-west-1 \
  --profile Venkatesh

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN> \
  --region eu-west-1 \
  --profile Venkatesh
```

### Frontend Not Loading

```bash
# Check S3 bucket contents
BUCKET_NAME=$(jq -r '.[] | select(.OutputKey=="FrontendBucketName") | .OutputValue' deployment-outputs.json)
aws s3 ls s3://$BUCKET_NAME/ --profile Venkatesh

# Check CloudFront distribution
DISTRIBUTION_ID=$(jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue' deployment-outputs.json)
aws cloudfront get-distribution --id $DISTRIBUTION_ID --profile Venkatesh
```

## Updating the Application

### Update Backend Code

```bash
# SSH into EC2
aws ssm start-session --target $INSTANCE_ID --region eu-west-1 --profile Venkatesh

# Pull latest code
cd /opt/chatinterface
git pull

# Restart service
sudo systemctl restart chatinterface
```

### Update Frontend

```bash
# From project root
npm run build
./infrastructure/deploy-frontend.sh
```

## Rollback

If something goes wrong:

```bash
# Rollback infrastructure
cd infrastructure/cdk
cdk destroy --profile Venkatesh

# Or via CloudFormation
aws cloudformation delete-stack \
  --stack-name ChatInterfaceStack \
  --region eu-west-1 \
  --profile Venkatesh
```

**Note**: DynamoDB tables and S3 bucket have `RETAIN` policy and won't be deleted. Delete manually if needed.

## Security Checklist

✅ Backend in private subnet
✅ Security groups with minimal access
✅ DynamoDB encryption at rest
✅ S3 bucket not publicly accessible
✅ CloudFront HTTPS redirect
✅ IAM roles with least privilege
✅ EBS encryption enabled
✅ VPC flow logs (optional, add if needed)

## Next Steps

1. **Set up monitoring alerts**: CloudWatch alarms for CPU, memory, errors
2. **Configure backups**: Automated DynamoDB backups, EC2 AMI snapshots
3. **Add WAF**: Protect against common web attacks
4. **Enable GuardDuty**: Threat detection
5. **Set up CI/CD**: Automate deployments with GitHub Actions
6. **Add Auto Scaling**: Scale EC2 based on load (when needed)

## Support

For issues:
1. Check CloudWatch logs
2. Review CloudFormation events
3. Verify AWS credentials and permissions
4. Check deployment-outputs.json for resource IDs

## Clean Architecture

```
Internet
    ↓
CloudFront (chatgenie.thought-box.in)
    ↓
    ├─→ S3 (Frontend) ──→ React App
    └─→ ALB (Backend) ──→ EC2 (FastAPI) ──→ DynamoDB
```

All traffic flows through CloudFront with proper caching and HTTPS.

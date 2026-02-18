# MVP Production Deployment Plan - EU Region

## Executive Summary

**Target**: Production-ready MVP deployment in EU region
**Users**: < 100 users
**Environment**: Single production environment
**Timeline**: 2-3 days for setup + deployment
**Estimated Monthly Cost**: €50-150/month

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Users (EU)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudFront CDN (eu-west-1)                     │
│              - Static Assets (React App)                     │
│              - SSL/TLS Termination                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Application Load Balancer (eu-west-1)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              EC2 Instance (t3.small)                        │
│              - FastAPI Backend                              │
│              - Python 3.11                                  │
│              - Nginx Reverse Proxy                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DynamoDB (eu-west-1)                           │
│              - Users, Chats, Roles, Models Tables           │
│              - On-Demand Billing                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Pre-Deployment Checklist

### 1.1 Code Preparation

**Frontend Changes:**
- [ ] Update API URL to production endpoint
- [ ] Remove all console.log statements
- [ ] Enable production build optimizations
- [ ] Add error tracking (Sentry)
- [ ] Configure environment variables

**Backend Changes:**
- [ ] Set production environment variables
- [ ] Enable CORS for production domain
- [ ] Configure rate limiting
- [ ] Add request logging
- [ ] Set up health check endpoint

**Security:**
- [ ] Review and rotate all API keys
- [ ] Set strong JWT secret
- [ ] Configure HTTPS only
- [ ] Enable security headers
- [ ] Set up password policies

### 1.2 Environment Variables

**Frontend (.env.production):**
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_ENV=production
VITE_SENTRY_DSN=your-sentry-dsn
```

**Backend (.env):**
```bash
# Environment
ENVIRONMENT=production
DEBUG=False

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com

# AWS
AWS_REGION=eu-west-1
AWS_PROFILE=production
DYNAMODB_ENDPOINT=https://dynamodb.eu-west-1.amazonaws.com

# Database Tables
USERS_TABLE=chat-app-users-prod
CHATS_TABLE=chat-app-chats-prod
MODELS_TABLE=chat-app-models-prod
ROLES_TABLE=chat-app-roles-prod

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

---

## Phase 2: AWS Infrastructure Setup

### 2.1 AWS Account Setup

**Region**: eu-west-1 (Ireland) - Best for EU GDPR compliance

**IAM Setup:**
1. Create production IAM user
2. Attach policies:
   - AmazonDynamoDBFullAccess
   - AmazonEC2FullAccess
   - AmazonS3FullAccess
   - CloudFrontFullAccess
3. Generate access keys
4. Enable MFA

### 2.2 DynamoDB Tables

**Create Tables in eu-west-1:**

```bash
# Users Table
aws dynamodb create-table \
  --table-name chat-app-users-prod \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=email-index,KeySchema=[{AttributeName=email,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1

# Chats Table
aws dynamodb create-table \
  --table-name chat-app-chats-prod \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
    AttributeName=updated_at,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=user-id-index,KeySchema=[{AttributeName=user_id,KeyType=HASH},{AttributeName=updated_at,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1

# Models Table
aws dynamodb create-table \
  --table-name chat-app-models-prod \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1

# Roles Table
aws dynamodb create-table \
  --table-name chat-app-roles-prod \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-west-1
```

**Estimated Cost**: €0-5/month (< 100 users)

### 2.3 EC2 Instance

**Instance Type**: t3.small (2 vCPU, 2GB RAM)
**AMI**: Ubuntu 22.04 LTS
**Region**: eu-west-1a
**Storage**: 20GB gp3 SSD

**Setup Steps:**
1. Launch EC2 instance
2. Configure security group:
   - Port 22 (SSH) - Your IP only
   - Port 80 (HTTP) - 0.0.0.0/0
   - Port 443 (HTTPS) - 0.0.0.0/0
   - Port 5000 (Backend) - Internal only
3. Attach Elastic IP
4. Create key pair for SSH access

**Estimated Cost**: €15-20/month

### 2.4 S3 + CloudFront (Frontend)

**S3 Bucket:**
- Name: chat-app-frontend-prod
- Region: eu-west-1
- Enable static website hosting
- Block public access (CloudFront only)

**CloudFront Distribution:**
- Origin: S3 bucket
- SSL Certificate: AWS Certificate Manager (free)
- Price Class: Use Only Europe
- Enable compression
- Cache policy: CachingOptimized

**Estimated Cost**: €5-10/month

---

## Phase 3: Deployment Steps

### 3.1 Backend Deployment

**SSH into EC2:**
```bash
ssh -i your-key.pem ubuntu@your-elastic-ip
```

**Install Dependencies:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Nginx
sudo apt install nginx -y

# Install Supervisor (process manager)
sudo apt install supervisor -y

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Deploy Application:**
```bash
# Create app directory
sudo mkdir -p /var/www/chat-app
sudo chown ubuntu:ubuntu /var/www/chat-app

# Clone repository (or upload via SCP)
cd /var/www/chat-app
git clone your-repo-url backend
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, eu-west-1, json

# Create .env file
nano .env
# Paste production environment variables

# Test application
python run.py
# Verify it starts without errors
```

**Configure Supervisor:**
```bash
sudo nano /etc/supervisor/conf.d/chat-app.conf
```

```ini
[program:chat-app]
directory=/var/www/chat-app/backend
command=/var/www/chat-app/backend/venv/bin/python run.py
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/chat-app/err.log
stdout_logfile=/var/log/chat-app/out.log
environment=PATH="/var/www/chat-app/backend/venv/bin"
```

```bash
# Create log directory
sudo mkdir -p /var/log/chat-app
sudo chown ubuntu:ubuntu /var/log/chat-app

# Start application
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start chat-app
sudo supervisorctl status
```

**Configure Nginx:**
```bash
sudo nano /etc/nginx/sites-available/chat-app
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/chat-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
# Follow prompts, select redirect HTTP to HTTPS
```

### 3.2 Frontend Deployment

**Build Frontend Locally:**
```bash
cd frontend
npm install
npm run build
# Creates dist/ folder
```

**Upload to S3:**
```bash
aws s3 sync dist/ s3://chat-app-frontend-prod/ \
  --region eu-west-1 \
  --delete \
  --cache-control "public, max-age=31536000, immutable"
```

**Invalidate CloudFront Cache:**
```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Phase 4: Post-Deployment

### 4.1 Initialize Database

**Create Admin User:**
```bash
ssh into EC2
cd /var/www/chat-app/backend
source venv/bin/activate
python create_admin.py
# Enter admin email and password
```

**Add Default Models:**
```bash
python -c "
from app.core.database import get_dynamodb
from app.core.config import settings
import uuid
from datetime import datetime

db = get_dynamodb()
table = db.get_table(settings.MODELS_TABLE)

# Add GPT-4 model
table.put_item(Item={
    'id': str(uuid.uuid4()),
    'name': 'gpt-4',
    'display_name': 'GPT-4',
    'provider': 'OpenAI',
    'endpoint': 'https://api.openai.com/v1/chat/completions',
    'api_key': 'your-openai-api-key',
    'created_at': datetime.utcnow().isoformat()
})
print('Model added successfully')
"
```

### 4.2 Monitoring Setup

**CloudWatch Alarms:**
```bash
# CPU Utilization
aws cloudwatch put-metric-alarm \
  --alarm-name chat-app-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --region eu-west-1

# DynamoDB Throttles
aws cloudwatch put-metric-alarm \
  --alarm-name chat-app-dynamodb-throttles \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region eu-west-1
```

**Application Logs:**
```bash
# View backend logs
sudo tail -f /var/log/chat-app/out.log
sudo tail -f /var/log/chat-app/err.log

# View Nginx logs
sudo tail -f /var/nginx/access.log
sudo tail -f /var/nginx/error.log
```

### 4.3 Backup Strategy

**DynamoDB Backups:**
```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name chat-app-users-prod \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region eu-west-1

# Repeat for all tables
```

**EC2 Snapshots:**
```bash
# Create AMI backup weekly
aws ec2 create-image \
  --instance-id i-xxxxx \
  --name "chat-app-backup-$(date +%Y%m%d)" \
  --region eu-west-1
```

---

## Phase 5: Testing & Validation

### 5.1 Smoke Tests

**Backend Health:**
```bash
curl https://api.yourdomain.com/health
# Expected: {"status": "healthy"}
```

**Frontend:**
```bash
curl https://yourdomain.com
# Expected: HTML content
```

**Authentication:**
```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
# Expected: {"access_token": "..."}
```

### 5.2 Load Testing

**Simple Load Test:**
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoint
ab -n 1000 -c 10 https://api.yourdomain.com/api/models/
# Should handle 10 concurrent users easily
```

### 5.3 Security Scan

**SSL Test:**
- Visit: https://www.ssllabs.com/ssltest/
- Enter: api.yourdomain.com
- Target: A+ rating

**Security Headers:**
```bash
curl -I https://api.yourdomain.com
# Verify headers: X-Frame-Options, X-Content-Type-Options, etc.
```

---

## Phase 6: Maintenance & Operations

### 6.1 Update Procedure

**Backend Updates:**
```bash
ssh into EC2
cd /var/www/chat-app/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart chat-app
```

**Frontend Updates:**
```bash
# Local machine
npm run build
aws s3 sync dist/ s3://chat-app-frontend-prod/ --delete
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

### 6.2 Monitoring Checklist

**Daily:**
- [ ] Check CloudWatch alarms
- [ ] Review error logs
- [ ] Monitor DynamoDB usage

**Weekly:**
- [ ] Review access logs
- [ ] Check disk space
- [ ] Verify backups

**Monthly:**
- [ ] Review AWS costs
- [ ] Update dependencies
- [ ] Security patches

---

## Cost Breakdown (Monthly)

| Service | Configuration | Cost (EUR) |
|---------|--------------|------------|
| EC2 t3.small | 730 hours | €15-20 |
| EBS Storage | 20GB gp3 | €2 |
| Elastic IP | 1 IP | €0 (attached) |
| DynamoDB | On-demand, <100 users | €0-5 |
| S3 | Frontend hosting | €1 |
| CloudFront | EU only | €5-10 |
| Data Transfer | <100GB | €5-10 |
| Route53 | 1 hosted zone | €0.50 |
| **Total** | | **€50-150/month** |

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Day 1** | 4-6 hours | AWS setup, DynamoDB tables, EC2 instance |
| **Day 2** | 4-6 hours | Backend deployment, Nginx, SSL |
| **Day 3** | 2-4 hours | Frontend deployment, testing, monitoring |
| **Total** | **2-3 days** | Full production deployment |

---

## Success Criteria

- [ ] Application accessible at https://yourdomain.com
- [ ] API accessible at https://api.yourdomain.com
- [ ] SSL A+ rating
- [ ] < 2 second page load time
- [ ] All features working (auth, chat, roles)
- [ ] Monitoring and alerts configured
- [ ] Backups enabled
- [ ] Documentation complete

---

## Rollback Plan

**If deployment fails:**

1. **Frontend**: Revert S3 to previous version
2. **Backend**: 
   ```bash
   cd /var/www/chat-app/backend
   git checkout previous-commit
   sudo supervisorctl restart chat-app
   ```
3. **Database**: Restore from point-in-time backup
4. **DNS**: Keep old records until verified

---

## Next Steps

1. **Review this plan** - Confirm architecture and costs
2. **Prepare AWS account** - Set up IAM, billing alerts
3. **Domain setup** - Register domain, configure DNS
4. **Execute deployment** - Follow phases 1-6
5. **User onboarding** - Create accounts, test with users

---

## Support & Troubleshooting

**Common Issues:**

1. **502 Bad Gateway**: Backend not running
   ```bash
   sudo supervisorctl status chat-app
   sudo supervisorctl restart chat-app
   ```

2. **CORS Errors**: Check ALLOWED_ORIGINS in .env

3. **DynamoDB Access Denied**: Verify IAM permissions

4. **High Costs**: Check CloudWatch metrics, optimize queries

**Need Help?**
- AWS Support: Basic plan included
- Community: Stack Overflow, AWS Forums
- Documentation: AWS docs, FastAPI docs

---

## Conclusion

This plan provides a **production-ready, cost-effective MVP deployment** for <100 users in EU region. The architecture is:

- ✅ **Scalable**: Can grow to 1000+ users with minimal changes
- ✅ **Secure**: HTTPS, security headers, rate limiting
- ✅ **Reliable**: Backups, monitoring, health checks
- ✅ **Cost-effective**: €50-150/month
- ✅ **GDPR-compliant**: EU region, data residency

**Ready to deploy? Let's proceed with Phase 1!**

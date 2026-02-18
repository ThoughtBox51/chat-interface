# AWS Free Tier Optimization Guide

This deployment is optimized to maximize AWS Free Tier benefits for the first 12 months.

## Free Tier Services Used

### ✅ EC2 - t3.micro Instance
- **Free Tier**: 750 hours/month for 12 months
- **Specs**: 2 vCPUs, 1 GB RAM
- **Coverage**: Runs 24/7 within free tier (24 hrs × 31 days = 744 hours)
- **Cost after Free Tier**: ~€8-10/month

**Why t3.micro over t2.micro?**
- Better CPU performance (burstable with credits)
- More modern architecture
- Same Free Tier eligibility
- Better for Python FastAPI workload

### ✅ DynamoDB
- **Free Tier**: Always free (not just 12 months)
  - 25 GB storage
  - 25 WCU (Write Capacity Units)
  - 25 RCU (Read Capacity Units)
- **Your Usage**: ~4 tables, <100 users = well within limits
- **Cost after limits**: Pay-per-request pricing (~€0.25 per million reads)

### ✅ S3
- **Free Tier**: 12 months
  - 5 GB storage
  - 20,000 GET requests
  - 2,000 PUT requests
- **Your Usage**: React build (~5-10 MB) + logs
- **Cost after Free Tier**: ~€0.023/GB/month

### ✅ CloudFront
- **Free Tier**: Always free
  - 1 TB data transfer out
  - 10 million HTTP/HTTPS requests
- **Your Usage**: <100 users = well within limits
- **Cost after limits**: ~€0.085/GB

### ✅ Data Transfer
- **Free Tier**: 100 GB/month outbound (always free)
- **Your Usage**: <100 users with chat app = ~10-20 GB/month
- **Cost after Free Tier**: €0.09/GB

### ✅ Route53
- **Cost**: €0.50/month per hosted zone (not free)
- **Note**: You already have `thought-box.in` hosted zone

## Services NOT in Free Tier

### ❌ Application Load Balancer (ALB)
- **Cost**: ~€20/month (€0.0225/hour + €0.008/LCU-hour)
- **Why needed**: 
  - SSL termination
  - Health checks
  - Integration with CloudFront
- **Alternative**: Use CloudFront → EC2 directly (not recommended for production)

### ❌ NAT Gateway
- **Cost**: ~€35/month (€0.045/hour + €0.045/GB processed)
- **Why needed**: Backend in private subnet needs internet access
- **Alternative**: Put EC2 in public subnet (less secure)

### ❌ ACM Certificate
- **Cost**: FREE! (SSL certificates are free)
- **Renewal**: Automatic

## Cost Breakdown

### First 12 Months (with Free Tier)

| Service | Monthly Cost | Free Tier Benefit |
|---------|--------------|-------------------|
| EC2 t3.micro | €0 | ✅ 750 hours |
| ALB | €20 | ❌ |
| NAT Gateway | €35 | ❌ |
| DynamoDB | €0 | ✅ 25 GB + 25 WCU/RCU |
| S3 | €0 | ✅ 5 GB |
| CloudFront | €0 | ✅ 1 TB + 10M requests |
| Route53 | €0.50 | ❌ (existing zone) |
| Data Transfer | €0 | ✅ 100 GB |
| **Total** | **€55-60/month** | |

### After 12 Months

| Service | Monthly Cost |
|---------|--------------|
| EC2 t3.micro | €8 |
| ALB | €20 |
| NAT Gateway | €35 |
| DynamoDB | €0-5 |
| S3 | €0-2 |
| CloudFront | €0-5 |
| Route53 | €0.50 |
| Data Transfer | €0-10 |
| **Total** | **€80-100/month** |

## Further Cost Optimization Options

### Option 1: Remove NAT Gateway (Save €35/month)
**Trade-off**: Less secure

```typescript
// In chatinterface-stack.ts
const vpc = new ec2.Vpc(this, 'ChatInterfaceVPC', {
  maxAzs: 2,
  natGateways: 0, // Remove NAT Gateway
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
    },
  ],
});

// Place EC2 in public subnet
const backendInstance = new ec2.Instance(this, 'BackendInstance', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Changed from PRIVATE
  // ...
});
```

**Security considerations**:
- EC2 directly exposed to internet (behind ALB)
- Use security groups to restrict access
- Enable AWS Shield for DDoS protection

### Option 2: Remove ALB (Save €20/month)
**Trade-off**: No health checks, manual SSL management

Use CloudFront → EC2 directly with Elastic IP.

**Not recommended** for production due to:
- No automatic failover
- No health checks
- Manual SSL certificate management on EC2

### Option 3: Use Lightsail Instead (€3.50-5/month)
**Trade-off**: Less scalable, different architecture

AWS Lightsail offers:
- €3.50/month: 512 MB RAM, 1 vCPU, 20 GB SSD
- €5/month: 1 GB RAM, 1 vCPU, 40 GB SSD
- Includes static IP and data transfer

**Limitations**:
- No VPC integration
- No ALB
- Limited to single instance
- No Auto Scaling

## Recommended Configuration for MVP

### Phase 1: Development/Testing (Minimize Cost)
- EC2 t3.micro in public subnet (no NAT Gateway)
- No ALB (use Elastic IP + CloudFront)
- **Cost**: ~€10-15/month

### Phase 2: Production MVP (Current Setup)
- EC2 t3.micro in private subnet
- ALB for health checks and SSL
- NAT Gateway for security
- **Cost**: €55-60/month (first 12 months)

### Phase 3: Scale Up (>100 users)
- Upgrade to t3.small or t3.medium
- Add Auto Scaling Group
- Consider RDS for database (if needed)
- **Cost**: €150-300/month

## Monitoring Free Tier Usage

### AWS Billing Dashboard
```bash
# Check Free Tier usage
aws ce get-cost-and-usage \
  --time-period Start=2024-02-01,End=2024-02-28 \
  --granularity MONTHLY \
  --metrics "UsageQuantity" \
  --profile Venkatesh
```

### Set Up Billing Alerts
1. Go to AWS Billing Console
2. Create budget: €60/month
3. Set alert at 80% (€48)
4. Email notification

### CloudWatch Alarms
```bash
# Create billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "MonthlyBillingAlert" \
  --alarm-description "Alert when monthly bill exceeds €50" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --profile Venkatesh
```

## Performance Considerations for t3.micro

### CPU Credits
- t3.micro earns 24 CPU credits/hour
- Each credit = 1 vCPU at 100% for 1 minute
- Baseline performance: 10% CPU utilization

### Memory (1 GB RAM)
- Python FastAPI: ~200-300 MB
- OS overhead: ~200 MB
- Available for app: ~500 MB

**Optimization tips**:
1. Use gunicorn with 2 workers (not more)
2. Limit concurrent requests
3. Enable swap space (2 GB)
4. Monitor memory usage

### Add Swap Space (Recommended)
```bash
# SSH into EC2
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Scaling Triggers

Upgrade from t3.micro when:
- CPU credits consistently depleted
- Memory usage >80%
- Response time >2 seconds
- Users >50 concurrent

## Free Tier Expiration Plan

### 11 Months In (1 month before expiration)
1. Review actual usage and costs
2. Decide: continue or optimize further
3. Options:
   - Accept €80-100/month cost
   - Downgrade to Lightsail
   - Optimize architecture (remove NAT/ALB)
   - Migrate to cheaper region (if applicable)

### After 12 Months
- EC2 cost increases by ~€8/month
- Other services remain mostly free (DynamoDB, CloudFront)
- Total increase: ~€8-10/month

## Summary

✅ **Current setup maximizes Free Tier benefits**
✅ **Main costs: ALB (€20) + NAT Gateway (€35)**
✅ **Total: €55-60/month for first year**
✅ **After Free Tier: €80-100/month**

For <100 users, this is a cost-effective production setup with good security and scalability.

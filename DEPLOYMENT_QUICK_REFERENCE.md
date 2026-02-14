# Production Deployment - Quick Reference

## 🎯 Goal
Deploy LLM Chat Application to AWS using Kubernetes (EKS) with Infrastructure as Code (Python CDK) for easy client deployments.

## 📋 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
│                    (Static Assets + Caching)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    Application Load Balancer                 │
│                      (SSL Termination)                       │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
    ┌────────┴────────┐         ┌───────┴────────┐
    │   Frontend      │         │    Backend     │
    │   (Nginx)       │         │   (FastAPI)    │
    │   Pods x2       │         │   Pods x3      │
    └─────────────────┘         └────────┬───────┘
                                         │
                                ┌────────┴────────┐
                                │   DynamoDB      │
                                │   (Managed)     │
                                └─────────────────┘
```

## 🚀 Quick Start (For Clients)

### Prerequisites
```bash
# Install tools
pip install aws-cdk-lib boto3 rich
npm install -g aws-cdk

# Configure AWS
aws configure --profile client-name
```

### Deploy
```bash
# One command deployment
python deploy.py --environment prod --region us-east-1 --domain chat.example.com

# Outputs:
# - Frontend URL
# - Backend API URL
# - Admin credentials
# - Monitoring dashboard URL
```

## 📦 What Gets Deployed

### Infrastructure (AWS CDK)
- **VPC** with 3 AZs (public + private subnets)
- **EKS Cluster** with managed node groups
- **DynamoDB** tables with auto-scaling
- **ALB** for load balancing
- **CloudFront** for CDN
- **Secrets Manager** for secrets
- **CloudWatch** for monitoring

### Application (Kubernetes)
- **Frontend**: 2 replicas (Nginx + React)
- **Backend**: 3 replicas (FastAPI)
- **Auto-scaling**: Based on CPU/memory
- **Health checks**: Liveness + readiness probes

## 💰 Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| EKS Cluster | $73 |
| EC2 Instances (3x t3.medium) | $90 |
| DynamoDB | $25-100 |
| Load Balancer | $20 |
| NAT Gateway | $100 |
| CloudFront | $10-50 |
| Other | $50 |
| **Total** | **$370-500** |

## 🔒 Security Features

✅ Private subnets for workloads
✅ Secrets in AWS Secrets Manager
✅ Encryption at rest and in transit
✅ IAM roles with least privilege
✅ WAF for API protection
✅ Security groups and NACLs

## 📊 Monitoring Included

- Application metrics (latency, errors, throughput)
- Infrastructure metrics (CPU, memory, disk)
- Business metrics (users, chats, token usage)
- Automated alerts (email + Slack)
- CloudWatch dashboards

## 🔄 CI/CD Pipeline

```
Push to main → Build → Test → Build Docker → Push to ECR → Deploy to K8s → Smoke Tests
```

## ⏱️ Timeline

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| 1. App Hardening | 1-2 weeks | Security, config, observability |
| 2. Containerization | 1 week | Dockerfiles, Docker Compose |
| 3. Kubernetes | 1 week | Manifests, Helm charts |
| 4. AWS CDK | 2 weeks | All infrastructure stacks |
| 5. CI/CD | 1 week | GitHub Actions workflows |
| 6. Client Tools | 1 week | Deployment script, docs |
| 7. Testing | 1 week | Load tests, security scans |
| **Total** | **8-10 weeks** | Production-ready system |

## 📁 Project Structure (After Implementation)

```
chat-application/
├── infrastructure/          # AWS CDK (Python)
│   ├── stacks/
│   │   ├── network_stack.py
│   │   ├── eks_stack.py
│   │   ├── database_stack.py
│   │   └── ...
│   └── app.py
├── kubernetes/             # K8s manifests
│   ├── backend/
│   ├── frontend/
│   └── helm/
├── .github/workflows/      # CI/CD
│   ├── build.yml
│   └── deploy.yml
├── backend/
│   ├── Dockerfile
│   └── ...
├── src/
│   ├── Dockerfile
│   └── ...
├── deploy.py              # One-click deployment
└── config.yaml.example    # Configuration template
```

## 🎓 Key Technologies

- **Container**: Docker
- **Orchestration**: Kubernetes (EKS)
- **IaC**: AWS CDK (Python)
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch + X-Ray
- **Database**: DynamoDB
- **CDN**: CloudFront
- **Load Balancer**: ALB

## 🤔 Decision Points

### Multi-Tenant vs. Dedicated
- **Multi-tenant**: One deployment, multiple clients (namespace isolation)
- **Dedicated**: Separate deployment per client (full isolation)

### Region Strategy
- **Single region**: Lower cost, simpler
- **Multi-region**: Higher availability, better latency

### Cost vs. Performance
- **Cost-optimized**: Spot instances, smaller sizes
- **Performance-optimized**: On-demand, larger sizes

## 📞 Next Steps

1. Review [PRODUCTION_DEPLOYMENT_PLAN.md](PRODUCTION_DEPLOYMENT_PLAN.md) for full details
2. Answer clarification questions (scale, budget, compliance)
3. Choose deployment model (dedicated vs. multi-tenant)
4. Set up AWS account structure
5. Start Phase 1: Application Hardening

## 🆘 Support

- Full documentation in `PRODUCTION_DEPLOYMENT_PLAN.md`
- Architecture diagrams in `docs/architecture/`
- Troubleshooting guide in `docs/troubleshooting.md`
- Runbooks in `docs/runbooks/`

---

**Ready to deploy?** Start with Phase 1 or ask questions about any aspect of the plan!


---

## 🧮 NEW: Infrastructure Sizing Calculator

### Automated Sizing Tool

Calculate exact infrastructure requirements for your expected user load:

```bash
# Install dependency
pip install rich

# Run interactive calculator
python infrastructure_calculator.py --interactive

# Or directly specify users
python infrastructure_calculator.py --concurrent-users 1000
```

### Complete Sizing Documentation

1. **[INFRASTRUCTURE_SIZING_SUMMARY.md](INFRASTRUCTURE_SIZING_SUMMARY.md)** ⭐ Start here!
2. **[infrastructure_calculator.py](infrastructure_calculator.py)** - Automated calculator
3. **[CALCULATOR_README.md](CALCULATOR_README.md)** - Calculator guide
4. **[INFRASTRUCTURE_SIZING_GUIDE.md](INFRASTRUCTURE_SIZING_GUIDE.md)** - Technical details
5. **[SIZING_QUICK_REFERENCE.md](SIZING_QUICK_REFERENCE.md)** - Quick charts

### Why Use the Calculator?

✅ Precise pod and node calculations
✅ Accurate cost estimates
✅ Performance projections
✅ Auto-scaling recommendations
✅ DynamoDB capacity planning
✅ Customizable for your use case

**Example Output:**
```
🟡 MEDIUM TIER
- Concurrent Users: 1,000
- Backend Pods: 13-39 (min-max)
- Frontend Pods: 3-6
- Nodes: 8-16 x t3.large
- Monthly Cost: $500-800
- Expected Latency: 50-200ms
```


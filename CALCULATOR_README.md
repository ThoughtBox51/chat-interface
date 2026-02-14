# Infrastructure Sizing Calculator

## Overview

The Infrastructure Sizing Calculator is a Python tool that helps you determine the exact infrastructure requirements for your LLM Chat Application based on expected user load.

## Installation

```bash
# Install required dependency
pip install rich
```

## Usage

### Interactive Mode (Recommended for First-Time Users)

```bash
python infrastructure_calculator.py --interactive
```

This will prompt you for:
- Expected concurrent users
- Total registered users (optional)

### Command-Line Mode

```bash
# Basic usage
python infrastructure_calculator.py --concurrent-users 1000

# With total users specified
python infrastructure_calculator.py --concurrent-users 1000 --total-users 10000

# With custom active ratio
python infrastructure_calculator.py --concurrent-users 1000 --active-ratio 0.15
```

## Example Output

```
╭─────────────────────────────────────╮
│ 🟡 MEDIUM TIER                      │
│ Infrastructure Recommendation       │
╰─────────────────────────────────────╯

╭─ 📊 User Load ──────────────────────╮
│ Concurrent Users    1,000           │
│ Total Users         10,000          │
│ Requests/Second     50              │
│ Expected Latency    50-200 ms       │
╰─────────────────────────────────────╯

╭─ 🔧 Backend Configuration ──────────╮
│ Pod Count          13 - 39          │
│ CPU per Pod        0.5 - 1.0 cores  │
│ Memory per Pod     512 - 1024 MB    │
╰─────────────────────────────────────╯

╭─ 🎨 Frontend Configuration ─────────╮
│ Pod Count          3 - 6            │
│ CPU per Pod        0.2 - 0.4 cores  │
│ Memory per Pod     256 - 512 MB     │
╰─────────────────────────────────────╯

╭─ 🖥️  Node Configuration ────────────╮
│ Instance Type      t3.large         │
│ vCPU per Node      2                │
│ Memory per Node    8 GB             │
│ Node Count         8 - 16           │
╰─────────────────────────────────────╯

╭─ 🗄️  Database Configuration ────────╮
│ DynamoDB Mode      On-Demand        │
│ Estimated RCU      250              │
│ Estimated WCU      100              │
│ Redis Cache        ✅ cache.t3.small│
╰─────────────────────────────────────╯

╭─ 💰 Cost Estimate ──────────────────╮
│ Total (Estimated)  $500 - $800      │
│ Cost per User      $0.05 - $0.08    │
╰─────────────────────────────────────╯
```

## What It Calculates

### 1. Infrastructure Tier
Automatically determines the appropriate tier (Small, Medium, Large, Enterprise) based on concurrent users.

### 2. Pod Configuration
- Minimum and maximum pod counts for auto-scaling
- CPU and memory requests/limits per pod
- Separate calculations for backend and frontend

### 3. Node Requirements
- Instance type recommendation
- Minimum and maximum node counts
- Total cluster capacity (vCPU and memory)

### 4. Database Capacity
- DynamoDB billing mode recommendation
- Estimated Read Capacity Units (RCU)
- Estimated Write Capacity Units (WCU)
- Redis caching recommendation

### 5. Cost Estimates
- Monthly infrastructure costs (min-max range)
- Cost per user
- Breakdown by service

### 6. Performance Metrics
- Expected requests per second
- Expected latency range
- Capacity per pod

## Calculation Methodology

### Backend Pods
```
Base Pods = Concurrent Users ÷ 100
Min Pods = Base Pods × 1.3 (30% buffer)
Max Pods = Min Pods × 3 (for auto-scaling)
```

### Frontend Pods
```
Base Pods = Concurrent Users ÷ 500
Min Pods = Base Pods × 1.2 (20% buffer)
Max Pods = Min Pods × 2
```

### Nodes
```
Total CPU = (Backend Pods × CPU per Pod) + (Frontend Pods × CPU per Pod)
Total Memory = (Backend Pods × Memory per Pod) + (Frontend Pods × Memory per Pod)
Required Nodes = max(CPU-based, Memory-based)
Recommended Nodes = Required Nodes × 1.2 (20% buffer)
```

### DynamoDB Capacity
```
Read Operations/sec = Concurrent Users × 0.5
Write Operations/sec = Concurrent Users × 0.1
RCU = Read Operations ÷ 2 (for 4KB items)
WCU = Write Operations (for 1KB items)
```

## Use Cases

### 1. Initial Planning
Use the calculator before deployment to understand infrastructure requirements and costs.

```bash
python infrastructure_calculator.py --concurrent-users 500
```

### 2. Scaling Decisions
Determine when to scale up based on growing user base.

```bash
python infrastructure_calculator.py --concurrent-users 2000
```

### 3. Cost Estimation
Estimate costs for different user scenarios.

```bash
# Scenario 1: Small deployment
python infrastructure_calculator.py --concurrent-users 300

# Scenario 2: Medium deployment
python infrastructure_calculator.py --concurrent-users 1500

# Scenario 3: Large deployment
python infrastructure_calculator.py --concurrent-users 5000
```

### 4. Client Proposals
Generate infrastructure recommendations for client proposals.

```bash
python infrastructure_calculator.py --concurrent-users 1000 --total-users 10000
```

## Assumptions

The calculator is based on these assumptions:

- **Requests per user**: 3 requests/minute during active session
- **Backend capacity**: 100-200 concurrent users per pod
- **Frontend capacity**: 500-1000 concurrent connections per pod
- **Active ratio**: 10-20% of total users are concurrent during peak
- **Session duration**: 15-30 minutes average
- **Message rate**: 10-15 messages per session

## Customization

You can modify the calculator's assumptions by editing the constants in `infrastructure_calculator.py`:

```python
class InfrastructureCalculator:
    # Adjust these based on your application's characteristics
    REQUESTS_PER_USER_PER_MINUTE = 3
    REQUESTS_PER_BACKEND_POD = 50
    USERS_PER_BACKEND_POD = 100
    CONNECTIONS_PER_FRONTEND_POD = 500
```

## Integration with Deployment

The calculator's output can be used to configure your Kubernetes manifests:

```bash
# 1. Calculate requirements
python infrastructure_calculator.py --concurrent-users 1000 > sizing.txt

# 2. Use the output to update your Kubernetes configs
# - Update HPA min/max replicas
# - Update resource requests/limits
# - Update node group sizes

# 3. Deploy with recommended configuration
python deploy.py --environment prod --config sizing.txt
```

## Validation

After deployment, validate the calculator's recommendations:

```bash
# Monitor actual resource usage
kubectl top pods -n chat-app
kubectl top nodes

# Compare with calculator's recommendations
# Adjust if needed based on real-world usage
```

## Tips

1. **Start Conservative**: Use the minimum recommended configuration initially
2. **Enable Auto-Scaling**: Let Kubernetes handle spikes automatically
3. **Monitor for 2-4 Weeks**: Understand real usage patterns before optimizing
4. **Review Monthly**: Adjust based on actual metrics
5. **Load Test**: Validate capacity before production launch

## Troubleshooting

### Calculator shows higher costs than expected
- Consider using spot instances (60-90% savings)
- Review if you need all recommended resources
- Start with minimum configuration and scale up

### Recommended pods seem too high
- Calculator includes 30% buffer for spikes
- You can start with fewer pods and enable auto-scaling
- Monitor actual usage and adjust

### Node count seems excessive
- Calculator assumes 20% buffer for node failures
- You can start with fewer nodes
- Cluster autoscaler will add nodes as needed

## Support

For questions or issues:
1. Review [INFRASTRUCTURE_SIZING_GUIDE.md](INFRASTRUCTURE_SIZING_GUIDE.md)
2. Check [SIZING_QUICK_REFERENCE.md](SIZING_QUICK_REFERENCE.md)
3. Consult [PRODUCTION_DEPLOYMENT_PLAN.md](PRODUCTION_DEPLOYMENT_PLAN.md)

## Example Scenarios

### Scenario 1: Startup MVP
```bash
$ python infrastructure_calculator.py --concurrent-users 100

Result: Small Tier
- 3-6 backend pods
- 2-4 frontend pods
- 2-4 t3.medium nodes
- Cost: $200-300/month
```

### Scenario 2: Growing SaaS
```bash
$ python infrastructure_calculator.py --concurrent-users 1500

Result: Medium Tier
- 20-60 backend pods
- 4-8 frontend pods
- 10-20 t3.large nodes
- Cost: $500-800/month
```

### Scenario 3: Enterprise Deployment
```bash
$ python infrastructure_calculator.py --concurrent-users 8000

Result: Large Tier
- 104-312 backend pods
- 20-40 frontend pods
- 50-100 c5.xlarge nodes
- Cost: $1,500-3,000/month
```

---

**Ready to calculate your infrastructure needs?**

```bash
python infrastructure_calculator.py --interactive
```

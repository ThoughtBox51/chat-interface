# Node Control - Quick Reference

## TL;DR: Yes, You Can Turn Nodes On/Off! 💡

Save 70-80% on dev/staging costs by turning nodes off when not in use.

---

## Quick Commands

### Turn Nodes OFF
```bash
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=0,maxSize=0,desiredSize=0
```

### Turn Nodes ON
```bash
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=2,maxSize=10,desiredSize=3
```

### Check Status
```bash
kubectl get nodes
```

---

## Cost Savings Examples

### Dev Environment (Off Nights & Weekends)
```
Without scheduling: $91/month
With scheduling:    $22/month
Savings:            $69/month (76%)
```

### Staging Environment (Business Hours Only)
```
Without scheduling: $304/month
With scheduling:    $90/month
Savings:            $214/month (70%)
```

### Production (Scale Down at Night)
```
Without scaling:    $1,241/month
With night scaling: $807/month
Savings:            $434/month (35%)
```

---

## Automated Scheduling

### Option 1: Simple Bash Script

```bash
#!/bin/bash
# save as: node-control.sh

case "$1" in
  on)
    aws eks update-nodegroup-config \
      --cluster-name chat-app-cluster \
      --nodegroup-name chat-app-nodes \
      --scaling-config minSize=2,maxSize=10,desiredSize=3
    ;;
  off)
    aws eks update-nodegroup-config \
      --cluster-name chat-app-cluster \
      --nodegroup-name chat-app-nodes \
      --scaling-config minSize=0,maxSize=0,desiredSize=0
    ;;
esac
```

**Usage:**
```bash
./node-control.sh off  # Turn off
./node-control.sh on   # Turn on
```

### Option 2: Cron Schedule

```bash
# Edit crontab
crontab -e

# Add these lines:
0 18 * * 1-5 /path/to/node-control.sh off  # 6 PM weekdays
0 8 * * 1-5 /path/to/node-control.sh on    # 8 AM weekdays
```

---

## Common Schedules

```
Business Hours Only (Mon-Fri 8am-6pm):
  Scale down: 0 18 * * 1-5
  Scale up:   0 8 * * 1-5
  Savings: 70-80%

Extended Hours (Mon-Fri 7am-8pm):
  Scale down: 0 20 * * 1-5
  Scale up:   0 7 * * 1-5
  Savings: 60-70%

Weekend Off (Fri 6pm - Mon 8am):
  Scale down: 0 18 * * 5
  Scale up:   0 8 * * 1
  Savings: 30-40%

Night Reduction (10pm-6am):
  Scale down: 0 22 * * *
  Scale up:   0 6 * * *
  Savings: 20-30%
```

---

## Recommended Strategies

### Development Environment
```yaml
Schedule: Business hours only
Weekends: OFF
Nights: OFF
Savings: 70-80%

Configuration:
  Business: 2-5 nodes
  Off-hours: 0 nodes
```

### Staging Environment
```yaml
Schedule: Extended hours
Weekends: 1 node (monitoring)
Nights: 1 node (minimal)
Savings: 40-60%

Configuration:
  Business: 2-8 nodes
  Off-hours: 1 node
  Weekend: 1 node
```

### Production Environment
```yaml
Schedule: 24/7 with night reduction
Weekends: Reduced capacity
Nights: 50% of peak
Savings: 20-40%

Configuration:
  Peak: 5-20 nodes
  Off-peak: 3-10 nodes
  Weekend: 3-15 nodes
```

---

## Safety Checklist

Before turning nodes off:

- [ ] Drain nodes gracefully
- [ ] Check for critical pods
- [ ] Verify pod disruption budgets
- [ ] Notify team
- [ ] Set up monitoring alerts

```bash
# Graceful drain
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --grace-period=300
```

---

## Troubleshooting

### Pods Stuck Pending After Scale Up
```bash
# Check nodes
kubectl get nodes

# Check pods
kubectl get pods --all-namespaces | grep Pending

# Describe pod
kubectl describe pod <pod-name>

# Force reschedule
kubectl delete pod <pod-name>
```

### Nodes Won't Drain
```bash
# Force drain
kubectl drain <node-name> --force --grace-period=0
```

### Scaling Takes Too Long
- Use launch templates
- Enable faster instance types
- Consider Karpenter for sub-minute scaling

---

## Advanced: Karpenter (Auto Scale to Zero)

Automatically removes nodes when empty:

```yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  ttlSecondsAfterEmpty: 30  # Remove after 30s empty
  ttlSecondsUntilExpired: 604800  # Remove after 7 days
```

**Benefits:**
- Automatic scale to zero
- Fast scale up (< 1 minute)
- Cost-optimized instance selection

---

## Quick Decision Guide

**Should I turn nodes off?**

| Environment | Turn Off? | When? | Savings |
|-------------|-----------|-------|---------|
| **Dev** | ✅ Yes | Nights & weekends | 70-80% |
| **Staging** | ✅ Yes | Off-hours | 40-60% |
| **Production** | ⚠️ Reduce | Night/weekend | 20-40% |
| **Demo** | ✅ Yes | When not demoing | 90%+ |

---

## Real-World Example

**Scenario:** 3 environments, 5 nodes each

```
Without Node Management:
  Dev:     $150/month
  Staging: $150/month
  Prod:    $150/month
  Total:   $450/month

With Node Management:
  Dev:     $30/month (off nights/weekends)
  Staging: $60/month (reduced off-hours)
  Prod:    $120/month (reduced at night)
  Total:   $210/month

Annual Savings: $2,880/year
```

---

## Next Steps

1. **Identify environments** that can be turned off
2. **Choose schedule** (business hours, nights, weekends)
3. **Set up automation** (cron, Lambda, Karpenter)
4. **Monitor savings** in AWS Cost Explorer
5. **Adjust as needed** based on usage patterns

---

## Resources

- Full Guide: [NODE_MANAGEMENT_GUIDE.md](NODE_MANAGEMENT_GUIDE.md)
- AWS CLI Docs: https://docs.aws.amazon.com/cli/latest/reference/eks/
- Karpenter: https://karpenter.sh/

---

**Bottom Line:** Turning nodes off when not in use can save 40-80% on infrastructure costs with minimal effort.

**Start with dev/staging environments for maximum savings with zero risk!**

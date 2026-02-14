# Infrastructure Sizing - Quick Reference

## 📊 At-a-Glance Sizing Chart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE SIZING TIERS                           │
└─────────────────────────────────────────────────────────────────────────────┘

🟢 TIER 1: SMALL (0-500 Concurrent Users)
├─ Total Users: 0-5,000
├─ Requests/sec: 0-100
├─ Backend Pods: 3-6 (t3.medium nodes)
├─ Frontend Pods: 2-4
├─ Nodes: 2-4 x t3.medium (2 vCPU, 4GB)
├─ DynamoDB: On-Demand ($10-30/mo)
└─ 💰 Cost: $200-300/month

🟡 TIER 2: MEDIUM (500-2,000 Concurrent Users)
├─ Total Users: 5,000-20,000
├─ Requests/sec: 100-400
├─ Backend Pods: 5-15 (t3.large nodes)
├─ Frontend Pods: 3-8
├─ Nodes: 4-12 x t3.large (2 vCPU, 8GB)
├─ DynamoDB: On-Demand ($50-150/mo)
├─ Redis: cache.t3.small ($15-30/mo)
└─ 💰 Cost: $500-800/month

🟠 TIER 3: LARGE (2,000-10,000 Concurrent Users)
├─ Total Users: 20,000-100,000
├─ Requests/sec: 400-2,000
├─ Backend Pods: 10-50 (c5.xlarge nodes)
├─ Frontend Pods: 5-15
├─ Nodes: 8-28 x c5.xlarge (4 vCPU, 8GB)
├─ DynamoDB: On-Demand ($200-800/mo)
├─ Redis: cache.r6g.large cluster ($150-200/mo)
├─ CloudFront: $100-300/mo
└─ 💰 Cost: $1,500-3,000/month

🔴 TIER 4: ENTERPRISE (10,000+ Concurrent Users)
├─ Total Users: 100,000+
├─ Requests/sec: 2,000+
├─ Backend Pods: 20-100 (c5.2xlarge nodes)
├─ Frontend Pods: 10-30
├─ Nodes: 15-55 x c5.2xlarge (8 vCPU, 16GB)
├─ DynamoDB: Global Tables ($1,000-3,000/mo)
├─ Redis: cache.r6g.xlarge cluster ($500-800/mo)
├─ CloudFront: $500-1,500/mo
├─ Multi-Region: Yes
└─ 💰 Cost: $6,000-12,000+/month
```

---

## 🎯 Quick Decision Matrix

### Choose Your Tier Based On:

| Your Situation | Recommended Tier | Starting Config |
|----------------|------------------|-----------------|
| MVP/Pilot (< 100 users) | 🟢 Small | 3 backend, 2 frontend, 2 nodes |
| Small Business (100-500 users) | 🟢 Small | 4 backend, 2 frontend, 3 nodes |
| Growing Startup (500-2K users) | 🟡 Medium | 5 backend, 3 frontend, 4 nodes |
| Mid-Size Company (2K-5K users) | 🟡 Medium | 10 backend, 5 frontend, 8 nodes |
| Large Company (5K-10K users) | 🟠 Large | 15 backend, 8 frontend, 12 nodes |
| Enterprise (10K+ users) | 🔴 Enterprise | 20 backend, 10 frontend, 15 nodes |

---

## 📐 Capacity Planning Formulas

### Backend Pods Needed
```
Concurrent Users ÷ 100 = Minimum Backend Pods
Then multiply by 1.3 for buffer
Then multiply by 3 for max auto-scale

Example: 1,000 users
  Min: (1000 ÷ 100) × 1.3 = 13 pods
  Max: 13 × 3 = 39 pods
```

### Nodes Needed
```
(Backend Pods × 0.5 CPU) + (Frontend Pods × 0.2 CPU) = Total CPU
Total CPU ÷ Node CPU Capacity = Nodes Needed
Add 20% buffer

Example: 10 backend, 5 frontend, t3.large nodes (1.8 usable CPU)
  Total: (10 × 0.5) + (5 × 0.2) = 6 CPU
  Nodes: 6 ÷ 1.8 = 3.3 → 4 nodes
  With buffer: 4 × 1.2 = 5 nodes
```

### DynamoDB Capacity
```
Read Operations/sec = Concurrent Users × 0.5
Write Operations/sec = Concurrent Users × 0.1

Example: 1,000 users
  Reads: 1000 × 0.5 = 500/sec = 250 RCU
  Writes: 1000 × 0.1 = 100/sec = 100 WCU
  
Recommendation: Use On-Demand for variable load
```

---

## 🚀 Performance Benchmarks

### Single Backend Pod Can Handle:
- **100-200 concurrent users**
- **50-100 requests/second** (with database)
- **500-1000 requests/second** (cached)
- **Average latency: 50-200ms**

### Single Frontend Pod Can Handle:
- **500-1,000 concurrent connections**
- **1,000-2,000 requests/second**
- **Average latency: 5-20ms**

### DynamoDB Performance:
- **Latency: Single-digit milliseconds**
- **On-Demand: Auto-scales to any load**
- **No capacity planning needed**

---

## 💡 Resource Allocation Guide

### Backend Pod Resources

| Tier | CPU Request | CPU Limit | Memory Request | Memory Limit |
|------|-------------|-----------|----------------|--------------|
| Small | 250m | 500m | 256Mi | 512Mi |
| Medium | 500m | 1000m | 512Mi | 1Gi |
| Large | 1000m | 2000m | 1Gi | 2Gi |
| Enterprise | 2000m | 4000m | 2Gi | 4Gi |

### Frontend Pod Resources

| Tier | CPU Request | CPU Limit | Memory Request | Memory Limit |
|------|-------------|-----------|----------------|--------------|
| Small | 100m | 200m | 128Mi | 256Mi |
| Medium | 200m | 400m | 256Mi | 512Mi |
| Large | 500m | 1000m | 512Mi | 1Gi |
| Enterprise | 1000m | 2000m | 1Gi | 2Gi |

---

## 🎚️ Auto-Scaling Thresholds

### When to Scale Up (Add Pods)
- ✅ CPU > 70% for 2 minutes
- ✅ Memory > 80% for 2 minutes
- ✅ Requests/pod > 50/sec for 1 minute
- ✅ Response time > 500ms (p95)

### When to Scale Down (Remove Pods)
- ✅ CPU < 40% for 10 minutes
- ✅ Memory < 50% for 10 minutes
- ✅ Requests/pod < 20/sec for 10 minutes

### Scale Up/Down Behavior
```yaml
Scale Up:
  - Immediate (0 sec stabilization)
  - Add 100% (double) or 4 pods (whichever is more)
  - Check every 15 seconds

Scale Down:
  - Wait 5 minutes (stabilization)
  - Remove max 50% of pods
  - Check every 60 seconds
```

---

## 💰 Cost Breakdown by Tier

### 🟢 Small ($200-300/month)
```
EKS Cluster:        $73
EC2 (2-4 nodes):    $60-120
DynamoDB:           $10-30
ALB:                $20
NAT Gateway:        $35
Other:              $20
```

### 🟡 Medium ($500-800/month)
```
EKS Cluster:        $73
EC2 (4-12 nodes):   $200-400
DynamoDB:           $50-150
Redis:              $15-30
ALB:                $20
NAT Gateway:        $100
CloudWatch:         $30
Other:              $50
```

### 🟠 Large ($1,500-3,000/month)
```
EKS Cluster:        $73
EC2 (8-28 nodes):   $800-1,500
DynamoDB:           $200-800
Redis Cluster:      $150-200
ALB:                $50
NAT Gateway:        $100
CloudFront:         $100-300
CloudWatch:         $50
Other:              $100
```

### 🔴 Enterprise ($6,000-12,000+/month)
```
EKS Clusters (multi-region): $146
EC2 (15-55 nodes):           $3,000-6,000
DynamoDB Global:             $1,000-3,000
Redis Cluster:               $500-800
ALB (multi-region):          $100
NAT Gateway:                 $200
CloudFront:                  $500-1,500
CloudWatch:                  $200
WAF:                         $100
Other:                       $500
```

---

## 🎯 Optimization Tips

### Cost Savings (Without Sacrificing Performance)

1. **Use Spot Instances (60-90% savings)**
   - Mix: 30% on-demand, 70% spot
   - Diversify instance types
   - Use for non-critical workloads

2. **Right-Size Pods (20-30% savings)**
   - Monitor actual usage
   - Adjust requests/limits
   - Use Vertical Pod Autoscaler

3. **Implement Caching (50-70% DB cost reduction)**
   - Redis for sessions
   - API response caching
   - Rate limiting

4. **Use Reserved Instances (30-40% savings)**
   - After 3-6 months of stable usage
   - 1-year or 3-year commitment
   - For baseline capacity

5. **CloudFront CDN (80-90% origin reduction)**
   - Cache static assets
   - Reduce backend load
   - Improve global latency

---

## 📈 Scaling Triggers

### When to Move to Next Tier

**Small → Medium:**
- Consistently > 400 concurrent users
- Pods at max replicas frequently
- CPU > 70% sustained
- Response time degrading

**Medium → Large:**
- Consistently > 1,500 concurrent users
- Need more than 15 backend pods
- Database becoming bottleneck
- Need caching layer

**Large → Enterprise:**
- Consistently > 8,000 concurrent users
- Need multi-region for DR
- Global user base
- SLA requirements < 99.9%

---

## 🔍 Monitoring Checklist

### Essential Metrics to Track

**Application:**
- [ ] Requests per second
- [ ] Response time (p50, p95, p99)
- [ ] Error rate
- [ ] Active users
- [ ] Queue depth

**Infrastructure:**
- [ ] Pod CPU/memory utilization
- [ ] Node CPU/memory utilization
- [ ] Pod count (current/min/max)
- [ ] Pending pods
- [ ] Pod restarts

**Database:**
- [ ] DynamoDB read/write capacity
- [ ] Throttled requests
- [ ] Query latency
- [ ] Item count

**Cost:**
- [ ] Daily spend by service
- [ ] Cost per user
- [ ] Spot instance savings
- [ ] Reserved instance utilization

---

## 🚨 Alert Thresholds

### Critical (Page Immediately)
```
❌ Error rate > 5% for 5 min
❌ All pods down
❌ Database unavailable
❌ P95 latency > 2 sec for 5 min
❌ Pod crash loop (3+ restarts)
```

### Warning (Email/Slack)
```
⚠️ CPU > 80% for 10 min
⚠️ Memory > 85% for 10 min
⚠️ Error rate > 1% for 10 min
⚠️ P95 latency > 1 sec for 10 min
⚠️ Pods at max replicas
⚠️ DynamoDB throttling
```

---

## 📞 Quick Start Recommendations

### For New Deployments:
1. **Start with Tier 1 (Small)** - Even if you expect growth
2. **Enable auto-scaling** - Let it handle spikes
3. **Monitor for 2-4 weeks** - Understand real usage
4. **Scale based on data** - Not assumptions
5. **Review monthly** - Optimize continuously

### For Existing Applications:
1. **Analyze current metrics** - CPU, memory, requests/sec
2. **Calculate actual capacity** - Users per pod
3. **Choose appropriate tier** - Based on data
4. **Plan migration** - Gradual rollout
5. **Load test** - Before full production

---

## 🎓 Example Scenarios

### Scenario 1: Small SaaS Startup
```
Expected: 200 concurrent users, 2,000 total
Recommendation: Tier 1 (Small)
Config: 3 backend, 2 frontend, 2 t3.medium nodes
Cost: ~$250/month
Growth path: Monitor, scale to Medium when > 400 concurrent
```

### Scenario 2: Mid-Size Company Internal Tool
```
Expected: 1,000 concurrent users, 10,000 total
Recommendation: Tier 2 (Medium)
Config: 8 backend, 4 frontend, 6 t3.large nodes
Cost: ~$650/month
Growth path: Add Redis caching, scale to Large if needed
```

### Scenario 3: Enterprise Customer Portal
```
Expected: 5,000 concurrent users, 50,000 total
Recommendation: Tier 3 (Large)
Config: 20 backend, 8 frontend, 15 c5.xlarge nodes
Cost: ~$2,200/month
Growth path: Multi-region if global, Enterprise tier if > 8K concurrent
```

---

**Need help sizing for your specific use case?**

Provide:
- Expected concurrent users
- Total registered users
- Geographic distribution
- Budget constraints
- SLA requirements

And I'll give you a custom recommendation!

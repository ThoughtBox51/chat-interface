# Infrastructure Sizing Guide - User-Based Recommendations

## Overview

This guide provides infrastructure sizing recommendations based on the number of concurrent and total users for the LLM Chat Application.

## Key Assumptions

### Application Characteristics
- **Backend**: FastAPI (async, lightweight)
  - ~50-100 MB memory per pod
  - ~0.1-0.2 CPU cores per pod under normal load
  - Can handle ~100-200 concurrent requests per pod

- **Frontend**: Nginx serving static React app
  - ~20-30 MB memory per pod
  - ~0.05-0.1 CPU cores per pod
  - Can handle ~500-1000 concurrent connections per pod

### User Behavior Patterns
- **Concurrent users**: Users actively using the app at the same time
- **Total users**: Total registered users in the system
- **Active ratio**: ~10-20% of total users are concurrent during peak hours
- **Request rate**: ~2-5 requests per minute per active user
- **Chat session**: Average 10-15 messages per session
- **Session duration**: 15-30 minutes average

---

## Sizing Tiers

### 🟢 Tier 1: Small Deployment (0-500 Concurrent Users)

**Target Profile:**
- Total Users: 0-5,000
- Concurrent Users: 0-500
- Requests/sec: 0-100
- Use Case: Small business, pilot, MVP

#### Pod Configuration

**Backend Pods:**
```yaml
Replicas: 3 (minimum for HA)
Resources per pod:
  requests:
    memory: 256Mi
    cpu: 250m (0.25 cores)
  limits:
    memory: 512Mi
    cpu: 500m (0.5 cores)

Auto-scaling:
  minReplicas: 3
  maxReplicas: 6
  targetCPU: 70%
  targetMemory: 80%
```

**Frontend Pods:**
```yaml
Replicas: 2
Resources per pod:
  requests:
    memory: 128Mi
    cpu: 100m (0.1 cores)
  limits:
    memory: 256Mi
    cpu: 200m (0.2 cores)

Auto-scaling:
  minReplicas: 2
  maxReplicas: 4
  targetCPU: 70%
```

#### Node Configuration

**EKS Node Group:**
```yaml
Instance Type: t3.medium (2 vCPU, 4 GB RAM)
Node Count:
  Minimum: 2
  Maximum: 4
  Desired: 2

Total Cluster Capacity:
  vCPU: 4-8 cores
  Memory: 8-16 GB
  
Cost: ~$60-120/month (on-demand)
      ~$20-40/month (spot instances)
```

#### DynamoDB Configuration
```yaml
Billing Mode: On-Demand (pay per request)
Expected Costs: $10-30/month

Alternative (Provisioned):
  Read Capacity: 25 RCU
  Write Capacity: 10 WCU
  Auto-scaling: Enabled (25-100 RCU, 10-50 WCU)
  Cost: ~$15-25/month
```

**Total Monthly Cost: $200-300**

---

### 🟡 Tier 2: Medium Deployment (500-2,000 Concurrent Users)

**Target Profile:**
- Total Users: 5,000-20,000
- Concurrent Users: 500-2,000
- Requests/sec: 100-400
- Use Case: Growing startup, mid-size company

#### Pod Configuration

**Backend Pods:**
```yaml
Replicas: 5
Resources per pod:
  requests:
    memory: 512Mi
    cpu: 500m (0.5 cores)
  limits:
    memory: 1Gi
    cpu: 1000m (1 core)

Auto-scaling:
  minReplicas: 5
  maxReplicas: 15
  targetCPU: 70%
  targetMemory: 80%
  
Estimated capacity:
  - 5 pods = 500-1,000 concurrent users
  - 15 pods = 1,500-3,000 concurrent users
```

**Frontend Pods:**
```yaml
Replicas: 3
Resources per pod:
  requests:
    memory: 256Mi
    cpu: 200m (0.2 cores)
  limits:
    memory: 512Mi
    cpu: 400m (0.4 cores)

Auto-scaling:
  minReplicas: 3
  maxReplicas: 8
  targetCPU: 70%
```

#### Node Configuration

**EKS Node Group (Mixed):**

**On-Demand Nodes (for stability):**
```yaml
Instance Type: t3.large (2 vCPU, 8 GB RAM)
Node Count:
  Minimum: 2
  Maximum: 4
  Desired: 3
```

**Spot Nodes (for cost savings):**
```yaml
Instance Types: t3.large, t3a.large (diversified)
Node Count:
  Minimum: 2
  Maximum: 8
  Desired: 3
  
Total Cluster Capacity:
  vCPU: 8-24 cores
  Memory: 32-96 GB
  
Cost: ~$200-400/month (mixed on-demand + spot)
```

#### DynamoDB Configuration
```yaml
Billing Mode: On-Demand (recommended)
Expected Costs: $50-150/month

Alternative (Provisioned with auto-scaling):
  Read Capacity: 100-500 RCU (auto-scaled)
  Write Capacity: 50-200 WCU (auto-scaled)
  Cost: ~$80-120/month
```

#### Caching Layer (Recommended)
```yaml
ElastiCache Redis:
  Instance: cache.t3.micro or cache.t3.small
  Purpose: Session caching, rate limiting
  Cost: ~$15-30/month
```

**Total Monthly Cost: $500-800**

---

### 🟠 Tier 3: Large Deployment (2,000-10,000 Concurrent Users)

**Target Profile:**
- Total Users: 20,000-100,000
- Concurrent Users: 2,000-10,000
- Requests/sec: 400-2,000
- Use Case: Enterprise, large SaaS

#### Pod Configuration

**Backend Pods:**
```yaml
Replicas: 10
Resources per pod:
  requests:
    memory: 1Gi
    cpu: 1000m (1 core)
  limits:
    memory: 2Gi
    cpu: 2000m (2 cores)

Auto-scaling:
  minReplicas: 10
  maxReplicas: 50
  targetCPU: 70%
  targetMemory: 80%
  
Metrics-based scaling:
  - CPU utilization
  - Memory utilization
  - Custom: requests per second
  - Custom: active connections
  
Estimated capacity:
  - 10 pods = 1,000-2,000 concurrent users
  - 50 pods = 5,000-10,000 concurrent users
```

**Frontend Pods:**
```yaml
Replicas: 5
Resources per pod:
  requests:
    memory: 512Mi
    cpu: 500m (0.5 cores)
  limits:
    memory: 1Gi
    cpu: 1000m (1 core)

Auto-scaling:
  minReplicas: 5
  maxReplicas: 15
  targetCPU: 70%
```

#### Node Configuration

**EKS Node Groups (Multi-tier):**

**Critical Workloads (On-Demand):**
```yaml
Instance Type: c5.xlarge (4 vCPU, 8 GB RAM)
Node Count:
  Minimum: 3
  Maximum: 8
  Desired: 4
  
Node Labels:
  workload-type: critical
  
Taints:
  - key: critical
    value: "true"
    effect: NoSchedule
```

**General Workloads (Spot - 70% cost savings):**
```yaml
Instance Types: c5.xlarge, c5a.xlarge, c5n.xlarge (diversified)
Node Count:
  Minimum: 5
  Maximum: 20
  Desired: 8
  
Node Labels:
  workload-type: general
  
Total Cluster Capacity:
  vCPU: 32-112 cores
  Memory: 64-224 GB
  
Cost: ~$800-1,500/month (mixed strategy)
```

#### DynamoDB Configuration
```yaml
Billing Mode: On-Demand (recommended for variable load)
Expected Costs: $200-800/month

With Reserved Capacity (if predictable):
  Base Provisioned: 500 RCU, 200 WCU
  Auto-scaling: Up to 2000 RCU, 800 WCU
  Reserved Capacity Savings: ~30-40%
  Cost: ~$300-600/month
```

#### Caching Layer (Required)
```yaml
ElastiCache Redis Cluster:
  Instance: cache.r6g.large (2 nodes for HA)
  Purpose: 
    - Session management
    - Rate limiting
    - API response caching
    - Real-time user presence
  Cost: ~$150-200/month
```

#### CDN (CloudFront)
```yaml
Purpose: Static assets, API caching
Data Transfer: 1-5 TB/month
Cost: ~$100-300/month
```

**Total Monthly Cost: $1,500-3,000**

---

### 🔴 Tier 4: Enterprise Deployment (10,000+ Concurrent Users)

**Target Profile:**
- Total Users: 100,000+
- Concurrent Users: 10,000+
- Requests/sec: 2,000+
- Use Case: Large enterprise, high-traffic SaaS

#### Pod Configuration

**Backend Pods:**
```yaml
Replicas: 20
Resources per pod:
  requests:
    memory: 2Gi
    cpu: 2000m (2 cores)
  limits:
    memory: 4Gi
    cpu: 4000m (4 cores)

Auto-scaling:
  minReplicas: 20
  maxReplicas: 100
  Metrics:
    - CPU: 70%
    - Memory: 80%
    - Custom: requests/sec per pod
    - Custom: response time p95
  
Estimated capacity:
  - 20 pods = 2,000-4,000 concurrent users
  - 100 pods = 10,000-20,000 concurrent users
```

**Frontend Pods:**
```yaml
Replicas: 10
Resources per pod:
  requests:
    memory: 1Gi
    cpu: 1000m (1 core)
  limits:
    memory: 2Gi
    cpu: 2000m (2 cores)

Auto-scaling:
  minReplicas: 10
  maxReplicas: 30
```

#### Node Configuration

**Multi-Region EKS Clusters:**

**Primary Region:**
```yaml
Critical Node Group (On-Demand):
  Instance Type: c5.2xlarge (8 vCPU, 16 GB RAM)
  Node Count: 5-15
  
General Node Group (Spot):
  Instance Types: c5.2xlarge, c5a.2xlarge, c5n.2xlarge
  Node Count: 10-40
  
Total Capacity:
  vCPU: 120-440 cores
  Memory: 240-880 GB
```

**Secondary Region (DR/Failover):**
```yaml
Standby capacity: 30% of primary
Auto-scales on failover
```

**Cost: ~$3,000-6,000/month**

#### Database Configuration

**DynamoDB Global Tables:**
```yaml
Primary Region: On-Demand
Replica Regions: 1-2 (for DR)
Expected Costs: $1,000-3,000/month

Optimization:
  - DynamoDB Accelerator (DAX) for caching
  - Cost: ~$300-500/month
```

#### Caching & Message Queue

**ElastiCache Redis Cluster:**
```yaml
Instance: cache.r6g.xlarge (3+ nodes, clustered)
Cost: ~$500-800/month
```

**Amazon MQ or SQS (for async processing):**
```yaml
Purpose: Background jobs, notifications
Cost: ~$100-200/month
```

#### Load Balancing & CDN

**Application Load Balancer:**
```yaml
Multi-AZ: Yes
LCU Hours: High
Cost: ~$100-200/month
```

**CloudFront:**
```yaml
Data Transfer: 10-50 TB/month
Cost: ~$500-1,500/month
```

**Total Monthly Cost: $6,000-12,000+**

---

## Quick Reference Table

| Tier | Concurrent Users | Total Users | Backend Pods | Frontend Pods | Node Type | Monthly Cost |
|------|-----------------|-------------|--------------|---------------|-----------|--------------|
| **Small** | 0-500 | 0-5K | 3-6 | 2-4 | t3.medium x2-4 | $200-300 |
| **Medium** | 500-2K | 5K-20K | 5-15 | 3-8 | t3.large x4-12 | $500-800 |
| **Large** | 2K-10K | 20K-100K | 10-50 | 5-15 | c5.xlarge x8-28 | $1,500-3,000 |
| **Enterprise** | 10K+ | 100K+ | 20-100 | 10-30 | c5.2xlarge x15-55 | $6,000-12,000+ |

---

## Capacity Planning Formula

### Backend Capacity Calculation

```python
# Assumptions
requests_per_user_per_minute = 3
requests_per_pod_per_second = 50  # Conservative estimate

# Calculate required pods
concurrent_users = 1000
requests_per_second = (concurrent_users * requests_per_user_per_minute) / 60
required_pods = requests_per_second / requests_per_pod_per_second

# Add 30% buffer for spikes
recommended_min_pods = math.ceil(required_pods * 1.3)
recommended_max_pods = recommended_min_pods * 3  # For auto-scaling

print(f"Minimum pods: {recommended_min_pods}")
print(f"Maximum pods: {recommended_max_pods}")
```

### Node Capacity Calculation

```python
# Pod resource requirements
backend_pod_cpu = 0.5  # cores
backend_pod_memory = 512  # MB
num_backend_pods = 10

frontend_pod_cpu = 0.2  # cores
frontend_pod_memory = 256  # MB
num_frontend_pods = 5

# Total requirements
total_cpu = (backend_pod_cpu * num_backend_pods) + (frontend_pod_cpu * num_frontend_pods)
total_memory = (backend_pod_memory * num_backend_pods) + (frontend_pod_memory * num_frontend_pods)

# Node capacity (t3.large: 2 vCPU, 8GB RAM)
# Usable: ~1.8 vCPU, ~6.5GB RAM (after system pods)
node_usable_cpu = 1.8
node_usable_memory = 6500  # MB

# Calculate required nodes
required_nodes_cpu = math.ceil(total_cpu / node_usable_cpu)
required_nodes_memory = math.ceil(total_memory / node_usable_memory)
required_nodes = max(required_nodes_cpu, required_nodes_memory)

# Add buffer
recommended_nodes = math.ceil(required_nodes * 1.2)

print(f"Required nodes: {recommended_nodes}")
```

---

## Performance Benchmarks

### Backend (FastAPI)

**Single Pod Performance:**
- Instance: 1 vCPU, 1GB RAM
- Concurrent connections: 100-200
- Requests/sec: 50-100 (with DB calls)
- Requests/sec: 500-1000 (cached responses)
- Average latency: 50-200ms
- P95 latency: 200-500ms

**Scaling Characteristics:**
- Linear scaling up to 50 pods
- Diminishing returns after 50 pods (database becomes bottleneck)
- Recommendation: Add caching layer beyond 50 pods

### Frontend (Nginx)

**Single Pod Performance:**
- Instance: 0.1 vCPU, 256MB RAM
- Concurrent connections: 500-1000
- Requests/sec: 1000-2000 (static assets)
- Average latency: 5-20ms

**Scaling Characteristics:**
- Rarely the bottleneck
- Use CloudFront CDN for static assets
- 2-3 pods sufficient for most workloads

### DynamoDB

**Performance Characteristics:**
- On-Demand: Auto-scales to any load
- Provisioned: 1 RCU = 2 eventually consistent reads/sec (4KB)
- Provisioned: 1 WCU = 1 write/sec (1KB)
- Latency: Single-digit milliseconds

**Capacity Planning:**
```
Read Operations/sec = Concurrent Users × 0.5 (average)
Write Operations/sec = Concurrent Users × 0.1 (average)

For 1000 concurrent users:
- Reads: 500/sec = 250 RCU (with 4KB items)
- Writes: 100/sec = 100 WCU (with 1KB items)
```

---

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

**Backend HPA:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: chat-backend
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min cooldown
      policies:
      - type: Percent
        value: 50  # Scale down max 50% at a time
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100  # Double pods if needed
        periodSeconds: 15
      - type: Pods
        value: 4  # Or add 4 pods
        periodSeconds: 15
      selectPolicy: Max  # Use the policy that scales faster
```

### Cluster Autoscaler

**Node Auto-Scaling:**
```yaml
# Automatically adds/removes nodes based on pod scheduling
# Scales up: When pods are pending due to insufficient resources
# Scales down: When nodes are underutilized (<50%) for 10+ minutes

Configuration:
  scale-down-delay-after-add: 10m
  scale-down-unneeded-time: 10m
  scale-down-utilization-threshold: 0.5
  max-node-provision-time: 15m
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

**Application Metrics:**
- Requests per second
- Response time (p50, p95, p99)
- Error rate
- Active connections
- Queue depth

**Infrastructure Metrics:**
- Pod CPU/memory utilization
- Node CPU/memory utilization
- Pod restart count
- Pending pods
- DynamoDB throttling events

### Recommended Alerts

**Critical (Page immediately):**
```yaml
- Error rate > 5% for 5 minutes
- P95 latency > 2 seconds for 5 minutes
- Pod crash loop (3+ restarts in 10 min)
- All pods down
- Database unavailable
```

**Warning (Email/Slack):**
```yaml
- CPU utilization > 80% for 10 minutes
- Memory utilization > 85% for 10 minutes
- Error rate > 1% for 10 minutes
- P95 latency > 1 second for 10 minutes
- Pods at max replicas (need to increase limit)
```

---

## Cost Optimization Tips

### 1. Use Spot Instances (60-90% savings)
```yaml
# For non-critical workloads
# Mix: 30% on-demand, 70% spot
# Diversify instance types for availability
```

### 2. Right-Size Pods
```yaml
# Start conservative, monitor, adjust
# Use Vertical Pod Autoscaler (VPA) for recommendations
# Review resource usage monthly
```

### 3. Implement Caching
```yaml
# Redis for:
#   - Session data
#   - API responses
#   - Rate limiting
# Can reduce database costs by 50-70%
```

### 4. Use Reserved Instances (30-40% savings)
```yaml
# For predictable baseline capacity
# 1-year or 3-year commitment
# Recommended after 3-6 months of stable usage
```

### 5. Optimize DynamoDB
```yaml
# Use on-demand for variable workloads
# Use provisioned + auto-scaling for predictable workloads
# Enable TTL for temporary data
# Use DynamoDB Accelerator (DAX) for read-heavy workloads
```

### 6. CloudFront Caching
```yaml
# Cache static assets at edge
# Reduces origin requests by 80-90%
# Improves latency for global users
```

---

## Migration Path (Scaling Up)

### From Small to Medium
```
1. Increase pod replicas (3→5 backend, 2→3 frontend)
2. Add more nodes (2→4)
3. Enable auto-scaling
4. Add Redis caching layer
5. Monitor for 1 week
6. Adjust based on metrics
```

### From Medium to Large
```
1. Upgrade node instance types (t3.large → c5.xlarge)
2. Increase pod resources (0.5→1 CPU per pod)
3. Increase max replicas (15→50)
4. Add spot instance node group
5. Implement advanced monitoring
6. Add CloudFront CDN
7. Consider multi-region setup
```

### From Large to Enterprise
```
1. Multi-region deployment
2. Global DynamoDB tables
3. Advanced caching strategies
4. Dedicated node groups for workload types
5. Service mesh (Istio) for traffic management
6. Advanced observability (distributed tracing)
7. Chaos engineering for resilience testing
```

---

## Summary Recommendations

### Start Small, Scale Smart
1. **Begin with Tier 1** (Small) even if you expect growth
2. **Monitor real usage** for 2-4 weeks
3. **Scale based on data**, not assumptions
4. **Use auto-scaling** to handle spikes
5. **Review monthly** and adjust

### Key Success Factors
- ✅ Proper monitoring from day 1
- ✅ Auto-scaling configured correctly
- ✅ Load testing before production
- ✅ Gradual rollout (10% → 50% → 100%)
- ✅ Regular capacity reviews

### When to Scale Up
- CPU consistently > 70%
- Memory consistently > 80%
- Response time degrading
- Error rate increasing
- Pods hitting max replicas frequently

**Questions? Need help sizing for your specific use case? Let me know your expected user count and usage patterns!**

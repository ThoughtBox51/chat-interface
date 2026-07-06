# Deployment Architecture Options

## Issue Encountered

CloudFront requires a domain name for custom origins, not an IP address. This means we cannot use Elastic IP directly with CloudFront in the minimal architecture.

## Option 1: Full Architecture with ALB (Recommended for Production)

**Cost**: €55-60/month (first 12 months)

**Architecture**:
```
Internet → CloudFront → ALB → EC2 (Private Subnet) → DynamoDB
                                ↓
                           NAT Gateway
```

**Pros**:
- ✅ SSL/HTTPS via CloudFront
- ✅ Global CDN caching
- ✅ Health checks and auto-recovery
- ✅ Load balancing ready for scaling
- ✅ Private subnet security
- ✅ Production-ready

**Cons**:
- ❌ Costs €55/month (ALB €20 + NAT €35)

**Use this if**: You want production-grade infrastructure with high availability

---

## Option 2: Ultra-Minimal (Route53 → EC2 Direct)

**Cost**: €0.50/month (first 12 months)

**Architecture**:
```
Internet → Route53 → EC2 (Public Subnet + Elastic IP) → DynamoDB
```

**Pros**:
- ✅ Extremely low cost (€0.50/month)
- ✅ Simple architecture
- ✅ No CloudFront, no ALB, no NAT Gateway
- ✅ Direct access to EC2

**Cons**:
- ❌ No CDN caching
- ❌ No automatic health checks
- ❌ SSL must be configured on EC2 (using Let's Encrypt/Certbot)
- ❌ Single point of failure
- ❌ No load balancing

**Use this if**: You want absolute minimum cost for MVP testing

---

## Option 3: Hybrid (CloudFront → ALB, No NAT)

**Cost**: €20-25/month (first 12 months)

**Architecture**:
```
Internet → CloudFront → ALB → EC2 (Public Subnet) → DynamoDB
```

**Pros**:
- ✅ SSL/HTTPS via CloudFront
- ✅ Global CDN caching
- ✅ Health checks
- ✅ No NAT Gateway (save €35/month)

**Cons**:
- ❌ ALB costs €20/month
- ❌ EC2 in public subnet (less secure)

**Use this if**: You want CDN benefits but lower cost than full architecture

---

## Recommendation

For your MVP with <100 users, I recommend **Option 3 (Hybrid)** as the best balance:

- Costs only €20-25/month
- Keeps CloudFront CDN benefits
- Has health checks via ALB
- Saves €35/month by removing NAT Gateway

## Implementation

Would you like me to:

1. **Deploy Option 1** (Full Architecture) - Production-ready, €55/month
2. **Deploy Option 3** (Hybrid) - Best balance, €20/month  
3. **Deploy Option 2** (Ultra-Minimal) - Cheapest, €0.50/month

Let me know which option you prefer!

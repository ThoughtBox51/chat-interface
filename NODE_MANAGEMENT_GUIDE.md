# Kubernetes Node Management Guide - Turn Nodes On/Off

## Overview

Yes! You can turn nodes on and off in Kubernetes to save costs. This is especially useful for:
- **Development environments** (turn off at night/weekends)
- **Staging environments** (turn off when not testing)
- **Production** (scale down during low-traffic periods)

---

## Methods to Turn Nodes On/Off

### Method 1: Scale Node Groups to Zero (Recommended)

**Best for:** Dev/Staging environments, scheduled downtime

#### Using AWS CLI

```bash
# Turn OFF (scale to 0)
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=0,maxSize=0,desiredSize=0

# Turn ON (scale back up)
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=2,maxSize=10,desiredSize=3
```

#### Using kubectl + AWS CLI

```bash
# 1. Drain nodes (move pods gracefully)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 2. Scale node group to 0
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=0,maxSize=0,desiredSize=0

# 3. Turn back on
aws eks update-nodegroup-config \
  --cluster-name chat-app-cluster \
  --nodegroup-name chat-app-nodes \
  --scaling-config minSize=2,maxSize=10,desiredSize=3

# 4. Wait for nodes to be ready
kubectl get nodes --watch
```

**Time to turn off:** 2-5 minutes
**Time to turn on:** 3-7 minutes
**Cost savings:** 100% of EC2 costs (only pay for EKS control plane)

---

### Method 2: Scheduled Scaling (Automated)

**Best for:** Predictable patterns (business hours only)

#### Using Kubernetes CronJob + AWS CLI

Create a CronJob that scales nodes:

```yaml
# scale-down-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-down-nodes
  namespace: kube-system
spec:
  schedule: "0 18 * * 1-5"  # 6 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: scaler
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              aws eks update-nodegroup-config \
                --cluster-name chat-app-cluster \
                --nodegroup-name chat-app-nodes \
                --scaling-config minSize=0,maxSize=0,desiredSize=0
          restartPolicy: OnFailure
---
# scale-up-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scale-up-nodes
  namespace: kube-system
spec:
  schedule: "0 8 * * 1-5"  # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: node-scaler
          containers:
          - name: scaler
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              aws eks update-nodegroup-config \
                --cluster-name chat-app-cluster \
                --nodegroup-name chat-app-nodes \
                --scaling-config minSize=2,maxSize=10,desiredSize=3
          restartPolicy: OnFailure
```

**Schedule Examples:**
```
"0 18 * * 1-5"  # 6 PM weekdays (scale down)
"0 8 * * 1-5"   # 8 AM weekdays (scale up)
"0 22 * * *"    # 10 PM every day (scale down)
"0 6 * * *"     # 6 AM every day (scale up)
"0 18 * * 5"    # 6 PM Friday (scale down for weekend)
"0 8 * * 1"     # 8 AM Monday (scale up after weekend)
```

---

### Method 3: Karpenter (Advanced Auto-Scaling)

**Best for:** Production with variable load

Karpenter automatically provisions and deprovisions nodes based on pod requirements.

```yaml
# Install Karpenter
helm repo add karpenter https://charts.karpenter.sh
helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace

# Provisioner configuration
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot", "on-demand"]
    - key: node.kubernetes.io/instance-type
      operator: In
      values: ["t3.medium", "t3.large", "t3.xlarge"]
  limits:
    resources:
      cpu: 100
      memory: 400Gi
  ttlSecondsAfterEmpty: 30  # Remove node 30s after it's empty
  ttlSecondsUntilExpired: 604800  # Remove node after 7 days
```

**Benefits:**
- Automatic scale to zero when no pods
- Fast scale up (< 1 minute)
- Cost-optimized instance selection
- Spot instance support

---

### Method 4: AWS Instance Scheduler

**Best for:** Multiple environments, centralized scheduling

AWS Instance Scheduler can manage EC2 instances (including EKS nodes) on a schedule.

```bash
# Deploy Instance Scheduler (CloudFormation)
aws cloudformation create-stack \
  --stack-name instance-scheduler \
  --template-url https://s3.amazonaws.com/solutions-reference/aws-instance-scheduler/latest/instance-scheduler.template \
  --parameters \
    ParameterKey=Schedule,ParameterValue=business-hours

# Tag your node group instances
aws ec2 create-tags \
  --resources <instance-id> \
  --tags Key=Schedule,Value=business-hours
```

**Schedule Examples:**
```
business-hours: Mon-Fri 8am-6pm
dev-hours: Mon-Fri 9am-5pm
weekend-off: Mon-Fri only
24x7: Always on
```

---

## Cost Savings Calculator

### Scenario 1: Dev Environment (Off Nights & Weekends)

```
Configuration:
- 3 x t3.medium nodes
- On-demand: $0.0416/hour each
- Running: 8 hours/day, 5 days/week

Without Scheduling:
- 3 nodes × $0.0416/hour × 730 hours/month = $91/month

With Scheduling (40 hours/week):
- 3 nodes × $0.0416/hour × 173 hours/month = $22/month

Savings: $69/month (76% reduction)
```

### Scenario 2: Staging Environment (Business Hours Only)

```
Configuration:
- 5 x t3.large nodes
- On-demand: $0.0832/hour each
- Running: 10 hours/day, 5 days/week

Without Scheduling:
- 5 nodes × $0.0832/hour × 730 hours/month = $304/month

With Scheduling (50 hours/week):
- 5 nodes × $0.0832/hour × 217 hours/month = $90/month

Savings: $214/month (70% reduction)
```

### Scenario 3: Production (Scale Down at Night)

```
Configuration:
- 10 x c5.xlarge nodes (peak)
- 3 x c5.xlarge nodes (night)
- On-demand: $0.17/hour each
- Peak: 12 hours/day, Night: 12 hours/day

Without Scaling:
- 10 nodes × $0.17/hour × 730 hours/month = $1,241/month

With Night Scaling:
- Peak: 10 nodes × $0.17/hour × 365 hours/month = $621/month
- Night: 3 nodes × $0.17/hour × 365 hours/month = $186/month
- Total: $807/month

Savings: $434/month (35% reduction)
```

---

## Practical Scripts

### Script 1: Simple On/Off Script

```bash
#!/bin/bash
# node-control.sh

CLUSTER_NAME="chat-app-cluster"
NODEGROUP_NAME="chat-app-nodes"

case "$1" in
  on)
    echo "Turning nodes ON..."
    aws eks update-nodegroup-config \
      --cluster-name $CLUSTER_NAME \
      --nodegroup-name $NODEGROUP_NAME \
      --scaling-config minSize=2,maxSize=10,desiredSize=3
    
    echo "Waiting for nodes to be ready..."
    kubectl wait --for=condition=Ready nodes --all --timeout=300s
    echo "Nodes are ready!"
    ;;
    
  off)
    echo "Draining nodes..."
    for node in $(kubectl get nodes -o name); do
      kubectl drain $node --ignore-daemonsets --delete-emptydir-data --force
    done
    
    echo "Turning nodes OFF..."
    aws eks update-nodegroup-config \
      --cluster-name $CLUSTER_NAME \
      --nodegroup-name $NODEGROUP_NAME \
      --scaling-config minSize=0,maxSize=0,desiredSize=0
    
    echo "Nodes are shutting down..."
    ;;
    
  status)
    echo "Current node status:"
    kubectl get nodes
    
    echo -e "\nNode group configuration:"
    aws eks describe-nodegroup \
      --cluster-name $CLUSTER_NAME \
      --nodegroup-name $NODEGROUP_NAME \
      --query 'nodegroup.scalingConfig'
    ;;
    
  *)
    echo "Usage: $0 {on|off|status}"
    exit 1
    ;;
esac
```

**Usage:**
```bash
chmod +x node-control.sh

# Turn nodes off
./node-control.sh off

# Turn nodes on
./node-control.sh on

# Check status
./node-control.sh status
```

---

### Script 2: Scheduled Scaling with Slack Notifications

```python
#!/usr/bin/env python3
# scheduled-scaler.py

import boto3
import requests
import sys
from datetime import datetime

CLUSTER_NAME = "chat-app-cluster"
NODEGROUP_NAME = "chat-app-nodes"
SLACK_WEBHOOK = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

eks = boto3.client('eks')

def send_slack_notification(message):
    """Send notification to Slack"""
    payload = {"text": message}
    requests.post(SLACK_WEBHOOK, json=payload)

def scale_nodes(min_size, max_size, desired_size):
    """Scale node group"""
    try:
        response = eks.update_nodegroup_config(
            clusterName=CLUSTER_NAME,
            nodegroupName=NODEGROUP_NAME,
            scalingConfig={
                'minSize': min_size,
                'maxSize': max_size,
                'desiredSize': desired_size
            }
        )
        
        action = "scaled up" if desired_size > 0 else "scaled down"
        message = f"✅ EKS nodes {action} to {desired_size} nodes at {datetime.now()}"
        send_slack_notification(message)
        print(message)
        
    except Exception as e:
        error_message = f"❌ Failed to scale nodes: {str(e)}"
        send_slack_notification(error_message)
        print(error_message)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scheduled-scaler.py [up|down]")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == "up":
        scale_nodes(min_size=2, max_size=10, desired_size=3)
    elif action == "down":
        scale_nodes(min_size=0, max_size=0, desired_size=0)
    else:
        print("Invalid action. Use 'up' or 'down'")
        sys.exit(1)
```

**Setup cron jobs:**
```bash
# Edit crontab
crontab -e

# Add these lines:
# Scale down at 6 PM weekdays
0 18 * * 1-5 /usr/bin/python3 /path/to/scheduled-scaler.py down

# Scale up at 8 AM weekdays
0 8 * * 1-5 /usr/bin/python3 /path/to/scheduled-scaler.py up
```

---

### Script 3: Smart Scaler (Based on Time + Load)

```python
#!/usr/bin/env python3
# smart-scaler.py

import boto3
from datetime import datetime, time

CLUSTER_NAME = "chat-app-cluster"
NODEGROUP_NAME = "chat-app-nodes"

# Configuration
BUSINESS_HOURS_START = time(8, 0)   # 8 AM
BUSINESS_HOURS_END = time(18, 0)    # 6 PM
WEEKEND_DAYS = [5, 6]  # Saturday, Sunday

# Scaling configurations
BUSINESS_HOURS_CONFIG = {'minSize': 3, 'maxSize': 10, 'desiredSize': 5}
OFF_HOURS_CONFIG = {'minSize': 1, 'maxSize': 3, 'desiredSize': 1}
WEEKEND_CONFIG = {'minSize': 0, 'maxSize': 0, 'desiredSize': 0}

eks = boto3.client('eks')
cloudwatch = boto3.client('cloudwatch')

def get_current_load():
    """Get current CPU utilization from CloudWatch"""
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/EKS',
        MetricName='node_cpu_utilization',
        Dimensions=[
            {'Name': 'ClusterName', 'Value': CLUSTER_NAME}
        ],
        StartTime=datetime.now() - timedelta(minutes=5),
        EndTime=datetime.now(),
        Period=300,
        Statistics=['Average']
    )
    
    if response['Datapoints']:
        return response['Datapoints'][0]['Average']
    return 0

def determine_scaling_config():
    """Determine appropriate scaling configuration"""
    now = datetime.now()
    current_time = now.time()
    current_day = now.weekday()
    
    # Weekend
    if current_day in WEEKEND_DAYS:
        return WEEKEND_CONFIG, "weekend"
    
    # Business hours
    if BUSINESS_HOURS_START <= current_time <= BUSINESS_HOURS_END:
        return BUSINESS_HOURS_CONFIG, "business-hours"
    
    # Off hours
    return OFF_HOURS_CONFIG, "off-hours"

def scale_nodes(config):
    """Scale node group"""
    eks.update_nodegroup_config(
        clusterName=CLUSTER_NAME,
        nodegroupName=NODEGROUP_NAME,
        scalingConfig=config
    )

if __name__ == "__main__":
    config, period = determine_scaling_config()
    current_load = get_current_load()
    
    print(f"Current period: {period}")
    print(f"Current load: {current_load}%")
    print(f"Scaling to: {config}")
    
    scale_nodes(config)
```

---

## Best Practices

### 1. Graceful Shutdown

Always drain nodes before scaling down:

```bash
# Drain all nodes gracefully
for node in $(kubectl get nodes -o name); do
  kubectl drain $node \
    --ignore-daemonsets \
    --delete-emptydir-data \
    --force \
    --grace-period=300
done
```

### 2. Pod Disruption Budgets

Protect critical pods during scaling:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: chat-backend
```

### 3. Node Affinity for Critical Pods

Keep critical pods on specific nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-type
                operator: In
                values:
                - critical
```

### 4. Monitoring & Alerts

Set up alerts for node scaling events:

```yaml
# CloudWatch Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name eks-nodes-scaled-down \
  --alarm-description "Alert when EKS nodes scale to 0" \
  --metric-name DesiredCapacity \
  --namespace AWS/EKS \
  --statistic Average \
  --period 300 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

---

## Environment-Specific Strategies

### Development Environment

```yaml
Strategy: Aggressive scaling
Schedule: Business hours only (8 AM - 6 PM, Mon-Fri)
Weekend: Completely off
Night: Completely off

Configuration:
  Business Hours:
    minSize: 2
    maxSize: 5
    desiredSize: 2
  
  Off Hours:
    minSize: 0
    maxSize: 0
    desiredSize: 0

Savings: 70-80%
```

### Staging Environment

```yaml
Strategy: Moderate scaling
Schedule: Extended hours (7 AM - 8 PM, Mon-Fri)
Weekend: Minimal (1 node for monitoring)
Night: Minimal (1 node)

Configuration:
  Business Hours:
    minSize: 2
    maxSize: 8
    desiredSize: 3
  
  Off Hours:
    minSize: 1
    maxSize: 2
    desiredSize: 1
  
  Weekend:
    minSize: 1
    maxSize: 1
    desiredSize: 1

Savings: 40-60%
```

### Production Environment

```yaml
Strategy: Conservative scaling
Schedule: 24/7 with reduced capacity at night
Weekend: Reduced capacity
Night: Reduced capacity (50% of peak)

Configuration:
  Peak Hours (8 AM - 8 PM):
    minSize: 5
    maxSize: 20
    desiredSize: 10
  
  Off-Peak Hours:
    minSize: 3
    maxSize: 10
    desiredSize: 5
  
  Weekend:
    minSize: 3
    maxSize: 15
    desiredSize: 7

Savings: 20-40%
```

---

## AWS CDK Implementation

```python
from aws_cdk import (
    aws_eks as eks,
    aws_events as events,
    aws_events_targets as targets,
    aws_lambda as lambda_,
    Duration
)

class ScheduledScalingStack(Stack):
    def __init__(self, scope, id, cluster, **kwargs):
        super().__init__(scope, id, **kwargs)
        
        # Lambda function to scale nodes
        scaler_function = lambda_.Function(
            self, "NodeScaler",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            code=lambda_.Code.from_inline("""
import boto3

eks = boto3.client('eks')

def handler(event, context):
    action = event['action']
    cluster_name = event['cluster_name']
    nodegroup_name = event['nodegroup_name']
    
    if action == 'scale_down':
        config = {'minSize': 0, 'maxSize': 0, 'desiredSize': 0}
    else:
        config = {'minSize': 2, 'maxSize': 10, 'desiredSize': 3}
    
    eks.update_nodegroup_config(
        clusterName=cluster_name,
        nodegroupName=nodegroup_name,
        scalingConfig=config
    )
    
    return {'statusCode': 200, 'body': f'Scaled {action}'}
            """),
            timeout=Duration.minutes(5)
        )
        
        # Grant permissions
        cluster.grant_admin(scaler_function)
        
        # Scale down at 6 PM weekdays
        scale_down_rule = events.Rule(
            self, "ScaleDownRule",
            schedule=events.Schedule.cron(
                hour="18",
                minute="0",
                week_day="MON-FRI"
            )
        )
        
        scale_down_rule.add_target(
            targets.LambdaFunction(
                scaler_function,
                event=events.RuleTargetInput.from_object({
                    'action': 'scale_down',
                    'cluster_name': cluster.cluster_name,
                    'nodegroup_name': 'chat-app-nodes'
                })
            )
        )
        
        # Scale up at 8 AM weekdays
        scale_up_rule = events.Rule(
            self, "ScaleUpRule",
            schedule=events.Schedule.cron(
                hour="8",
                minute="0",
                week_day="MON-FRI"
            )
        )
        
        scale_up_rule.add_target(
            targets.LambdaFunction(
                scaler_function,
                event=events.RuleTargetInput.from_object({
                    'action': 'scale_up',
                    'cluster_name': cluster.cluster_name,
                    'nodegroup_name': 'chat-app-nodes'
                })
            )
        )
```

---

## Troubleshooting

### Issue 1: Pods Stuck in Pending

**Problem:** Pods can't schedule after scaling up

**Solution:**
```bash
# Check pod status
kubectl get pods --all-namespaces | grep Pending

# Check node status
kubectl get nodes

# Describe pending pod
kubectl describe pod <pod-name>

# Force reschedule
kubectl delete pod <pod-name>
```

### Issue 2: Nodes Won't Drain

**Problem:** Nodes stuck draining

**Solution:**
```bash
# Force drain
kubectl drain <node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=0

# Or delete node directly
kubectl delete node <node-name>
```

### Issue 3: Scaling Takes Too Long

**Problem:** Nodes take 10+ minutes to start

**Solution:**
- Use launch templates with pre-baked AMIs
- Enable faster instance types
- Use Karpenter for sub-minute scaling

---

## Summary

**Yes, you can turn nodes on/off!**

**Best Methods:**
1. **Dev/Staging:** Scale to 0 on schedule (70-80% savings)
2. **Production:** Scale down at night (20-40% savings)
3. **Advanced:** Use Karpenter for automatic scaling

**Quick Commands:**
```bash
# Turn off
aws eks update-nodegroup-config \
  --cluster-name CLUSTER \
  --nodegroup-name NODEGROUP \
  --scaling-config minSize=0,maxSize=0,desiredSize=0

# Turn on
aws eks update-nodegroup-config \
  --cluster-name CLUSTER \
  --nodegroup-name NODEGROUP \
  --scaling-config minSize=2,maxSize=10,desiredSize=3
```

**Typical Savings:**
- Dev: 70-80% (off nights & weekends)
- Staging: 40-60% (reduced capacity off-hours)
- Production: 20-40% (scale down at night)

**Would you like me to create the automation scripts for your specific schedule?**

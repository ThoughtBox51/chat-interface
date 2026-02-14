#!/usr/bin/env python3
"""
Infrastructure Sizing Calculator for LLM Chat Application

Usage:
    python infrastructure_calculator.py --concurrent-users 1000
    python infrastructure_calculator.py --total-users 10000 --active-ratio 0.15
    python infrastructure_calculator.py --interactive
"""

import argparse
import math
from dataclasses import dataclass
from typing import Tuple
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


@dataclass
class PodConfig:
    """Pod resource configuration"""
    cpu_request: float  # CPU cores
    cpu_limit: float
    memory_request: int  # MB
    memory_limit: int


@dataclass
class InfrastructureRecommendation:
    """Infrastructure sizing recommendation"""
    tier: str
    tier_emoji: str
    concurrent_users: int
    total_users: int
    
    # Backend
    backend_min_pods: int
    backend_max_pods: int
    backend_pod_config: PodConfig
    
    # Frontend
    frontend_min_pods: int
    frontend_max_pods: int
    frontend_pod_config: PodConfig
    
    # Nodes
    node_type: str
    node_vcpu: int
    node_memory_gb: int
    min_nodes: int
    max_nodes: int
    
    # Database
    dynamodb_mode: str
    estimated_rcu: int
    estimated_wcu: int
    
    # Caching
    needs_redis: bool
    redis_instance: str
    
    # Costs
    monthly_cost_min: int
    monthly_cost_max: int
    
    # Performance
    requests_per_second: int
    expected_latency_ms: str


class InfrastructureCalculator:
    """Calculate infrastructure requirements based on user load"""
    
    # Constants
    REQUESTS_PER_USER_PER_MINUTE = 3
    REQUESTS_PER_BACKEND_POD = 50  # Conservative estimate
    USERS_PER_BACKEND_POD = 100
    CONNECTIONS_PER_FRONTEND_POD = 500
    
    # Pod configurations by tier
    POD_CONFIGS = {
        'small': {
            'backend': PodConfig(0.25, 0.5, 256, 512),
            'frontend': PodConfig(0.1, 0.2, 128, 256)
        },
        'medium': {
            'backend': PodConfig(0.5, 1.0, 512, 1024),
            'frontend': PodConfig(0.2, 0.4, 256, 512)
        },
        'large': {
            'backend': PodConfig(1.0, 2.0, 1024, 2048),
            'frontend': PodConfig(0.5, 1.0, 512, 1024)
        },
        'enterprise': {
            'backend': PodConfig(2.0, 4.0, 2048, 4096),
            'frontend': PodConfig(1.0, 2.0, 1024, 2048)
        }
    }
    
    # Node configurations
    NODE_CONFIGS = {
        'small': ('t3.medium', 2, 4),
        'medium': ('t3.large', 2, 8),
        'large': ('c5.xlarge', 4, 8),
        'enterprise': ('c5.2xlarge', 8, 16)
    }
    
    def determine_tier(self, concurrent_users: int) -> str:
        """Determine infrastructure tier based on concurrent users"""
        if concurrent_users <= 500:
            return 'small'
        elif concurrent_users <= 2000:
            return 'medium'
        elif concurrent_users <= 10000:
            return 'large'
        else:
            return 'enterprise'
    
    def calculate_backend_pods(self, concurrent_users: int) -> Tuple[int, int]:
        """Calculate min and max backend pods needed"""
        # Base calculation
        base_pods = concurrent_users / self.USERS_PER_BACKEND_POD
        
        # Add 30% buffer for spikes
        min_pods = max(3, math.ceil(base_pods * 1.3))
        
        # Max is 3x min for auto-scaling
        max_pods = min_pods * 3
        
        return min_pods, max_pods
    
    def calculate_frontend_pods(self, concurrent_users: int) -> Tuple[int, int]:
        """Calculate min and max frontend pods needed"""
        base_pods = concurrent_users / self.CONNECTIONS_PER_FRONTEND_POD
        min_pods = max(2, math.ceil(base_pods * 1.2))
        max_pods = min_pods * 2
        
        return min_pods, max_pods
    
    def calculate_nodes(self, tier: str, backend_pods: int, frontend_pods: int) -> Tuple[int, int]:
        """Calculate number of nodes needed"""
        backend_config = self.POD_CONFIGS[tier]['backend']
        frontend_config = self.POD_CONFIGS[tier]['frontend']
        node_type, node_vcpu, node_memory_gb = self.NODE_CONFIGS[tier]
        
        # Calculate total resource requirements
        total_cpu = (backend_pods * backend_config.cpu_request + 
                    frontend_pods * frontend_config.cpu_request)
        total_memory_mb = (backend_pods * backend_config.memory_request + 
                          frontend_pods * frontend_config.memory_request)
        
        # Usable capacity (after system pods)
        usable_cpu = node_vcpu * 0.9
        usable_memory_mb = node_memory_gb * 1024 * 0.8
        
        # Calculate nodes needed
        nodes_for_cpu = math.ceil(total_cpu / usable_cpu)
        nodes_for_memory = math.ceil(total_memory_mb / usable_memory_mb)
        min_nodes = max(2, nodes_for_cpu, nodes_for_memory)
        
        # Add 20% buffer
        min_nodes = math.ceil(min_nodes * 1.2)
        max_nodes = min_nodes * 2
        
        return min_nodes, max_nodes
    
    def calculate_dynamodb_capacity(self, concurrent_users: int) -> Tuple[int, int]:
        """Calculate DynamoDB read/write capacity units"""
        # Assumptions: 0.5 reads/sec per user, 0.1 writes/sec per user
        reads_per_sec = concurrent_users * 0.5
        writes_per_sec = concurrent_users * 0.1
        
        # Convert to RCU/WCU (4KB items for reads, 1KB for writes)
        rcu = math.ceil(reads_per_sec / 2)  # 1 RCU = 2 eventually consistent reads
        wcu = math.ceil(writes_per_sec)
        
        return rcu, wcu
    
    def estimate_costs(self, tier: str, min_nodes: int, max_nodes: int, 
                      rcu: int, needs_redis: bool) -> Tuple[int, int]:
        """Estimate monthly costs"""
        cost_ranges = {
            'small': (200, 300),
            'medium': (500, 800),
            'large': (1500, 3000),
            'enterprise': (6000, 12000)
        }
        return cost_ranges[tier]
    
    def calculate(self, concurrent_users: int, total_users: int = None) -> InfrastructureRecommendation:
        """Calculate complete infrastructure recommendation"""
        
        # Determine tier
        tier = self.determine_tier(concurrent_users)
        tier_emojis = {
            'small': '🟢',
            'medium': '🟡',
            'large': '🟠',
            'enterprise': '🔴'
        }
        
        # Calculate pods
        backend_min, backend_max = self.calculate_backend_pods(concurrent_users)
        frontend_min, frontend_max = self.calculate_frontend_pods(concurrent_users)
        
        # Calculate nodes
        node_type, node_vcpu, node_memory_gb = self.NODE_CONFIGS[tier]
        min_nodes, max_nodes = self.calculate_nodes(tier, backend_min, frontend_min)
        
        # Calculate DynamoDB
        rcu, wcu = self.calculate_dynamodb_capacity(concurrent_users)
        
        # Determine if Redis is needed
        needs_redis = tier in ['medium', 'large', 'enterprise']
        redis_instances = {
            'small': 'N/A',
            'medium': 'cache.t3.small',
            'large': 'cache.r6g.large',
            'enterprise': 'cache.r6g.xlarge (cluster)'
        }
        
        # Estimate costs
        cost_min, cost_max = self.estimate_costs(tier, min_nodes, max_nodes, rcu, needs_redis)
        
        # Calculate performance metrics
        requests_per_sec = math.ceil((concurrent_users * self.REQUESTS_PER_USER_PER_MINUTE) / 60)
        latency_ranges = {
            'small': '100-300',
            'medium': '50-200',
            'large': '50-150',
            'enterprise': '30-100'
        }
        
        # Estimate total users if not provided
        if total_users is None:
            total_users = concurrent_users * 10  # Assume 10% active ratio
        
        return InfrastructureRecommendation(
            tier=tier.title(),
            tier_emoji=tier_emojis[tier],
            concurrent_users=concurrent_users,
            total_users=total_users,
            backend_min_pods=backend_min,
            backend_max_pods=backend_max,
            backend_pod_config=self.POD_CONFIGS[tier]['backend'],
            frontend_min_pods=frontend_min,
            frontend_max_pods=frontend_max,
            frontend_pod_config=self.POD_CONFIGS[tier]['frontend'],
            node_type=node_type,
            node_vcpu=node_vcpu,
            node_memory_gb=node_memory_gb,
            min_nodes=min_nodes,
            max_nodes=max_nodes,
            dynamodb_mode='On-Demand' if tier in ['small', 'medium'] else 'On-Demand (consider Provisioned)',
            estimated_rcu=rcu,
            estimated_wcu=wcu,
            needs_redis=needs_redis,
            redis_instance=redis_instances[tier],
            monthly_cost_min=cost_min,
            monthly_cost_max=cost_max,
            requests_per_second=requests_per_sec,
            expected_latency_ms=latency_ranges[tier]
        )


def display_recommendation(rec: InfrastructureRecommendation):
    """Display recommendation in a nice format"""
    
    # Header
    console.print()
    console.print(Panel.fit(
        f"[bold]{rec.tier_emoji} {rec.tier.upper()} TIER[/bold]\n"
        f"Infrastructure Recommendation",
        border_style="green"
    ))
    console.print()
    
    # User Load
    table = Table(title="📊 User Load", box=box.ROUNDED)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Concurrent Users", f"{rec.concurrent_users:,}")
    table.add_row("Total Users", f"{rec.total_users:,}")
    table.add_row("Requests/Second", f"{rec.requests_per_second}")
    table.add_row("Expected Latency", f"{rec.expected_latency_ms} ms")
    console.print(table)
    console.print()
    
    # Backend Configuration
    table = Table(title="🔧 Backend Configuration", box=box.ROUNDED)
    table.add_column("Component", style="cyan")
    table.add_column("Configuration", style="yellow")
    table.add_row("Pod Count", f"{rec.backend_min_pods} - {rec.backend_max_pods} (min-max)")
    table.add_row("CPU per Pod", f"{rec.backend_pod_config.cpu_request} - {rec.backend_pod_config.cpu_limit} cores")
    table.add_row("Memory per Pod", f"{rec.backend_pod_config.memory_request} - {rec.backend_pod_config.memory_limit} MB")
    console.print(table)
    console.print()
    
    # Frontend Configuration
    table = Table(title="🎨 Frontend Configuration", box=box.ROUNDED)
    table.add_column("Component", style="cyan")
    table.add_column("Configuration", style="yellow")
    table.add_row("Pod Count", f"{rec.frontend_min_pods} - {rec.frontend_max_pods} (min-max)")
    table.add_row("CPU per Pod", f"{rec.frontend_pod_config.cpu_request} - {rec.frontend_pod_config.cpu_limit} cores")
    table.add_row("Memory per Pod", f"{rec.frontend_pod_config.memory_request} - {rec.frontend_pod_config.memory_limit} MB")
    console.print(table)
    console.print()
    
    # Node Configuration
    table = Table(title="🖥️  Node Configuration", box=box.ROUNDED)
    table.add_column("Component", style="cyan")
    table.add_column("Configuration", style="yellow")
    table.add_row("Instance Type", rec.node_type)
    table.add_row("vCPU per Node", str(rec.node_vcpu))
    table.add_row("Memory per Node", f"{rec.node_memory_gb} GB")
    table.add_row("Node Count", f"{rec.min_nodes} - {rec.max_nodes} (min-max)")
    console.print(table)
    console.print()
    
    # Database Configuration
    table = Table(title="🗄️  Database Configuration", box=box.ROUNDED)
    table.add_column("Component", style="cyan")
    table.add_column("Configuration", style="yellow")
    table.add_row("DynamoDB Mode", rec.dynamodb_mode)
    table.add_row("Estimated RCU", f"{rec.estimated_rcu}")
    table.add_row("Estimated WCU", f"{rec.estimated_wcu}")
    if rec.needs_redis:
        table.add_row("Redis Cache", f"✅ {rec.redis_instance}")
    else:
        table.add_row("Redis Cache", "❌ Not needed")
    console.print(table)
    console.print()
    
    # Cost Estimate
    table = Table(title="💰 Cost Estimate", box=box.ROUNDED)
    table.add_column("Component", style="cyan")
    table.add_column("Monthly Cost", style="green")
    table.add_row("Total (Estimated)", f"${rec.monthly_cost_min:,} - ${rec.monthly_cost_max:,}")
    table.add_row("Cost per User", f"${rec.monthly_cost_min/rec.total_users:.2f} - ${rec.monthly_cost_max/rec.total_users:.2f}")
    console.print(table)
    console.print()
    
    # Recommendations
    console.print(Panel(
        "[bold yellow]💡 Recommendations:[/bold yellow]\n\n"
        "1. Start with minimum configuration and enable auto-scaling\n"
        "2. Monitor metrics for 2-4 weeks before adjusting\n"
        "3. Use spot instances for 60-90% cost savings on non-critical workloads\n"
        "4. Implement caching to reduce database load\n"
        "5. Review and optimize monthly based on actual usage",
        title="Next Steps",
        border_style="blue"
    ))
    console.print()


def interactive_mode():
    """Interactive mode for calculating infrastructure"""
    console.print("[bold green]Infrastructure Sizing Calculator[/bold green]")
    console.print()
    
    # Get user input
    concurrent_users = console.input("[cyan]Enter expected concurrent users: [/cyan]")
    try:
        concurrent_users = int(concurrent_users)
    except ValueError:
        console.print("[red]Invalid number. Please enter a valid integer.[/red]")
        return
    
    total_users = console.input("[cyan]Enter total registered users (or press Enter to estimate): [/cyan]")
    if total_users.strip():
        try:
            total_users = int(total_users)
        except ValueError:
            console.print("[yellow]Invalid number. Will estimate based on 10% active ratio.[/yellow]")
            total_users = None
    else:
        total_users = None
    
    # Calculate
    calculator = InfrastructureCalculator()
    recommendation = calculator.calculate(concurrent_users, total_users)
    
    # Display
    display_recommendation(recommendation)


def main():
    parser = argparse.ArgumentParser(
        description='Calculate infrastructure requirements for LLM Chat Application'
    )
    parser.add_argument(
        '--concurrent-users',
        type=int,
        help='Number of concurrent users'
    )
    parser.add_argument(
        '--total-users',
        type=int,
        help='Total registered users (optional)'
    )
    parser.add_argument(
        '--active-ratio',
        type=float,
        default=0.1,
        help='Active user ratio (default: 0.1 = 10%%)'
    )
    parser.add_argument(
        '--interactive',
        action='store_true',
        help='Run in interactive mode'
    )
    
    args = parser.parse_args()
    
    if args.interactive:
        interactive_mode()
    elif args.concurrent_users:
        calculator = InfrastructureCalculator()
        recommendation = calculator.calculate(args.concurrent_users, args.total_users)
        display_recommendation(recommendation)
    else:
        parser.print_help()
        console.print("\n[yellow]Tip: Use --interactive for guided input[/yellow]")


if __name__ == '__main__':
    main()

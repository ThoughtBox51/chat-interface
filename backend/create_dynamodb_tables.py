"""
Script to create DynamoDB tables in AWS
Usage: python create_dynamodb_tables.py
"""
import boto3
from botocore.exceptions import ClientError

# Configuration
REGION = 'us-east-1'  # Change this to your preferred region
PROFILE = 'Venkatesh'  # AWS profile name (use None for default)
TABLES = {
    'chat_app_users': {
        'KeySchema': [
            {'AttributeName': 'id', 'KeyType': 'HASH'}
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'id', 'AttributeType': 'S'},
            {'AttributeName': 'email', 'AttributeType': 'S'},
            {'AttributeName': 'status', 'AttributeType': 'S'}
        ],
        'GlobalSecondaryIndexes': [
            {
                'IndexName': 'email-index',
                'KeySchema': [
                    {'AttributeName': 'email', 'KeyType': 'HASH'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            },
            {
                'IndexName': 'status-index',
                'KeySchema': [
                    {'AttributeName': 'status', 'KeyType': 'HASH'}
                ],
                'Projection': {'ProjectionType': 'ALL'}
            }
        ]
    },
    'chat_app_models': {
        'KeySchema': [
            {'AttributeName': 'id', 'KeyType': 'HASH'}
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'id', 'AttributeType': 'S'}
        ]
    },
    'chat_app_roles': {
        'KeySchema': [
            {'AttributeName': 'id', 'KeyType': 'HASH'}
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'id', 'AttributeType': 'S'}
        ]
    },
    'chat_app_chats': {
        'KeySchema': [
            {'AttributeName': 'id', 'KeyType': 'HASH'}
        ],
        'AttributeDefinitions': [
            {'AttributeName': 'id', 'AttributeType': 'S'}
        ]
    }
}

def create_tables():
    """Create DynamoDB tables in AWS"""
    print(f"Creating DynamoDB tables in region: {REGION}")
    if PROFILE:
        print(f"Using AWS profile: {PROFILE}")
    print("=" * 60)
    
    # Create session with profile
    session = boto3.Session(profile_name=PROFILE) if PROFILE else boto3.Session()
    
    # Create DynamoDB client
    dynamodb = session.client('dynamodb', region_name=REGION)
    
    # Get AWS account info
    try:
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        print(f"AWS Account: {identity['Account']}")
        print(f"User/Role: {identity['Arn']}")
        print("=" * 60)
    except Exception as e:
        print(f"Warning: Could not get AWS identity: {e}")
        print("=" * 60)
    
    created_tables = []
    existing_tables = []
    failed_tables = []
    
    for table_name, config in TABLES.items():
        try:
            print(f"\nCreating table: {table_name}...")
            
            # Build table creation parameters
            params = {
                'TableName': table_name,
                'KeySchema': config['KeySchema'],
                'AttributeDefinitions': config['AttributeDefinitions'],
                'BillingMode': 'PAY_PER_REQUEST'  # On-demand billing
            }
            
            # Add GSI if present
            if 'GlobalSecondaryIndexes' in config:
                params['GlobalSecondaryIndexes'] = config['GlobalSecondaryIndexes']
            
            # Create table
            response = dynamodb.create_table(**params)
            
            print(f"✓ Table '{table_name}' created successfully!")
            print(f"  Status: {response['TableDescription']['TableStatus']}")
            print(f"  ARN: {response['TableDescription']['TableArn']}")
            created_tables.append(table_name)
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceInUseException':
                print(f"⚠ Table '{table_name}' already exists")
                existing_tables.append(table_name)
            else:
                print(f"✗ Error creating table '{table_name}': {e}")
                failed_tables.append(table_name)
        except Exception as e:
            print(f"✗ Unexpected error creating table '{table_name}': {e}")
            failed_tables.append(table_name)
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if created_tables:
        print(f"\n✓ Created {len(created_tables)} table(s):")
        for table in created_tables:
            print(f"  - {table}")
    
    if existing_tables:
        print(f"\n⚠ {len(existing_tables)} table(s) already existed:")
        for table in existing_tables:
            print(f"  - {table}")
    
    if failed_tables:
        print(f"\n✗ Failed to create {len(failed_tables)} table(s):")
        for table in failed_tables:
            print(f"  - {table}")
    
    print("\n" + "=" * 60)
    
    if created_tables:
        print("\nNOTE: Tables are being created. It may take a few moments")
        print("for them to become ACTIVE. You can check status with:")
        print(f"  aws dynamodb describe-table --table-name <table-name> --region {REGION}")
    
    print("\nNext steps:")
    print("1. Update backend/.env file:")
    print(f"   - Remove or comment out DYNAMODB_ENDPOINT_URL")
    print(f"   - Set AWS_REGION={REGION}")
    print("   - AWS credentials will be used from your AWS CLI configuration")
    print("2. Run: python run.py")
    print("3. Create admin user: python create_admin.py")
    
    return len(failed_tables) == 0

if __name__ == "__main__":
    try:
        success = create_tables()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        print("\nMake sure:")
        print("1. AWS credentials are configured (aws configure)")
        print("2. You have permissions to create DynamoDB tables")
        print("3. boto3 is installed (pip install boto3)")
        exit(1)

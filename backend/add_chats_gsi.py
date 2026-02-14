"""
Script to add Global Secondary Index (GSI) to existing chats table
This will significantly improve query performance for user's chats
Usage: python add_chats_gsi.py
"""
import boto3
from botocore.exceptions import ClientError
import time

# Configuration
REGION = 'us-east-1'
PROFILE = 'Venkatesh'
TABLE_NAME = 'chat_app_chats'
INDEX_NAME = 'user-id-index'

def add_gsi():
    """Add GSI to existing chats table"""
    print(f"Adding GSI to table: {TABLE_NAME}")
    print(f"Region: {REGION}")
    print(f"Profile: {PROFILE}")
    print("=" * 60)
    
    # Create session with profile
    session = boto3.Session(profile_name=PROFILE) if PROFILE else boto3.Session()
    dynamodb = session.client('dynamodb', region_name=REGION)
    
    try:
        # Check if table exists
        print(f"\nChecking table '{TABLE_NAME}'...")
        response = dynamodb.describe_table(TableName=TABLE_NAME)
        
        # Check if GSI already exists
        existing_gsis = response['Table'].get('GlobalSecondaryIndexes', [])
        if any(gsi['IndexName'] == INDEX_NAME for gsi in existing_gsis):
            print(f"✓ GSI '{INDEX_NAME}' already exists on table '{TABLE_NAME}'")
            print("\nNo action needed!")
            return True
        
        print(f"✓ Table found. Current status: {response['Table']['TableStatus']}")
        
        # Add GSI
        print(f"\nAdding GSI '{INDEX_NAME}'...")
        print("This operation may take several minutes depending on table size...")
        
        dynamodb.update_table(
            TableName=TABLE_NAME,
            AttributeDefinitions=[
                {'AttributeName': 'user_id', 'AttributeType': 'S'},
                {'AttributeName': 'updated_at', 'AttributeType': 'S'}
            ],
            GlobalSecondaryIndexUpdates=[
                {
                    'Create': {
                        'IndexName': INDEX_NAME,
                        'KeySchema': [
                            {'AttributeName': 'user_id', 'KeyType': 'HASH'},
                            {'AttributeName': 'updated_at', 'KeyType': 'RANGE'}
                        ],
                        'Projection': {'ProjectionType': 'ALL'}
                    }
                }
            ]
        )
        
        print(f"✓ GSI creation initiated!")
        print("\nMonitoring GSI creation status...")
        
        # Wait for GSI to be created
        while True:
            time.sleep(5)
            response = dynamodb.describe_table(TableName=TABLE_NAME)
            
            gsi_status = None
            for gsi in response['Table'].get('GlobalSecondaryIndexes', []):
                if gsi['IndexName'] == INDEX_NAME:
                    gsi_status = gsi['IndexStatus']
                    break
            
            if gsi_status == 'ACTIVE':
                print(f"\n✓ GSI '{INDEX_NAME}' is now ACTIVE!")
                break
            elif gsi_status == 'CREATING':
                print(f"  Status: {gsi_status} (waiting...)")
            else:
                print(f"  Status: {gsi_status}")
        
        print("\n" + "=" * 60)
        print("SUCCESS!")
        print("=" * 60)
        print(f"\nGSI '{INDEX_NAME}' has been successfully added to '{TABLE_NAME}'")
        print("\nBenefits:")
        print("  - Queries by user_id will be 10-100x faster")
        print("  - Results automatically sorted by updated_at")
        print("  - No more full table scans")
        print("\nThe backend will automatically use this index for getChats()")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        
        if error_code == 'ResourceNotFoundException':
            print(f"\n✗ Error: Table '{TABLE_NAME}' does not exist")
            print("\nPlease create the table first:")
            print("  python create_dynamodb_tables.py")
        elif error_code == 'LimitExceededException':
            print(f"\n✗ Error: Cannot add GSI - limit exceeded")
            print("\nDynamoDB allows a maximum of 20 GSIs per table")
        elif error_code == 'ResourceInUseException':
            print(f"\n✗ Error: Table is currently being updated")
            print("\nPlease wait for the current operation to complete and try again")
        else:
            print(f"\n✗ Error: {e}")
        
        return False
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    try:
        success = add_gsi()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        exit(1)
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        exit(1)

"""
Check DynamoDB table status
"""
import boto3

REGION = 'us-east-1'
PROFILE = 'Venkatesh'
TABLES = ['chat_app_users', 'chat_app_models', 'chat_app_roles', 'chat_app_chats']

session = boto3.Session(profile_name=PROFILE)
dynamodb = session.client('dynamodb', region_name=REGION)

print("Checking DynamoDB table status...")
print("=" * 60)

all_active = True
for table_name in TABLES:
    try:
        response = dynamodb.describe_table(TableName=table_name)
        status = response['Table']['TableStatus']
        item_count = response['Table']['ItemCount']
        
        if status == 'ACTIVE':
            print(f"✓ {table_name}: {status} ({item_count} items)")
        else:
            print(f"⏳ {table_name}: {status}")
            all_active = False
    except Exception as e:
        print(f"✗ {table_name}: Error - {e}")
        all_active = False

print("=" * 60)
if all_active:
    print("✓ All tables are ACTIVE and ready to use!")
else:
    print("⏳ Some tables are still being created. Please wait...")

"""
List all users in DynamoDB
"""
import boto3
from app.core.config import settings

# Create boto3 session
if settings.AWS_PROFILE:
    session = boto3.Session(profile_name=settings.AWS_PROFILE)
else:
    session = boto3.Session()

# Create DynamoDB resource
dynamodb_kwargs = {'region_name': settings.AWS_REGION}
if settings.DYNAMODB_ENDPOINT_URL:
    dynamodb_kwargs['endpoint_url'] = settings.DYNAMODB_ENDPOINT_URL

dynamodb = session.resource('dynamodb', **dynamodb_kwargs)
table = dynamodb.Table(settings.USERS_TABLE)

# Scan all users
response = table.scan()
users = response.get('Items', [])

print(f"\n{'='*60}")
print(f"Total users in database: {len(users)}")
print(f"{'='*60}\n")

if users:
    for i, user in enumerate(users, 1):
        print(f"{i}. Email: {user.get('email')}")
        print(f"   Name: {user.get('name')}")
        print(f"   Role: {user.get('role')}")
        print(f"   Status: {user.get('status')}")
        print(f"   ID: {user.get('id')}")
        print(f"   Has Password: {'Yes' if user.get('hashed_password') else 'No'}")
        print(f"   Created: {user.get('created_at', 'N/A')}")
        print()
else:
    print("No users found in the database!")
    print("\nTo create an admin user, run:")
    print("  python create_admin.py")

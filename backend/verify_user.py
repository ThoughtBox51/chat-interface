"""
Verify admin user exists in DynamoDB
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

# Query for admin user
response = table.query(
    IndexName='email-index',
    KeyConditionExpression='email = :email',
    ExpressionAttributeValues={':email': 'admin@example.com'}
)

if response.get('Items'):
    user = response['Items'][0]
    print("✓ Admin user found!")
    print(f"  Email: {user['email']}")
    print(f"  Name: {user['name']}")
    print(f"  Role: {user['role']}")
    print(f"  Status: {user['status']}")
    print(f"  ID: {user['id']}")
    print(f"  Has password: {'hashed_password' in user}")
else:
    print("✗ Admin user not found!")
    print("Run: python create_admin.py")

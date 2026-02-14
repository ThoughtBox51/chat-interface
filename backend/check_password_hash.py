"""
Check password hashes in database
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

print(f"\nChecking password hashes for {len(users)} users:")
print("=" * 60)

for user in users:
    email = user.get('email')
    hashed_pw = user.get('hashed_password', '')
    
    print(f"\nEmail: {email}")
    print(f"Hash length: {len(hashed_pw)} characters")
    print(f"Hash prefix: {hashed_pw[:20]}...")
    print(f"Starts with $2b$: {hashed_pw.startswith('$2b$')}")
    
    # Check if it's a valid bcrypt hash format
    if hashed_pw.startswith('$2b$') or hashed_pw.startswith('$2a$') or hashed_pw.startswith('$2y$'):
        print("✅ Valid bcrypt format")
    else:
        print("❌ Invalid bcrypt format!")

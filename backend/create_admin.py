"""
Script to create an admin user
Usage: python create_admin.py
"""
import boto3
import uuid
from datetime import datetime
from app.core.security import get_password_hash
from app.core.config import settings

def create_admin():
    # Admin user data
    admin_email = input("Enter admin email: ")
    admin_password = input("Enter admin password: ")
    admin_name = input("Enter admin name: ")
    
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
    
    # Check if user exists by email
    response = table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :email',
        ExpressionAttributeValues={':email': admin_email}
    )
    
    if response.get('Items'):
        existing_user = response['Items'][0]
        print(f"User with email {admin_email} already exists!")
        
        # Update to admin
        table.update_item(
            Key={'id': existing_user['id']},
            UpdateExpression='SET #role = :role, #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={
                '#role': 'role',
                '#status': 'status'
            },
            ExpressionAttributeValues={
                ':role': 'admin',
                ':status': 'active',
                ':updated_at': datetime.utcnow().isoformat()
            }
        )
        print(f"Updated {admin_email} to admin status")
    else:
        # Create new admin user
        admin_user = {
            'id': str(uuid.uuid4()),
            'email': admin_email,
            'name': admin_name,
            'hashed_password': get_password_hash(admin_password),
            'role': 'admin',
            'status': 'active',
            'bio': '',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        table.put_item(Item=admin_user)
        print(f"Admin user created successfully! ID: {admin_user['id']}")

if __name__ == "__main__":
    create_admin()

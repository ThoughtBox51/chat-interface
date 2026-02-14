"""
Script to reset user password
Usage: python reset_password.py
"""
import boto3
from datetime import datetime
from app.core.security import get_password_hash
from app.core.config import settings

def reset_password():
    # Get user email
    email = input("Enter user email: ")
    new_password = input("Enter new password: ")
    
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
    
    # Find user by email
    response = table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :email',
        ExpressionAttributeValues={':email': email}
    )
    
    if not response.get('Items'):
        print(f"❌ User with email {email} not found!")
        return
    
    user = response['Items'][0]
    
    # Update password
    table.update_item(
        Key={'id': user['id']},
        UpdateExpression='SET hashed_password = :password, updated_at = :updated_at',
        ExpressionAttributeValues={
            ':password': get_password_hash(new_password),
            ':updated_at': datetime.utcnow().isoformat()
        }
    )
    
    print(f"\n✅ Password updated successfully for {email}!")
    print(f"   Name: {user.get('name')}")
    print(f"   Role: {user.get('role')}")
    print(f"   New password: {new_password}")

if __name__ == "__main__":
    reset_password()

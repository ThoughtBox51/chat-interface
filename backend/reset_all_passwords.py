"""
Reset all user passwords to 'admin123'
"""
import boto3
from datetime import datetime
from app.core.security import get_password_hash
from app.core.config import settings

def reset_all_passwords():
    new_password = "admin123"
    
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
    
    # Get all users
    response = table.scan()
    users = response.get('Items', [])
    
    print(f"\nResetting passwords for {len(users)} users to: {new_password}")
    print("=" * 60)
    
    hashed_password = get_password_hash(new_password)
    
    for user in users:
        email = user.get('email')
        user_id = user.get('id')
        name = user.get('name')
        
        # Update password
        table.update_item(
            Key={'id': user_id},
            UpdateExpression='SET hashed_password = :password, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':password': hashed_password,
                ':updated_at': datetime.utcnow().isoformat()
            }
        )
        
        print(f"✅ {name} ({email})")
    
    print("\n" + "=" * 60)
    print(f"All passwords reset to: {new_password}")
    print("\nYou can now login with:")
    for user in users:
        print(f"  - {user.get('email')} / {new_password}")

if __name__ == "__main__":
    try:
        reset_all_passwords()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

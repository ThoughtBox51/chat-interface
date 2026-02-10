"""
Script to create an admin user
Usage: python create_admin.py
"""
import asyncio
import uuid
from datetime import datetime
from app.core.security import get_password_hash
from app.core.database import get_dynamodb
from app.core.config import settings

async def create_admin():
    # Admin user data
    admin_email = input("Enter admin email: ")
    admin_password = input("Enter admin password: ")
    admin_name = input("Enter admin name: ")
    
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.USERS_TABLE)
        
        # Check if user exists by email
        response = await table.query(
            IndexName='email-index',
            KeyConditionExpression='email = :email',
            ExpressionAttributeValues={':email': admin_email}
        )
        
        if response.get('Items'):
            existing_user = response['Items'][0]
            print(f"User with email {admin_email} already exists!")
            
            # Update to admin
            await table.update_item(
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
            
            await table.put_item(Item=admin_user)
            print(f"Admin user created successfully! ID: {admin_user['id']}")

if __name__ == "__main__":
    asyncio.run(create_admin())

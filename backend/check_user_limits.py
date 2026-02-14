"""
Script to check user limits
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def check_user_limits():
    """Check user limits"""
    db = get_dynamodb()
    users_table = db.get_table(settings.USERS_TABLE)
    roles_table = db.get_table(settings.ROLES_TABLE)
    
    # Get all users
    response = users_table.scan()
    users = response.get('Items', [])
    
    print(f"\nTotal users: {len(users)}")
    print("=" * 60)
    
    for user in users:
        print(f"\nUser: {user.get('email')}")
        print(f"  ID: {user.get('id')}")
        print(f"  Role: {user.get('role')}")
        print(f"  Custom Role ID: {user.get('custom_role', 'None')}")
        
        # If user has custom_role, get role details
        if user.get('custom_role'):
            role_response = roles_table.get_item(Key={'id': user['custom_role']})
            if 'Item' in role_response:
                role = role_response['Item']
                print(f"\n  Custom Role Details:")
                print(f"    Name: {role.get('name')}")
                print(f"    Max Chats: {role.get('max_chats', 'Unlimited')}")
                print(f"    Max Tokens/Month: {role.get('max_tokens_per_month', 'Unlimited')}")
                print(f"    Context Length: {role.get('context_length', 'Not set')}")
            else:
                print(f"  ⚠ Custom role not found in database!")
        else:
            print(f"  No custom role (defaults apply)")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_user_limits()

"""
Script to fix user role field structure
Moves role ID from 'role' field to 'custom_role' field
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def fix_user_role_fields():
    """Fix user role field structure"""
    db = get_dynamodb()
    users_table = db.get_table(settings.USERS_TABLE)
    roles_table = db.get_table(settings.ROLES_TABLE)
    
    print("\nChecking user role field structure...")
    print("=" * 60)
    
    # Get all users
    response = users_table.scan()
    users = response.get('Items', [])
    
    # Get all roles to validate IDs
    roles_response = roles_table.scan()
    roles = roles_response.get('Items', [])
    role_ids = [r['id'] for r in roles]
    
    print(f"\nValid role IDs in database: {role_ids}")
    
    fixed_count = 0
    
    for user in users:
        user_email = user.get('email')
        user_role = user.get('role')
        user_custom_role = user.get('custom_role')
        
        # Check if role field contains a UUID (role ID) instead of "user" or "admin"
        if user_role not in ['user', 'admin'] and user_role in role_ids:
            print(f"\n⚠ Found user with role ID in 'role' field:")
            print(f"  Email: {user_email}")
            print(f"  Current 'role': {user_role}")
            print(f"  Current 'custom_role': {user_custom_role}")
            
            # Fix: Move role ID to custom_role, set role to "user"
            print(f"\n  Fixing...")
            print(f"    Setting 'role' = 'user'")
            print(f"    Setting 'custom_role' = '{user_role}'")
            
            users_table.update_item(
                Key={'id': user['id']},
                UpdateExpression='SET #role = :role, custom_role = :custom_role',
                ExpressionAttributeNames={'#role': 'role'},
                ExpressionAttributeValues={
                    ':role': 'user',
                    ':custom_role': user_role
                }
            )
            
            print(f"  ✓ Fixed {user_email}")
            fixed_count += 1
    
    if fixed_count == 0:
        print("\n✓ All users have correct role field structure!")
    else:
        print(f"\n✓ Fixed {fixed_count} user(s)")
    
    # Verify fixes
    print("\n" + "=" * 60)
    print("VERIFICATION")
    print("=" * 60)
    
    response = users_table.scan()
    users = response.get('Items', [])
    
    for user in users:
        print(f"\nUser: {user.get('email')}")
        print(f"  role: {user.get('role')}")
        print(f"  custom_role: {user.get('custom_role', 'None')}")
        
        if user.get('custom_role'):
            role_response = roles_table.get_item(Key={'id': user['custom_role']})
            if 'Item' in role_response:
                role = role_response['Item']
                print(f"  → Assigned to role: {role.get('name')}")
                print(f"     Context Length: {role.get('context_length', 'Not set')}")
    
    print("\n" + "=" * 60)
    print("COMPLETE!")
    print("=" * 60)
    print("\nUsers should now see context length indicators in their chats.")

if __name__ == "__main__":
    try:
        fix_user_role_fields()
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

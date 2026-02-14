"""
Script to clean up duplicate User role with undefined ID
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def cleanup_duplicate_role():
    """Remove the User role with undefined ID"""
    db = get_dynamodb()
    roles_table = db.get_table(settings.ROLES_TABLE)
    users_table = db.get_table(settings.USERS_TABLE)
    
    print("\nChecking for duplicate User roles...")
    print("=" * 60)
    
    # Get all roles
    response = roles_table.scan()
    roles = response.get('Items', [])
    
    # Find roles with undefined ID
    undefined_roles = [r for r in roles if r.get('id') == 'undefined']
    valid_roles = [r for r in roles if r.get('id') != 'undefined']
    
    if not undefined_roles:
        print("\n✓ No roles with undefined ID found. Database is clean!")
        return
    
    print(f"\nFound {len(undefined_roles)} role(s) with undefined ID:")
    for role in undefined_roles:
        print(f"  - {role.get('name')} (ID: {role.get('id')})")
    
    print(f"\nFound {len(valid_roles)} valid role(s):")
    for role in valid_roles:
        print(f"  - {role.get('name')} (ID: {role.get('id')})")
    
    # Check if any users are using the undefined role
    print("\nChecking if any users are assigned to the undefined role...")
    users_response = users_table.scan()
    users = users_response.get('Items', [])
    
    users_with_undefined_role = [u for u in users if u.get('custom_role') == 'undefined']
    
    if users_with_undefined_role:
        print(f"\n⚠ WARNING: {len(users_with_undefined_role)} user(s) are assigned to the undefined role:")
        for user in users_with_undefined_role:
            print(f"  - {user.get('email')} (ID: {user.get('id')})")
        
        # Find a valid User role to migrate to
        valid_user_role = next((r for r in valid_roles if r.get('name') == 'User'), None)
        
        if valid_user_role:
            print(f"\nMigrating users to valid User role (ID: {valid_user_role['id']})...")
            
            for user in users_with_undefined_role:
                users_table.update_item(
                    Key={'id': user['id']},
                    UpdateExpression='SET custom_role = :role_id',
                    ExpressionAttributeValues={':role_id': valid_user_role['id']}
                )
                print(f"  ✓ Migrated {user.get('email')}")
        else:
            print("\n✗ ERROR: No valid User role found to migrate users to!")
            print("Please create a valid User role first, then run this script again.")
            return
    else:
        print("  ✓ No users are assigned to the undefined role")
    
    # Delete the undefined role
    print("\nDeleting role with undefined ID...")
    
    try:
        roles_table.delete_item(Key={'id': 'undefined'})
        print("  ✓ Successfully deleted role with undefined ID")
    except Exception as e:
        print(f"  ✗ Error deleting role: {e}")
        return
    
    # Verify deletion
    print("\nVerifying deletion...")
    response = roles_table.scan()
    remaining_roles = response.get('Items', [])
    undefined_remaining = [r for r in remaining_roles if r.get('id') == 'undefined']
    
    if undefined_remaining:
        print("  ✗ Role still exists in database!")
    else:
        print("  ✓ Role successfully removed from database")
    
    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE!")
    print("=" * 60)
    
    print(f"\nRemaining roles in database: {len(remaining_roles)}")
    for role in remaining_roles:
        print(f"  - {role.get('name')} (ID: {role.get('id')})")
    
    print("\nYou can now refresh the Admin Panel to see the updated roles list.")

if __name__ == "__main__":
    try:
        cleanup_duplicate_role()
    except Exception as e:
        print(f"\n✗ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

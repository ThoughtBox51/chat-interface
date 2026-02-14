"""
Script to check roles in DynamoDB
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def check_roles():
    """Check roles in database"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    response = table.scan()
    roles = response.get('Items', [])
    
    print(f"\nTotal roles in database: {len(roles)}")
    print("=" * 60)
    
    if roles:
        for role in roles:
            print(f"\nRole: {role.get('name')}")
            print(f"  ID: {role.get('id')}")
            print(f"  Description: {role.get('description', 'N/A')}")
            print(f"  Max Chats: {role.get('max_chats', 'Unlimited')}")
            print(f"  Max Tokens/Month: {role.get('max_tokens_per_month', 'Unlimited')}")
            print(f"  Context Length: {role.get('context_length', 'Not set')}")
            print(f"  Created: {role.get('created_at', 'N/A')}")
    else:
        print("\nNo roles found in database.")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_roles()

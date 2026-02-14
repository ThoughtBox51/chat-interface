"""
Migration script to add new fields to existing roles in DynamoDB
Run this once to update existing roles with the new limit fields
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def migrate_roles():
    """Add new limit fields to existing roles"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    # Get all roles
    response = table.scan()
    roles = response.get('Items', [])
    
    print(f"Found {len(roles)} roles to migrate")
    
    for role in roles:
        role_id = role['id']
        
        # Check if role already has the new fields
        if 'max_chats' in role and 'max_tokens_per_month' in role and 'context_length' in role:
            print(f"Role '{role['name']}' already migrated, skipping...")
            continue
        
        # Add new fields with default values
        update_expr = 'SET '
        expr_values = {}
        updates = []
        
        if 'max_chats' not in role:
            updates.append('max_chats = :max_chats')
            expr_values[':max_chats'] = None  # None means unlimited
        
        if 'max_tokens_per_month' not in role:
            updates.append('max_tokens_per_month = :max_tokens')
            expr_values[':max_tokens'] = None  # None means unlimited
        
        if 'context_length' not in role:
            updates.append('context_length = :context_length')
            expr_values[':context_length'] = 4096  # Default context length
        
        if updates:
            update_expr += ', '.join(updates)
            
            table.update_item(
                Key={'id': role_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values
            )
            
            print(f"✓ Migrated role: {role['name']}")
        else:
            print(f"Role '{role['name']}' already has all fields")
    
    print("\nMigration completed!")

if __name__ == "__main__":
    migrate_roles()

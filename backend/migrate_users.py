"""
Migration script to add token tracking fields to existing users in DynamoDB
Run this once to update existing users with the new token tracking fields
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_dynamodb
from app.core.config import settings

def migrate_users():
    """Add token tracking fields to existing users"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    # Get all users
    response = table.scan()
    users = response.get('Items', [])
    
    print(f"Found {len(users)} users to migrate")
    
    for user in users:
        user_id = user['id']
        
        # Check if user already has the new fields
        if 'tokens_used_this_month' in user and 'token_usage_reset_date' in user:
            print(f"User '{user['email']}' already migrated, skipping...")
            continue
        
        # Add new fields with default values
        update_expr = 'SET '
        expr_values = {}
        updates = []
        
        if 'tokens_used_this_month' not in user:
            updates.append('tokens_used_this_month = :tokens')
            expr_values[':tokens'] = 0
        
        if 'token_usage_reset_date' not in user:
            from datetime import datetime
            updates.append('token_usage_reset_date = :reset_date')
            expr_values[':reset_date'] = datetime.utcnow().isoformat()
        
        if updates:
            update_expr += ', '.join(updates)
            
            table.update_item(
                Key={'id': user_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values
            )
            
            print(f"✓ Migrated user: {user['email']}")
        else:
            print(f"User '{user['email']}' already has all fields")
    
    print("\nMigration completed!")

if __name__ == "__main__":
    migrate_users()

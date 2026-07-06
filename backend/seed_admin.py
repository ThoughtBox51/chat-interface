"""
Non-interactive admin seeding script for production.
Usage: python seed_admin.py --email admin@example.com --password yourpassword --name "Admin Name"
"""
import boto3
import uuid
import argparse
from datetime import datetime
from app.core.security import get_password_hash
from app.core.config import settings

def seed_admin(email: str, password: str, name: str):
    session = boto3.Session(
        profile_name=settings.AWS_PROFILE if settings.AWS_PROFILE else None,
        region_name=settings.AWS_REGION
    )

    kwargs = {'region_name': settings.AWS_REGION}
    if settings.DYNAMODB_ENDPOINT_URL:
        kwargs['endpoint_url'] = settings.DYNAMODB_ENDPOINT_URL

    dynamodb = session.resource('dynamodb', **kwargs)
    table = dynamodb.Table(settings.USERS_TABLE)

    # Check if already exists
    response = table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :e',
        ExpressionAttributeValues={':e': email}
    )

    if response.get('Items'):
        user = response['Items'][0]
        table.update_item(
            Key={'id': user['id']},
            UpdateExpression='SET #r = :r, #s = :s, updated_at = :u',
            ExpressionAttributeNames={'#r': 'role', '#s': 'status'},
            ExpressionAttributeValues={
                ':r': 'admin', ':s': 'active',
                ':u': datetime.utcnow().isoformat()
            }
        )
        print(f"Updated existing user {email} to admin.")
    else:
        item = {
            'id': str(uuid.uuid4()),
            'email': email,
            'name': name,
            'hashed_password': get_password_hash(password),
            'role': 'admin',
            'status': 'active',
            'bio': '',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        table.put_item(Item=item)
        print(f"Admin user created! ID: {item['id']}")
        print(f"Email: {email}")
        print(f"Table: {settings.USERS_TABLE} ({settings.AWS_REGION})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--name', required=True)
    args = parser.parse_args()
    seed_admin(args.email, args.password, args.name)

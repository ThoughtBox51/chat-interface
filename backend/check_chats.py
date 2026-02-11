import boto3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get AWS configuration
aws_profile = os.getenv('AWS_PROFILE', 'Venkatesh')
aws_region = os.getenv('AWS_REGION', 'us-east-1')

# Create session with profile
session = boto3.Session(profile_name=aws_profile, region_name=aws_region)
dynamodb = session.resource('dynamodb')

# Get the chats table
table = dynamodb.Table('chat_app_chats')

# Scan all chats
response = table.scan()
chats = response.get('Items', [])

print(f"\n{'='*80}")
print(f"Total chats in database: {len(chats)}")
print(f"{'='*80}\n")

# Display each chat
for i, chat in enumerate(chats, 1):
    print(f"Chat {i}:")
    print(f"  ID: {chat.get('id')}")
    print(f"  Title: {chat.get('title')}")
    print(f"  User ID: {chat.get('user_id')}")
    print(f"  Created: {chat.get('created_at')}")
    print(f"  Messages: {len(chat.get('messages', []))}")
    print(f"  Pinned: {chat.get('pinned', False)}")
    
    # Show first few messages if any
    messages = chat.get('messages', [])
    if messages:
        print(f"  First message: {messages[0].get('content', '')[:50]}...")
        if len(messages) > 1:
            print(f"  Last message: {messages[-1].get('content', '')[:50]}...")
    
    print()

print(f"{'='*80}")

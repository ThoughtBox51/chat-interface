import aioboto3
import boto3
from app.core.config import settings

class DynamoDB:
    session = None
    boto_session = None
    
    def __init__(self):
        # Create boto3 session first to get credentials
        if settings.AWS_PROFILE:
            self.boto_session = boto3.Session(profile_name=settings.AWS_PROFILE)
            credentials = self.boto_session.get_credentials()
            self.session = aioboto3.Session(
                aws_access_key_id=credentials.access_key,
                aws_secret_access_key=credentials.secret_key,
                aws_session_token=credentials.token,
                region_name=settings.AWS_REGION
            )
        elif settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.session = aioboto3.Session(
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
        else:
            # Use default credentials
            self.session = aioboto3.Session(region_name=settings.AWS_REGION)
    
    def get_resource(self):
        kwargs = {}
        if settings.DYNAMODB_ENDPOINT_URL:
            kwargs['endpoint_url'] = settings.DYNAMODB_ENDPOINT_URL
        return self.session.resource('dynamodb', **kwargs)

db = DynamoDB()

async def init_dynamodb():
    """Initialize DynamoDB - tables should already exist in AWS"""
    # Skip table creation if not using local DynamoDB
    if not settings.DYNAMODB_ENDPOINT_URL:
        print("Using AWS DynamoDB - tables should already exist")
        print(f"Region: {settings.AWS_REGION}")
        if settings.AWS_PROFILE:
            print(f"Profile: {settings.AWS_PROFILE}")
        return
    
    # Only create tables for local DynamoDB
    print("Initializing local DynamoDB tables...")
    async with db.get_resource() as dynamodb:
        try:
            # Create Users table
            await dynamodb.create_table(
                TableName=settings.USERS_TABLE,
                KeySchema=[
                    {'AttributeName': 'id', 'KeyType': 'HASH'}
                ],
                AttributeDefinitions=[
                    {'AttributeName': 'id', 'AttributeType': 'S'},
                    {'AttributeName': 'email', 'AttributeType': 'S'},
                    {'AttributeName': 'status', 'AttributeType': 'S'}
                ],
                GlobalSecondaryIndexes=[
                    {
                        'IndexName': 'email-index',
                        'KeySchema': [{'AttributeName': 'email', 'KeyType': 'HASH'}],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                    },
                    {
                        'IndexName': 'status-index',
                        'KeySchema': [{'AttributeName': 'status', 'KeyType': 'HASH'}],
                        'Projection': {'ProjectionType': 'ALL'},
                        'ProvisionedThroughput': {'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}
                    }
                ],
                BillingMode='PAY_PER_REQUEST'
            )
            print(f"Created table: {settings.USERS_TABLE}")
        except Exception as e:
            if 'ResourceInUseException' not in str(e):
                print(f"Error creating users table: {e}")
        
        # Create other tables
        for table_name in [settings.MODELS_TABLE, settings.ROLES_TABLE, settings.CHATS_TABLE]:
            try:
                await dynamodb.create_table(
                    TableName=table_name,
                    KeySchema=[
                        {'AttributeName': 'id', 'KeyType': 'HASH'}
                    ],
                    AttributeDefinitions=[
                        {'AttributeName': 'id', 'AttributeType': 'S'}
                    ],
                    BillingMode='PAY_PER_REQUEST'
                )
                print(f"Created table: {table_name}")
            except Exception as e:
                if 'ResourceInUseException' not in str(e):
                    print(f"Error creating {table_name}: {e}")

async def close_dynamodb():
    """Cleanup DynamoDB connection"""
    print("DynamoDB session closed")

def get_dynamodb():
    return db

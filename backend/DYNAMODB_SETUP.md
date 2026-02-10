# DynamoDB Setup Guide

## Option 1: AWS DynamoDB (Production)

### Prerequisites
- AWS Account
- AWS CLI installed (optional but recommended)

### Setup Steps

1. **Create AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/
   - Sign up for free tier (12 months free)

2. **Create IAM User with DynamoDB Access**
   - Go to AWS Console → IAM
   - Create new user
   - Attach policy: `AmazonDynamoDBFullAccess`
   - Save Access Key ID and Secret Access Key

3. **Update backend/.env**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   DYNAMODB_ENDPOINT_URL=
   ```

4. **Run Backend**
   ```bash
   cd backend
   venv\Scripts\activate
   python run.py
   ```
   
   Tables will be created automatically on first run!

### AWS Free Tier Limits
- 25 GB of storage
- 25 read/write capacity units
- Enough for development and small apps

## Option 2: Local DynamoDB (Development)

### Setup Local DynamoDB

1. **Download DynamoDB Local**
   ```bash
   # Using Docker (easiest)
   docker run -p 8000:8000 amazon/dynamodb-local
   
   # Or download JAR file
   # https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
   ```

2. **Update backend/.env**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=dummy
   AWS_SECRET_ACCESS_KEY=dummy
   DYNAMODB_ENDPOINT_URL=http://localhost:8000
   ```

3. **Run Backend**
   ```bash
   cd backend
   venv\Scripts\activate
   python run.py
   ```

### Using Docker Compose (Recommended for Local)

Create `docker-compose.yml` in backend folder:
```yaml
version: '3.8'
services:
  dynamodb-local:
    image: amazon/dynamodb-local
    ports:
      - "8000:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb"
```

Run: `docker-compose up -d`

## Option 3: DynamoDB on LocalStack (Full AWS Simulation)

```bash
# Install LocalStack
pip install localstack

# Start LocalStack
localstack start

# Update .env
DYNAMODB_ENDPOINT_URL=http://localhost:4566
```

## Verify Setup

1. **Start Backend**
   ```bash
   python run.py
   ```

2. **Check Swagger**
   - Go to http://localhost:5000/docs
   - Try the `/health` endpoint
   - Should show: `{"status": "ok", "database": "DynamoDB"}`

3. **Test Registration**
   - Use Swagger UI to register a user
   - Check DynamoDB tables were created

## AWS CLI Commands (Optional)

### List Tables
```bash
aws dynamodb list-tables --region us-east-1
```

### Describe Table
```bash
aws dynamodb describe-table --table-name chat_app_users --region us-east-1
```

### Scan Table
```bash
aws dynamodb scan --table-name chat_app_users --region us-east-1
```

## Cost Estimation

### AWS DynamoDB
- **Free Tier**: 25 GB storage, 25 WCU, 25 RCU
- **After Free Tier**: ~$1-5/month for small apps
- **On-Demand Pricing**: Pay per request (good for variable traffic)

### Recommendation
- **Development**: Use Local DynamoDB or LocalStack
- **Production**: Use AWS DynamoDB with On-Demand billing

## Troubleshooting

### "Unable to locate credentials"
- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env
- For local DynamoDB, use dummy values

### "ResourceNotFoundException"
- Tables are created automatically on first run
- Check logs for table creation errors

### Connection timeout
- Check DYNAMODB_ENDPOINT_URL
- For AWS: leave empty
- For local: http://localhost:8000

## Next Steps

1. Choose your option (AWS or Local)
2. Update .env file
3. Install new dependencies: `pip install -r requirements.txt`
4. Run backend: `python run.py`
5. Visit Swagger: http://localhost:5000/docs

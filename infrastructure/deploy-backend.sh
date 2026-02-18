#!/bin/bash
set -e

echo "========================================="
echo "Backend Deployment Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AWS_PROFILE="Venkatesh"
AWS_REGION="eu-west-1"

# Check if deployment-outputs.json exists
if [ ! -f "deployment-outputs.json" ]; then
    echo -e "${RED}❌ deployment-outputs.json not found${NC}"
    echo "Please run infrastructure deployment first: ./infrastructure/deploy.sh"
    exit 1
fi

# Extract values from deployment outputs
INSTANCE_ID=$(jq -r '.[] | select(.OutputKey=="BackendInstanceId") | .OutputValue' deployment-outputs.json)
USERS_TABLE=$(jq -r '.[] | select(.OutputKey=="UsersTableName") | .OutputValue' deployment-outputs.json)
CHATS_TABLE=$(jq -r '.[] | select(.OutputKey=="ChatsTableName") | .OutputValue' deployment-outputs.json)
MODELS_TABLE=$(jq -r '.[] | select(.OutputKey=="ModelsTableName") | .OutputValue' deployment-outputs.json)
ROLES_TABLE=$(jq -r '.[] | select(.OutputKey=="RolesTableName") | .OutputValue' deployment-outputs.json)

echo "Backend Instance: ${INSTANCE_ID}"
echo "DynamoDB Tables:"
echo "  - Users: ${USERS_TABLE}"
echo "  - Chats: ${CHATS_TABLE}"
echo "  - Models: ${MODELS_TABLE}"
echo "  - Roles: ${ROLES_TABLE}"
echo ""

# Prompt for secrets
read -p "Enter SECRET_KEY (or press Enter to generate): " SECRET_KEY
if [ -z "$SECRET_KEY" ]; then
    SECRET_KEY=$(openssl rand -hex 32)
    echo "Generated SECRET_KEY: ${SECRET_KEY}"
fi

read -p "Enter OPENAI_API_KEY: " OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ OPENAI_API_KEY is required${NC}"
    exit 1
fi

echo ""
echo "Creating deployment package..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Temp directory: ${TEMP_DIR}"

# Copy backend files
cp -r backend/* ${TEMP_DIR}/

# Create .env file
cat > ${TEMP_DIR}/.env << EOF
AWS_REGION=eu-west-1
AWS_DEFAULT_REGION=eu-west-1
DYNAMODB_USERS_TABLE=${USERS_TABLE}
DYNAMODB_CHATS_TABLE=${CHATS_TABLE}
DYNAMODB_MODELS_TABLE=${MODELS_TABLE}
DYNAMODB_ROLES_TABLE=${ROLES_TABLE}
SECRET_KEY=${SECRET_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
CORS_ORIGINS=*
EOF

# Create deployment script
cat > ${TEMP_DIR}/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

echo "Installing dependencies..."
cd /opt/chatinterface/backend
pip3.11 install -r requirements.txt

echo "Restarting service..."
sudo systemctl restart chatinterface

echo "Checking service status..."
sudo systemctl status chatinterface --no-pager

echo "Backend deployment complete!"
DEPLOY_SCRIPT

chmod +x ${TEMP_DIR}/deploy.sh

# Create tarball
cd ${TEMP_DIR}
tar -czf /tmp/backend-deploy.tar.gz .
cd -

echo -e "${GREEN}✅ Deployment package created${NC}"
echo ""

# Upload to EC2 via S3 (temporary bucket)
echo "Uploading deployment package..."
DEPLOY_BUCKET="chatinterface-deploy-$(date +%s)"
aws s3 mb s3://${DEPLOY_BUCKET} --region ${AWS_REGION} --profile ${AWS_PROFILE}
aws s3 cp /tmp/backend-deploy.tar.gz s3://${DEPLOY_BUCKET}/ --profile ${AWS_PROFILE}

echo -e "${GREEN}✅ Package uploaded${NC}"
echo ""

# Execute deployment on EC2
echo "Deploying to EC2 instance..."
aws ssm send-command \
    --profile ${AWS_PROFILE} \
    --instance-ids ${INSTANCE_ID} \
    --document-name "AWS-RunShellScript" \
    --parameters commands=[
        "sudo mkdir -p /opt/chatinterface/backend",
        "cd /opt/chatinterface/backend",
        "aws s3 cp s3://${DEPLOY_BUCKET}/backend-deploy.tar.gz .",
        "tar -xzf backend-deploy.tar.gz",
        "chmod +x deploy.sh",
        "./deploy.sh"
    ] \
    --region ${AWS_REGION}

echo -e "${GREEN}✅ Deployment command sent${NC}"
echo ""

# Cleanup
echo "Cleaning up..."
aws s3 rm s3://${DEPLOY_BUCKET}/backend-deploy.tar.gz --profile ${AWS_PROFILE}
aws s3 rb s3://${DEPLOY_BUCKET} --profile ${AWS_PROFILE}
rm -rf ${TEMP_DIR}
rm /tmp/backend-deploy.tar.gz

echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

echo "========================================="
echo "Backend Deployment Complete!"
echo "========================================="
echo ""
echo "To check deployment status:"
echo "aws ssm start-session --target ${INSTANCE_ID} --region ${AWS_REGION} --profile ${AWS_PROFILE}"
echo ""
echo "Then run:"
echo "sudo journalctl -u chatinterface -f"
echo ""

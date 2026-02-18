#!/bin/bash
set -e

echo "========================================="
echo "ChatInterface MVP Deployment Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_PROFILE="Venkatesh"
AWS_REGION="eu-west-1"
STACK_NAME="ChatInterfaceStack"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install it first.${NC}"
    exit 1
fi

if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK not found. Installing...${NC}"
    npm install -g aws-cdk
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Get AWS account info
echo "Getting AWS account information..."
AWS_ACCOUNT=$(aws sts get-caller-identity --profile ${AWS_PROFILE} --query Account --output text)
AWS_USER=$(aws sts get-caller-identity --profile ${AWS_PROFILE} --query Arn --output text)

echo -e "${GREEN}AWS Profile: ${AWS_PROFILE}${NC}"
echo -e "${GREEN}AWS Account: ${AWS_ACCOUNT}${NC}"
echo -e "${GREEN}AWS User: ${AWS_USER}${NC}"
echo -e "${GREEN}AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}Domain: chatgenie.thought-box.in${NC}"
echo ""

# Confirm deployment
read -p "Do you want to proceed with deployment? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

# Navigate to CDK directory
cd infrastructure/cdk

# Install dependencies
echo ""
echo "Installing CDK dependencies..."
npm install

# Bootstrap CDK (if not already done)
echo ""
echo "Bootstrapping CDK (if needed)..."
cdk bootstrap aws://${AWS_ACCOUNT}/${AWS_REGION} --profile ${AWS_PROFILE} || true

# Synthesize CloudFormation template
echo ""
echo "Synthesizing CloudFormation template..."
cdk synth --profile ${AWS_PROFILE}

# Show diff
echo ""
echo "Showing changes to be deployed..."
cdk diff --profile ${AWS_PROFILE} || true

# Deploy stack
echo ""
echo "Deploying infrastructure stack..."
cdk deploy --require-approval never --profile ${AWS_PROFILE}

# Get stack outputs
echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --profile ${AWS_PROFILE} \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Save outputs to file
echo ""
echo "Saving outputs to deployment-outputs.json..."
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --profile ${AWS_PROFILE} \
    --query 'Stacks[0].Outputs' \
    > ../../deployment-outputs.json

echo -e "${GREEN}✅ Outputs saved to deployment-outputs.json${NC}"

# Next steps
echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Deploy Backend Code:"
echo "   - SSH into EC2 instance using Session Manager"
echo "   - Clone repository and install dependencies"
echo "   - Configure environment variables"
echo "   - Start the backend service"
echo ""
echo "2. Deploy Frontend:"
echo "   - Build React app: npm run build"
echo "   - Upload to S3 bucket"
echo "   - Invalidate CloudFront cache"
echo ""
echo "3. Initialize Database:"
echo "   - Run create_admin.py to create admin user"
echo "   - Run test_setup.py to add initial models"
echo ""
echo "See infrastructure/cdk/README.md for detailed instructions."
echo ""

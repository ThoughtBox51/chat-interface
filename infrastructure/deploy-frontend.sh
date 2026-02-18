#!/bin/bash
set -e

echo "========================================="
echo "Frontend Deployment Script"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
AWS_PROFILE="Venkatesh"

# Check if deployment-outputs.json exists
if [ ! -f "deployment-outputs.json" ]; then
    echo -e "${RED}❌ deployment-outputs.json not found${NC}"
    echo "Please run infrastructure deployment first: ./infrastructure/deploy.sh"
    exit 1
fi

# Extract values from deployment outputs
BUCKET_NAME=$(jq -r '.[] | select(.OutputKey=="FrontendBucketName") | .OutputValue' deployment-outputs.json)
DISTRIBUTION_ID=$(jq -r '.[] | select(.OutputKey=="CloudFrontDistributionId") | .OutputValue' deployment-outputs.json)
APP_URL=$(jq -r '.[] | select(.OutputKey=="ApplicationUrl") | .OutputValue' deployment-outputs.json)

echo "Frontend Bucket: ${BUCKET_NAME}"
echo "CloudFront Distribution: ${DISTRIBUTION_ID}"
echo "Application URL: ${APP_URL}"
echo ""

# Update API base URL in frontend config
echo "Updating frontend configuration..."
cat > src/config.js << EOF
export const API_BASE_URL = '${APP_URL}/api';
EOF

echo -e "${GREEN}✅ Frontend config updated${NC}"
echo ""

# Build frontend
echo "Building React application..."
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Upload to S3
echo "Uploading files to S3..."

# Upload all files except index.html with long cache
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
    --profile ${AWS_PROFILE} \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --delete

# Upload index.html with no-cache
aws s3 cp dist/index.html s3://${BUCKET_NAME}/ \
    --profile ${AWS_PROFILE} \
    --cache-control "no-cache"

echo -e "${GREEN}✅ Files uploaded to S3${NC}"
echo ""

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --profile ${AWS_PROFILE} \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "Invalidation ID: ${INVALIDATION_ID}"
echo -e "${GREEN}✅ CloudFront cache invalidated${NC}"
echo ""

# Wait for invalidation to complete (optional)
read -p "Wait for invalidation to complete? (yes/no): " WAIT
if [ "$WAIT" == "yes" ]; then
    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --profile ${AWS_PROFILE} \
        --distribution-id ${DISTRIBUTION_ID} \
        --id ${INVALIDATION_ID}
    echo -e "${GREEN}✅ Invalidation complete${NC}"
fi

echo ""
echo "========================================="
echo "Frontend Deployment Complete!"
echo "========================================="
echo ""
echo "Your application is available at:"
echo -e "${GREEN}${APP_URL}${NC}"
echo ""

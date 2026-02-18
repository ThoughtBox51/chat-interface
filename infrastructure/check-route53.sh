#!/bin/bash

# Script to check existing Route53 records for thought-box.in domain

echo "========================================="
echo "Route53 Records Check"
echo "========================================="
echo ""

AWS_PROFILE="Venkatesh"
DOMAIN="thought-box.in"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    echo ""
    echo "Installation:"
    echo "  Windows: https://aws.amazon.com/cli/"
    echo "  Or use: winget install Amazon.AWSCLI"
    exit 1
fi

echo "Checking Route53 hosted zones..."
echo ""

# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
    --profile ${AWS_PROFILE} \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
    --output text)

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo "❌ Hosted zone for ${DOMAIN} not found"
    echo ""
    echo "Available hosted zones:"
    aws route53 list-hosted-zones \
        --profile ${AWS_PROFILE} \
        --query "HostedZones[*].[Name,Id]" \
        --output table
    exit 1
fi

echo "✅ Found hosted zone: ${HOSTED_ZONE_ID}"
echo ""

# List all records
echo "Existing DNS records for ${DOMAIN}:"
echo "========================================="
aws route53 list-resource-record-sets \
    --hosted-zone-id ${HOSTED_ZONE_ID} \
    --profile ${AWS_PROFILE} \
    --output table

echo ""
echo "========================================="
echo "Checking for chatgenie subdomain..."
echo ""

# Check if chatgenie.thought-box.in already exists
CHATGENIE_RECORD=$(aws route53 list-resource-record-sets \
    --hosted-zone-id ${HOSTED_ZONE_ID} \
    --profile ${AWS_PROFILE} \
    --query "ResourceRecordSets[?Name=='chatgenie.${DOMAIN}.']" \
    --output json)

if [ "$CHATGENIE_RECORD" != "[]" ]; then
    echo "⚠️  chatgenie.${DOMAIN} already exists:"
    echo "$CHATGENIE_RECORD" | jq '.'
    echo ""
    echo "You may need to delete this record before CDK deployment."
else
    echo "✅ chatgenie.${DOMAIN} is available (no existing record)"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Domain: ${DOMAIN}"
echo "Hosted Zone ID: ${HOSTED_ZONE_ID}"
echo "CDK will create: chatgenie.${DOMAIN} → CloudFront"
echo ""

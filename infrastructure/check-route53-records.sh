#!/bin/bash

echo "========================================="
echo "Route53 Records Check"
echo "========================================="
echo ""

AWS_PROFILE="Venkatesh"
DOMAIN="thought-box.in"

# Get hosted zone ID
echo "Finding hosted zone for ${DOMAIN}..."
ZONE_ID=$(aws route53 list-hosted-zones \
    --profile ${AWS_PROFILE} \
    --query "HostedZones[?Name=='${DOMAIN}.'].Id" \
    --output text | cut -d'/' -f3)

if [ -z "$ZONE_ID" ]; then
    echo "❌ Hosted zone for ${DOMAIN} not found"
    echo ""
    echo "Available hosted zones:"
    aws route53 list-hosted-zones \
        --profile ${AWS_PROFILE} \
        --query "HostedZones[*].[Name,Id,ResourceRecordSetCount]" \
        --output table
    exit 1
fi

echo "✅ Found hosted zone: ${ZONE_ID}"
echo ""

# List all records
echo "========================================="
echo "All DNS Records in ${DOMAIN}"
echo "========================================="
echo ""

aws route53 list-resource-record-sets \
    --hosted-zone-id ${ZONE_ID} \
    --profile ${AWS_PROFILE} \
    --output table

echo ""
echo "========================================="
echo "Checking for chatgenie subdomain..."
echo "========================================="
echo ""

# Check if chatgenie.thought-box.in exists
CHATGENIE_RECORD=$(aws route53 list-resource-record-sets \
    --hosted-zone-id ${ZONE_ID} \
    --profile ${AWS_PROFILE} \
    --query "ResourceRecordSets[?Name=='chatgenie.${DOMAIN}.']" \
    --output json)

if [ "$CHATGENIE_RECORD" == "[]" ]; then
    echo "✅ chatgenie.${DOMAIN} does NOT exist - safe to create"
else
    echo "⚠️  chatgenie.${DOMAIN} already exists:"
    echo "$CHATGENIE_RECORD" | jq '.'
    echo ""
    echo "You may need to delete this record before CDK deployment"
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Hosted Zone ID: ${ZONE_ID}"
echo "Domain: ${DOMAIN}"
echo "Profile: ${AWS_PROFILE}"
echo ""

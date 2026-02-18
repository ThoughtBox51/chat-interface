# PowerShell script to check Route53 records

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Route53 Records Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$AWS_PROFILE = "Venkatesh"
$DOMAIN = "thought-box.in"

# Get hosted zone ID
Write-Host "Finding hosted zone for $DOMAIN..." -ForegroundColor Yellow

try {
    $zones = aws route53 list-hosted-zones --profile $AWS_PROFILE --output json | ConvertFrom-Json
    $zone = $zones.HostedZones | Where-Object { $_.Name -eq "$DOMAIN." }
    
    if (-not $zone) {
        Write-Host "❌ Hosted zone for $DOMAIN not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available hosted zones:" -ForegroundColor Yellow
        $zones.HostedZones | Format-Table Name, Id, ResourceRecordSetCount
        exit 1
    }
    
    $ZONE_ID = $zone.Id.Split('/')[-1]
    Write-Host "✅ Found hosted zone: $ZONE_ID" -ForegroundColor Green
    Write-Host ""
    
    # List all records
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "All DNS Records in $DOMAIN" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $records = aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID --profile $AWS_PROFILE --output json | ConvertFrom-Json
    $records.ResourceRecordSets | Format-Table Name, Type, TTL, @{Label="Value";Expression={$_.ResourceRecords.Value -join ", "}}
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Checking for chatgenie subdomain..." -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if chatgenie.thought-box.in exists
    $chatgenieRecord = $records.ResourceRecordSets | Where-Object { $_.Name -eq "chatgenie.$DOMAIN." }
    
    if (-not $chatgenieRecord) {
        Write-Host "✅ chatgenie.$DOMAIN does NOT exist - safe to create" -ForegroundColor Green
    } else {
        Write-Host "⚠️  chatgenie.$DOMAIN already exists:" -ForegroundColor Yellow
        $chatgenieRecord | Format-List
        Write-Host ""
        Write-Host "You may need to delete this record before CDK deployment" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Summary" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Hosted Zone ID: $ZONE_ID" -ForegroundColor White
    Write-Host "Domain: $DOMAIN" -ForegroundColor White
    Write-Host "Profile: $AWS_PROFILE" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure AWS CLI is installed and profile 'Venkatesh' is configured" -ForegroundColor Yellow
}

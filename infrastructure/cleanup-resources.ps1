# Cleanup script for orphaned resources

$AWS_PROFILE = "Venkatesh"
$REGION = "eu-west-1"

Write-Host "Cleaning up orphaned resources..." -ForegroundColor Yellow
Write-Host ""

# Delete DynamoDB tables
Write-Host "Deleting DynamoDB tables..." -ForegroundColor Cyan

$tables = @(
    "chatinterface-users",
    "chatinterface-chats",
    "chatinterface-models",
    "chatinterface-roles"
)

foreach ($table in $tables) {
    Write-Host "  Deleting table: $table" -ForegroundColor White
    aws dynamodb delete-table --table-name $table --region $REGION --profile $AWS_PROFILE 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Deleted $table" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Table $table not found or already deleted" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Waiting for tables to be deleted..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Delete S3 bucket
Write-Host ""
Write-Host "Deleting S3 bucket..." -ForegroundColor Cyan
$BUCKET_NAME = "chatinterface-frontend-211125343522"

# Empty bucket first
Write-Host "  Emptying bucket: $BUCKET_NAME" -ForegroundColor White
aws s3 rm s3://$BUCKET_NAME --recursive --profile $AWS_PROFILE 2>$null

# Delete bucket
Write-Host "  Deleting bucket: $BUCKET_NAME" -ForegroundColor White
aws s3 rb s3://$BUCKET_NAME --profile $AWS_PROFILE 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Deleted $BUCKET_NAME" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Bucket $BUCKET_NAME not found or already deleted" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run deployment" -ForegroundColor Cyan
Write-Host ""

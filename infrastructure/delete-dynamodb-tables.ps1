# Delete DynamoDB tables for ChatGenie in eu-central-1
# Run this script to clean up existing tables before CDK deployment

$env:AWS_PROFILE = 'Venkatesh'
$region = 'eu-central-1'

$tables = @(
    'chatgenie-users',
    'chatgenie-chats',
    'chatgenie-models',
    'chatgenie-roles'
)

Write-Host "Deleting DynamoDB tables in region: $region" -ForegroundColor Yellow
Write-Host ""

foreach ($table in $tables) {
    Write-Host "Checking table: $table" -ForegroundColor Cyan
    
    try {
        # Check if table exists
        $tableInfo = aws dynamodb describe-table --table-name $table --region $region --profile Venkatesh 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Table exists. Deleting..." -ForegroundColor Yellow
            aws dynamodb delete-table --table-name $table --region $region --profile Venkatesh
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Delete initiated for $table" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed to delete $table" -ForegroundColor Red
            }
        } else {
            Write-Host "  Table does not exist (already deleted)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Table does not exist or error checking: $_" -ForegroundColor Gray
    }
    
    Write-Host ""
}

Write-Host "Waiting 10 seconds for deletions to process..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Verifying deletions..." -ForegroundColor Cyan
Write-Host ""

foreach ($table in $tables) {
    try {
        $tableInfo = aws dynamodb describe-table --table-name $table --region $region --profile Venkatesh 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $status = ($tableInfo | ConvertFrom-Json).Table.TableStatus
            Write-Host "  $table : $status" -ForegroundColor Yellow
        } else {
            Write-Host "  $table : DELETED ✓" -ForegroundColor Green
        }
    } catch {
        Write-Host "  $table : DELETED ✓" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done! You can now run CDK deploy." -ForegroundColor Green

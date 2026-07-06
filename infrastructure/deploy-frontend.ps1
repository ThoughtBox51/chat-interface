# Deploy frontend to S3 + invalidate CloudFront
# Usage: .\infrastructure\deploy-frontend.ps1
# Optional: .\infrastructure\deploy-frontend.ps1 -Profile myprofile

param(
    [string]$Profile = 'Venkatesh',
    [string]$Region = 'eu-central-1',
    [string]$BucketName = 'chatgenie-frontend-v2-211125343522',
    [string]$DistributionId = 'E123EDILX2779Y'
)

$ErrorActionPreference = 'Stop'

Write-Host "Building frontend..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed!" -ForegroundColor Red; exit 1 }

Write-Host "Syncing to S3..." -ForegroundColor Cyan
aws s3 sync dist/ s3://$BucketName --delete --exclude "deploys/*" --profile $Profile --region $Region
if ($LASTEXITCODE -ne 0) { Write-Host "S3 sync failed!" -ForegroundColor Red; exit 1 }

Write-Host "Invalidating CloudFront cache..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*" --profile $Profile
if ($LASTEXITCODE -ne 0) { Write-Host "CloudFront invalidation failed!" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "✅ Deployed to https://chatgenie.thought-box.in" -ForegroundColor Green

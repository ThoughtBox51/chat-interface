# Deploy backend to EC2 via SSM (no SSH key needed)
# Usage: .\infrastructure\deploy-backend.ps1

param(
    [string]$Profile = 'Venkatesh',
    [string]$Region = 'eu-central-1',
    [string]$InstanceId = 'i-031f8a4dbccb4326f',
    [string]$SecretKey = ''  # Pass a strong JWT secret key
)

$ErrorActionPreference = 'Stop'

if (-not $SecretKey) {
    # Generate a random secret key if not provided
    $SecretKey = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    Write-Host "Generated JWT Secret Key: $SecretKey" -ForegroundColor Yellow
    Write-Host "Save this somewhere safe!" -ForegroundColor Yellow
}

Write-Host "Packaging backend code..." -ForegroundColor Cyan

# Create a zip of the backend (excluding venv and __pycache__)
$ZipPath = "backend-deploy.zip"
if (Test-Path $ZipPath) { Remove-Item $ZipPath }

# Create zip excluding unnecessary files
$BackendFiles = Get-ChildItem -Path "backend" -Recurse | Where-Object {
    $_.FullName -notmatch '\\venv\\' -and
    $_.FullName -notmatch '__pycache__' -and
    $_.FullName -notmatch '\.pyc$' -and
    $_.FullName -notmatch '\\\.git\\'
}

Compress-Archive -Path "backend\*" -DestinationPath $ZipPath -Force -CompressionLevel Optimal

Write-Host "Uploading to S3..." -ForegroundColor Cyan
$BucketName = "chatgenie-frontend-v2-211125343522"
aws s3 cp $ZipPath s3://$BucketName/deploys/backend-latest.zip --profile $Profile --region $Region

Write-Host "Deploying to EC2 via SSM..." -ForegroundColor Cyan

$Commands = @"
#!/bin/bash
set -e

echo "=== Starting backend deployment ==="

# Install dependencies
yum update -y
yum install -y python3.11 python3.11-pip git unzip

# Create app directory
mkdir -p /opt/chatgenie
chown ec2-user:ec2-user /opt/chatgenie

# Download and extract backend
aws s3 cp s3://$BucketName/deploys/backend-latest.zip /tmp/backend-latest.zip --region $Region
unzip -o /tmp/backend-latest.zip -d /opt/chatgenie/
chown -R ec2-user:ec2-user /opt/chatgenie

# Install Python dependencies
python3.11 -m pip install -r /opt/chatgenie/requirements.txt

# Write production .env
cat > /opt/chatgenie/.env << 'ENVEOF'
PROJECT_NAME=ChatGenie API
VERSION=1.0.0
API_V1_STR=/api
DYNAMODB_ENDPOINT_URL=
AWS_REGION=eu-central-1
AWS_PROFILE=
USERS_TABLE=chatgenie-users
MODELS_TABLE=chatgenie-models
ROLES_TABLE=chatgenie-roles
CHATS_TABLE=chatgenie-chats
SECRET_KEY=$SecretKey
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["https://chatgenie.thought-box.in","https://d3eb97ez2hg88n.cloudfront.net"]
ENVEOF

chown ec2-user:ec2-user /opt/chatgenie/.env
chmod 600 /opt/chatgenie/.env

# Create/update systemd service
cat > /etc/systemd/system/chatgenie.service << 'SVCEOF'
[Unit]
Description=ChatGenie Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/chatgenie
EnvironmentFile=/opt/chatgenie/.env
Environment="AWS_DEFAULT_REGION=eu-central-1"
Environment="AWS_REGION=eu-central-1"
ExecStart=/usr/bin/python3.11 run.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# Enable and restart service
systemctl daemon-reload
systemctl enable chatgenie
systemctl restart chatgenie

sleep 3
systemctl status chatgenie --no-pager

echo "=== Deployment complete ==="
"@

$CommandJson = $Commands | ConvertTo-Json

$Result = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name "AWS-RunShellScript" `
    --parameters "commands=[$CommandJson]" `
    --profile $Profile `
    --region $Region `
    --output json | ConvertFrom-Json

$CommandId = $Result.Command.CommandId
Write-Host "SSM Command ID: $CommandId" -ForegroundColor Cyan
Write-Host "Waiting for deployment to complete..." -ForegroundColor Yellow

# Poll for result
$MaxWait = 60
$Waited = 0
do {
    Start-Sleep -Seconds 5
    $Waited += 5
    $Status = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $InstanceId `
        --profile $Profile `
        --region $Region `
        --query "Status" --output text 2>&1

    Write-Host "  Status: $Status ($Waited s)" -ForegroundColor Gray
} while ($Status -eq "InProgress" -and $Waited -lt ($MaxWait * 5))

if ($Status -eq "Success") {
    Write-Host ""
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
    Write-Host "API running at: https://api.chatgenie.thought-box.in" -ForegroundColor Green
    
    # Show output
    $Output = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $InstanceId `
        --profile $Profile `
        --region $Region `
        --query "StandardOutputContent" --output text
    Write-Host $Output
} else {
    Write-Host "Deployment status: $Status" -ForegroundColor Red
    $ErrOutput = aws ssm get-command-invocation `
        --command-id $CommandId `
        --instance-id $InstanceId `
        --profile $Profile `
        --region $Region `
        --query "StandardErrorContent" --output text
    Write-Host $ErrOutput -ForegroundColor Red
}

# Cleanup
Remove-Item $ZipPath -ErrorAction SilentlyContinue

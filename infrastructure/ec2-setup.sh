#!/bin/bash
set -e

BUCKET="chatgenie-frontend-v2-211125343522"
REGION="eu-central-1"
APP_DIR="/opt/chatgenie"
SECRET_KEY="6a8B/UWoLrCkFCiTwAGqiWZUzcMT+pz5bVyDYFPLSKw="

echo "=== ChatGenie Backend Deployment ==="

# Install dependencies
yum update -y
yum install -y python3.11 python3-pip git unzip

# Create app dir
mkdir -p $APP_DIR
chown ec2-user:ec2-user $APP_DIR

# Download backend zip
aws s3 cp s3://$BUCKET/deploys/backend-latest.zip /tmp/backend-latest.zip --region $REGION
unzip -o /tmp/backend-latest.zip -d $APP_DIR/
chown -R ec2-user:ec2-user $APP_DIR

# Install Python packages
python3.11 -m ensurepip --upgrade 2>/dev/null || true
python3.11 -m pip install --upgrade pip
python3.11 -m pip install -r $APP_DIR/requirements.txt

# Write .env
cat > $APP_DIR/.env << EOF
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
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["https://chatgenie.thought-box.in","https://d3eb97ez2hg88n.cloudfront.net"]
EOF

chown ec2-user:ec2-user $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Systemd service
cat > /etc/systemd/system/chatgenie.service << 'SVCEOF'
[Unit]
Description=ChatGenie Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/chatgenie
EnvironmentFile=/opt/chatgenie/.env
Environment=AWS_DEFAULT_REGION=eu-central-1
Environment=AWS_REGION=eu-central-1
ExecStart=/usr/bin/python3.11 run.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable chatgenie
systemctl restart chatgenie

sleep 3
systemctl status chatgenie --no-pager
echo "=== Deployment complete ==="

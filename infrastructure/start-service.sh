#!/bin/bash
set -e

APP_DIR="/opt/chatgenie"
SECRET_KEY="6a8B/UWoLrCkFCiTwAGqiWZUzcMT+pz5bVyDYFPLSKw="

# Overwrite .env with production values
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
echo "SERVICE STARTED"

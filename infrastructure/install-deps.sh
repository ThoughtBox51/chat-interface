#!/bin/bash
cd /opt/chatgenie
python3.11 -m pip install --upgrade pip --no-color --progress-bar off
python3.11 -m pip install -r requirements.txt --no-color --progress-bar off
echo "=== INSTALL RESULT: $? ==="
python3.11 -m pip show fastapi uvicorn boto3 | grep -E "^Name|^Version"
echo "=== PACKAGES DONE ==="

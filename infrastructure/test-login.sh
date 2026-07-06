#!/bin/bash
# Test login endpoint
echo "=== Testing login ==="
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"thoughtbox51@gmail.com","password":"admin123"}' \
  2>&1
echo ""
echo "=== Testing CORS ==="
curl -s -X OPTIONS http://localhost:5000/api/auth/login \
  -H "Origin: https://chatgenie.thought-box.in" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I 2>&1 | head -20
echo ""
echo "=== Check BACKEND_CORS_ORIGINS in env ==="
grep BACKEND_CORS /opt/chatgenie/.env

#!/bin/bash
# Remove AWS_PROFILE line from .env (empty profile causes ProfileNotFound error)
sed -i '/^AWS_PROFILE/d' /opt/chatgenie/.env
echo "AWS_PROFILE removed, current .env AWS settings:"
grep "AWS_" /opt/chatgenie/.env

systemctl restart chatgenie
sleep 5
systemctl is-active chatgenie
journalctl -u chatgenie --no-pager -n 10

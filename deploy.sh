#!/bin/bash
# Deploy script - Sunucuya gönderirken .env.local'i korur

echo "=== Deploying to Server ==="

# Sunucuya rsync (env.local hariç)
sshpass -p 'KCILpMCVubZf4PMO' rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env.local' \
  -e "ssh -o StrictHostKeyChecking=no -p 43891" \
  ./ root@46.224.32.229:/var/www/canlimenu/

echo ""
echo "=== Building on Server ==="

# Sunucuda build ve restart
sshpass -p 'KCILpMCVubZf4PMO' ssh -o StrictHostKeyChecking=no -p 43891 root@46.224.32.229 "
cd /var/www/canlimenu && \
npm install && \
npm run build && \
pm2 restart canlimenu
"

echo ""
echo "=== Deploy Complete! ==="
echo "Site: https://canlimenu.com"

#!/bin/bash

echo "======================================"
echo "🔧 FIXING API CONNECTION"
echo "======================================"
echo ""

# Step 1: Check if backend is actually running
echo "Step 1: Checking backend status..."
echo "-----------------------------------"
if pm2 list | grep -q "backend.*online"; then
    echo "✅ Backend is running in PM2"
else
    echo "❌ Backend is NOT running"
    echo "Starting backend..."
    cd /var/app/transcription-system/transcription-system/backend
    pm2 start dist/server.js --name backend
fi

# Step 2: Test backend directly
echo ""
echo "Step 2: Testing backend API directly..."
echo "---------------------------------------"
echo "Testing localhost:5000:"
curl -s http://localhost:5000/api/health && echo " ✅ API responds on localhost" || echo " ❌ API not responding on localhost"

echo ""
echo "Testing through domain:"
curl -s http://yalitranscription.duckdns.org/api/health && echo " ✅ API responds through domain" || echo " ❌ API not responding through domain"

# Step 3: Check Nginx configuration
echo ""
echo "Step 3: Checking Nginx..."
echo "-------------------------"
if nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx config is valid"
else
    echo "❌ Nginx config has errors"
fi

# Step 4: Fix CORS in backend
echo ""
echo "Step 4: Fixing CORS..."
echo "----------------------"
cd /var/app/transcription-system/transcription-system/backend

# Create a simple test endpoint
cat > test-cors.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for all origins (temporary for testing)
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// Test endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Test POST endpoint for registration
app.post('/api/auth/register', (req, res) => {
    console.log('Register request received:', req.body);
    res.json({ 
        success: true, 
        message: 'Test response - DB not connected',
        data: req.body 
    });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running on port ${PORT}`);
});
EOF

# Stop backend and run test server
echo "Starting test server with open CORS..."
pm2 stop backend
pm2 start test-cors.js --name test-backend

sleep 5

# Step 5: Test again
echo ""
echo "Step 5: Testing with new CORS settings..."
echo "-----------------------------------------"
curl -s http://localhost:5000/api/health && echo " ✅ Test server working" || echo " ❌ Test server not working"

echo ""
echo "======================================"
echo "📋 DIAGNOSTIC RESULTS"
echo "======================================"
echo ""
echo "Ports listening:"
netstat -tulpn | grep -E "3002|5000" || echo "No ports found"

echo ""
echo "PM2 Status:"
pm2 status

echo ""
echo "======================================"
echo "🔍 WHAT TO DO NEXT:"
echo "======================================"
echo ""
echo "1. Open browser console (F12)"
echo "2. Go to: http://yalitranscription.duckdns.org/licenses"
echo "3. Try to register/purchase"
echo "4. Check Network tab in browser for failed requests"
echo "5. Tell me:"
echo "   - What URL is it trying to reach?"
echo "   - What error do you see?"
echo ""
echo "Also check backend logs:"
echo "pm2 logs test-backend"
echo ""
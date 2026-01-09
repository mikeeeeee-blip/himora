const axios = require('axios');

/**
 * Get ngrok public URL from ngrok API
 * Ngrok runs on localhost:4040 by default
 */
async function getNgrokUrl() {
    try {
        // Try to get ngrok tunnel info from ngrok API
        const response = await axios.get('http://localhost:4040/api/tunnels', {
            timeout: 2000
        });
        
        if (response.data && response.data.tunnels && response.data.tunnels.length > 0) {
            // Find the first https tunnel (prefer https)
            const httpsTunnel = response.data.tunnels.find(t => t.proto === 'https');
            const tunnel = httpsTunnel || response.data.tunnels[0];
            
            if (tunnel && tunnel.public_url) {
                const url = tunnel.public_url.replace(/\/+$/, ''); // Remove trailing slashes
                console.log('✅ Detected ngrok URL:', url);
                return url;
            }
        }
    } catch (error) {
        // Ngrok not running or not accessible - this is fine for production
        if (error.code !== 'ECONNREFUSED') {
            console.warn('⚠️ Could not detect ngrok URL:', error.message);
        }
    }
    
    return null;
}

/**
 * Get public URL for callbacks/webhooks
 * Priority: PAYU_PUBLIC_TEST_URL > NGROK_URL env var > detect from ngrok API > frontendUrl
 */
async function getPublicCallbackUrl(frontendUrl) {
    // Check environment variable first
    if (process.env.PAYU_PUBLIC_TEST_URL) {
        return process.env.PAYU_PUBLIC_TEST_URL.replace(/\/+$/, '');
    }
    
    if (process.env.NGROK_URL) {
        return process.env.NGROK_URL.replace(/\/+$/, '');
    }
    
    // If frontendUrl is already public (not localhost), use it
    if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
        return frontendUrl.replace(/\/+$/, '');
    }
    
    // Try to detect ngrok URL dynamically
    const ngrokUrl = await getNgrokUrl();
    if (ngrokUrl) {
        return ngrokUrl;
    }
    
    // Fallback to frontendUrl (might be localhost, but we'll handle it)
    return frontendUrl ? frontendUrl.replace(/\/+$/, '') : null;
}

module.exports = {
    getNgrokUrl,
    getPublicCallbackUrl
};


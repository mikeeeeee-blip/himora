// Modern PayU Checkout Page Template
// Similar to Cashfree checkout page design

function generatePayUCheckoutHTML(transaction, intentData, upiApps, gpayIntent, countdownSeconds) {
    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const amount = transaction.amount.toFixed(2);
    const merchantName = transaction.merchantName;
    const upiDeepLink = upiApps.generic;
    
    // Escape URLs for HTML href attributes
    const escapeHtmlAttr = (url) => {
        if (!url) return '';
        return String(url).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };
    
    // Escape URLs for JavaScript strings (in onclick handlers)
    const escapeJs = (url) => {
        if (!url) return '';
        return String(url)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    };
    
    const paytmUrl = escapeHtmlAttr(upiApps.paytm);
    const phonepeUrl = escapeHtmlAttr(upiApps.phonepe);
    const googlepayUrl = escapeHtmlAttr(upiApps.googlepay);
    const gpayIntentUrl = escapeHtmlAttr(gpayIntent);
    const genericUpiUrl = escapeHtmlAttr(upiApps.generic);
    
    // JavaScript-safe URLs for onclick handlers
    const paytmUrlJs = escapeJs(upiApps.paytm);
    const phonepeUrlJs = escapeJs(upiApps.phonepe);
    const googlepayUrlJs = escapeJs(upiApps.googlepay);
    const gpayIntentUrlJs = escapeJs(gpayIntent);
    const genericUpiUrlJs = escapeJs(upiApps.generic);

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Payment</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            min-height: 100vh;
            padding: 0;
        }
        .header {
            background-color: #1e3a8a;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #ffffff;
        }
        .header-left, .header-right {
            display: flex;
            flex-direction: column;
        }
        .header-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .header-value {
            font-size: 24px;
            font-weight: 600;
        }
        .countdown {
            font-family: monospace;
        }
        .payment-section {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .payment-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            text-align: center;
        }
        .payment-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .payment-option-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .payment-option {
            padding: 16px;
            background-color: #ffffff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background-color 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .payment-option:hover {
            background-color: #f8f9fa;
        }
        .payment-option-link:hover .payment-option {
            background-color: #f8f9fa;
        }
        .payment-option-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .payment-icon {
            width: 40px;
            height: 40px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .payment-name {
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }
        .payment-arrow {
            width: 24px;
            height: 24px;
            color: #9ca3af;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .loading {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #666;
            font-size: 14px;
        }
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #0070f3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
    </style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Dark Blue Header Section -->
        <div class="header">
            <div class="header-left">
                <div class="header-label">Amount</div>
                <div class="header-value">₹${amount}</div>
            </div>
            <div class="header-right">
                <div class="header-label">Order countdown</div>
                <div class="header-value countdown" id="countdown">${formatCountdown(countdownSeconds)}</div>
            </div>
        </div>

        <!-- Light Grey Payment Method Selection -->
        <div class="payment-section">
            <h3 class="payment-title">Choose Payment Method</h3>
            <div class="payment-options">
                <!-- Paytm -->
                <a href="${paytmUrl}" class="payment-option-link" onclick="openUPIApp('paytm', '${paytmUrlJs}'); return false;">
                    <div class="payment-option">
                        <div class="payment-option-left">
                            <div class="payment-icon" id="paytm-icon">💵</div>
                            <span class="payment-name">Paytm</span>
                        </div>
                        <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>

                <!-- PhonePe -->
                <a href="${phonepeUrl}" class="payment-option-link" onclick="openUPIApp('phonepe', '${phonepeUrlJs}'); return false;">
                    <div class="payment-option">
                        <div class="payment-option-left">
                            <div class="payment-icon" id="phonepe-icon">📱</div>
                            <span class="payment-name">Phonepe</span>
                        </div>
                        <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>

                <!-- Google Pay -->
                <a href="${gpayIntentUrl || googlepayUrl}" class="payment-option-link" onclick="openUPIApp('googlepay', '${gpayIntentUrlJs}', '${googlepayUrlJs}'); return false;">
                    <div class="payment-option">
                        <div class="payment-option-left">
                            <div class="payment-icon" id="gpay-icon">💳</div>
                            <span class="payment-name">Google Pay</span>
                        </div>
                        <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>

                <!-- UPI (Any UPI App) -->
                <a href="${genericUpiUrl}" class="payment-option-link" onclick="openUPIApp('upi', '${genericUpiUrlJs}'); return false;">
                    <div class="payment-option">
                        <div class="payment-option-left">
                            <div class="payment-icon" id="upi-icon">🔗</div>
                            <span class="payment-name">Pay by any upi app</span>
                        </div>
                        <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </a>
            </div>
        </div>
    </div>

    <script>
        // Format countdown as HH:MM:SS
        function formatCountdown(seconds) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return \`\${String(hours).padStart(2, '0')}:\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
        }

        // Countdown timer
        let countdown = ${countdownSeconds};
        const countdownElement = document.getElementById('countdown');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = '00:00:00';
            } else {
                countdownElement.textContent = formatCountdown(countdown);
            }
        }, 1000);

        // Function to open UPI app directly
        // Reference: PayU Generate UPI Intent API - https://docs.payu.in/v2/reference/v2-generate-upi-intent-api
        function openUPIApp(appName, primaryUrl, fallbackUrl) {
            console.log('🔗 Opening UPI app:', appName);
            console.log('   Primary URL:', primaryUrl);
            if (fallbackUrl) console.log('   Fallback URL:', fallbackUrl);
            
            try {
                // Method 1: Android JS Bridge (for React Native/Android webview)
                if (typeof window !== 'undefined' && window.Android && typeof window.Android.openUPIApp === 'function') {
                    console.log('📱 Using Android JS Bridge');
                    window.Android.openUPIApp(primaryUrl || fallbackUrl);
                    return;
                }
                
                // Method 2: Android Intent URL (for Google Pay)
                if (primaryUrl && primaryUrl.startsWith('intent://')) {
                    console.log('📱 Using Android Intent URL');
                    window.location.href = primaryUrl;
                    return;
                }
                
                // Method 3: Direct UPI deep link (upi://, phonepe://, paytmmp://, tez://, etc.)
                if (primaryUrl) {
                    console.log('📱 Using UPI deep link');
                    
                    // Create a temporary link and click it (works better than window.location)
                    const link = document.createElement('a');
                    link.href = primaryUrl;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    
                    // Remove link after a short delay
                    setTimeout(() => {
                        if (link.parentNode) {
                            document.body.removeChild(link);
                        }
                    }, 100);
                    
                    // Fallback to alternative URL after 2 seconds if app doesn't open
                    if (fallbackUrl && fallbackUrl !== primaryUrl) {
                        setTimeout(() => {
                            console.log('🔄 Trying fallback URL for', appName);
                            const fallbackLink = document.createElement('a');
                            fallbackLink.href = fallbackUrl;
                            fallbackLink.style.display = 'none';
                            document.body.appendChild(fallbackLink);
                            fallbackLink.click();
                            setTimeout(() => {
                                if (fallbackLink.parentNode) {
                                    document.body.removeChild(fallbackLink);
                                }
                            }, 100);
                        }, 2000);
                    }
                    return;
                }
            } catch (e) {
                console.error('❌ Error opening UPI app:', e);
            }
            
            // Final fallback: direct window.location
            if (fallbackUrl) {
                console.log('🔄 Using fallback URL');
                window.location.href = fallbackUrl;
            } else if (primaryUrl) {
                console.log('🔄 Using primary URL as fallback');
                window.location.href = primaryUrl;
            }
        }

        // UPI Intent URL patterns (as per PayU and UPI standards)
        const UPI_INTENT_PATTERNS = [
            'upi://pay',
            'tez://',
            'gpay://',
            'paytmmp://',
            'phonepe://',
            'bhim://',
            'credpay://',
            'amazonpay://',
            'intent://'
        ];
        
        function isUPIIntentUrl(url) {
            if (!url) return false;
            const urlLower = url.toLowerCase();
            return UPI_INTENT_PATTERNS.some(pattern => urlLower.startsWith(pattern.toLowerCase()));
        }

        // Intercept UPI intent URLs on link clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a.payment-option-link');
            if (target) {
                const href = target.href;
                if (href && isUPIIntentUrl(href)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔗 Intercepted UPI intent URL:', href);
                    openUPIApp('generic', href);
                    return false;
                }
            }
        }, true);
        
        // Also handle direct clicks on payment options
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', function(e) {
                const link = this.closest('.payment-option-link');
                if (link && link.href && isUPIIntentUrl(link.href)) {
                    e.preventDefault();
                    e.stopPropagation();
                    openUPIApp('generic', link.href);
                }
            });
        });
    </script>
</body>
</html>`;
}

function formatCountdown(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Generate checkout page with form-based payment (when Intent API is not available)
function generatePayUCheckoutHTMLWithForm(transaction, payuParams, formInputs, countdownSeconds = 900) {
    const escapeHtml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const amount = transaction.amount.toFixed(2);
    const merchantName = transaction.merchantName;
    const PAYU_PAYMENT_URL = escapeHtml(payuParams.action || 'https://secure.payu.in/_payment');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complete Your Payment</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #ffffff;
            min-height: 100vh;
            padding: 0;
        }
        .header {
            background-color: #1e3a8a;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #ffffff;
        }
        .header-left, .header-right {
            display: flex;
            flex-direction: column;
        }
        .header-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 4px;
        }
        .header-value {
            font-size: 24px;
            font-weight: 600;
        }
        .countdown {
            font-family: monospace;
        }
        .payment-section {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .payment-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #333;
            text-align: center;
        }
        .payment-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .payment-option {
            padding: 16px;
            background-color: #ffffff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: background-color 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .payment-option:hover {
            background-color: #f8f9fa;
        }
        .payment-option-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .payment-icon {
            width: 40px;
            height: 40px;
            min-height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .payment-name {
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }
        .payment-arrow {
            width: 24px;
            height: 24px;
            color: #9ca3af;
        }
        #payuForm {
            display: none;
        }
    </style>
</head>
<body>
    <div style="max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Dark Blue Header Section -->
        <div class="header">
            <div class="header-left">
                <div class="header-label">Amount</div>
                <div class="header-value">₹${amount}</div>
            </div>
            <div class="header-right">
                <div class="header-label">Order countdown</div>
                <div class="header-value countdown" id="countdown">${formatCountdown(countdownSeconds)}</div>
            </div>
        </div>

        <!-- Light Grey Payment Method Selection -->
        <div class="payment-section">
            <h3 class="payment-title">Choose Payment Method</h3>
            <div class="payment-options">
                <!-- Paytm -->
                <div class="payment-option" onclick="submitForm('paytm')">
                    <div class="payment-option-left">
                        <div class="payment-icon">💵</div>
                        <span class="payment-name">Paytm</span>
                    </div>
                    <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>

                <!-- PhonePe -->
                <div class="payment-option" onclick="submitForm('phonepe')">
                    <div class="payment-option-left">
                        <div class="payment-icon">📱</div>
                        <span class="payment-name">Phonepe</span>
                    </div>
                    <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>

                <!-- Google Pay -->
                <div class="payment-option" onclick="submitForm('googlepay')">
                    <div class="payment-option-left">
                        <div class="payment-icon">💳</div>
                        <span class="payment-name">Google Pay</span>
                    </div>
                    <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>

                <!-- UPI (Any UPI App) -->
                <div class="payment-option" onclick="submitForm('upi')">
                    <div class="payment-option-left">
                        <div class="payment-icon">🔗</div>
                        <span class="payment-name">Pay by any upi app</span>
                    </div>
                    <svg class="payment-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    </div>

    <form id="payuForm" method="POST" action="${PAYU_PAYMENT_URL}">
        ${formInputs}
    </form>

    <script>
        // Format countdown as HH:MM:SS
        function formatCountdown(seconds) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return \`\${String(hours).padStart(2, '0')}:\${String(mins).padStart(2, '0')}:\${String(secs).padStart(2, '0')}\`;
        }

        // Countdown timer
        let countdown = ${countdownSeconds};
        const countdownElement = document.getElementById('countdown');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = '00:00:00';
            } else {
                countdownElement.textContent = formatCountdown(countdown);
            }
        }, 1000);

        // Function to submit form
        function submitForm(appName) {
            console.log('Submitting payment form for app:', appName);
            const form = document.getElementById('payuForm');
            if (form) {
                form.submit();
            }
        }

        // Auto-submit form for UPI payments (if pg is UPI)
        window.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('payuForm');
            const pgInput = form.querySelector('input[name="pg"]');
            if (pgInput && pgInput.value === 'UPI') {
                // Auto-submit after a short delay to show the page
                setTimeout(function() {
                    form.submit();
                }, 1000);
            }
        });
    </script>
</body>
</html>`;
}

module.exports = { generatePayUCheckoutHTML, generatePayUCheckoutHTMLWithForm, formatCountdown };


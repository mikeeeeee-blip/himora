// Checkout page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get order data from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const productSlug = urlParams.get('product') ? decodeURIComponent(urlParams.get('product')) : null;
    const quantity = parseInt(urlParams.get('quantity')) || 1;
    
    let orderData = null;
    
    // Try to get from localStorage first (for cart checkout)
    const savedOrder = localStorage.getItem('checkoutOrder');
    if (savedOrder) {
        try {
            orderData = JSON.parse(savedOrder);
            localStorage.removeItem('checkoutOrder'); // Clear after reading
        } catch (e) {
            console.error('Error parsing saved order:', e);
        }
    }
    
    // If no saved order, try to fetch product from slug
    if (!orderData && productSlug) {
        fetchProductAndCreateOrder(productSlug, quantity);
    } else if (orderData) {
        displayOrderSummary(orderData);
    } else {
        showError('No order data found. Please add items to cart first.');
    }

    // Handle form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }

    // Phone number validation
    const phoneInput = document.getElementById('customer-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });
    }

    // Pincode validation
    const pincodeInput = document.getElementById('customer-pincode');
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
    }
});

function fetchProductAndCreateOrder(slug, quantity) {
    if (!slug) {
        showError('Product information is missing. Please try again from the product page.');
        return;
    }
    
    // Show loading state
    const orderItemsContainer = document.getElementById('order-items');
    if (orderItemsContainer) {
        orderItemsContainer.innerHTML = '<div class="checkout-loading-dark"><div class="loading-spinner-dark"></div><p>Loading product details...</p></div>';
    }
    
    fetch(`/api/ecommerce/product/${encodeURIComponent(slug)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Product not found');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.product) {
                const orderData = {
                    items: [{
                        product: data.product,
                        quantity: quantity
                    }],
                    subtotal: data.product.price * quantity,
                    total: data.product.price * quantity
                };
                displayOrderSummary(orderData);
            } else {
                showError('Product not found. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error loading product:', error);
            showError('Error loading product details. Please try again.');
        });
}

function displayOrderSummary(orderData) {
    const orderItemsContainer = document.getElementById('order-items');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total-amount');
    
    if (!orderItemsContainer || !subtotalElement || !totalElement) return;
    
    // Store order data for checkout
    window.currentOrder = orderData;
    
    // Display order items
    orderItemsContainer.innerHTML = orderData.items.map(item => `
        <div class="order-item-dark">
            <img src="${item.product.image}" alt="${item.product.title}" class="order-item-img-dark">
            <div class="order-item-details-dark">
                <h3 class="order-item-name-dark">${item.product.title}</h3>
                <p class="order-item-category-dark">${item.product.category}</p>
                <p class="order-item-quantity-dark">Quantity: ${item.quantity}</p>
            </div>
            <div class="order-item-price-dark">
                ₹${(item.product.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
        </div>
    `).join('');
    
    // Display totals
    subtotalElement.textContent = `₹${orderData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    totalElement.textContent = `₹${orderData.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function handleCheckout(e) {
    e.preventDefault();
    
    if (!window.currentOrder) {
        showError('Order data is missing. Please refresh the page.');
        return;
    }
    
    // Get form data
    const formData = {
        customer_name: document.getElementById('customer-name').value.trim(),
        customer_email: document.getElementById('customer-email').value.trim(),
        customer_phone: document.getElementById('customer-phone').value.trim(),
        customer_address: document.getElementById('customer-address').value.trim(),
        customer_city: document.getElementById('customer-city').value.trim(),
        customer_state: document.getElementById('customer-state').value.trim(),
        customer_pincode: document.getElementById('customer-pincode').value.trim(),
        amount: window.currentOrder.total,
        description: `Order: ${window.currentOrder.items.map(i => i.product.title).join(', ')}`,
        items: window.currentOrder.items
    };
    
    // Validate phone number
    if (!/^[0-9]{10}$/.test(formData.customer_phone)) {
        showError('Please enter a valid 10-digit phone number');
        return;
    }
    
    // Validate pincode
    if (!/^[0-9]{6}$/.test(formData.customer_pincode)) {
        showError('Please enter a valid 6-digit pincode');
        return;
    }
    
    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
        showError('Please enter a valid email address');
        return;
    }
    
    // Show loading
    const errorDiv = document.getElementById('checkout-error');
    const loadingDiv = document.getElementById('checkout-loading');
    const submitBtn = document.getElementById('checkout-submit-btn');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }
    
    try {
        // Call checkout API
        const response = await fetch('/api/ecommerce/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success && data.payment_url) {
            // Redirect to Subpaisa payment page
            console.log('Redirecting to Subpaisa payment page:', data.payment_url);
            window.location.href = data.payment_url;
        } else {
            throw new Error(data.error || 'Failed to create payment link');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showError(error.message || 'An error occurred during checkout. Please try again.');
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Proceed to Payment';
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('checkout-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        // Scroll to error
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}


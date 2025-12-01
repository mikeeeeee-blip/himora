// Cart Page JavaScript with GSAP animations

document.addEventListener('DOMContentLoaded', function() {
    const cartLoading = document.getElementById('cart-loading');
    const cartContent = document.getElementById('cart-content');
    const cartEmpty = document.getElementById('cart-empty');
    const cartItemsList = document.getElementById('cart-items-list');
    const proceedCheckoutBtn = document.getElementById('proceed-checkout-btn');
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Load and display cart
    loadCart();
    
    // Listen for cart updates
    window.addEventListener('cartUpdated', function() {
        loadCart();
    });
    
    // Proceed to checkout
    if (proceedCheckoutBtn) {
        proceedCheckoutBtn.addEventListener('click', function() {
            const cartData = cartManager.getCartData();
            if (cartData.items.length > 0) {
                // Save cart data for checkout
                localStorage.setItem('checkoutOrder', JSON.stringify(cartData));
                window.location.href = '/checkout.html';
            }
        });
    }
    
    function loadCart() {
        const cart = cartManager.getCart();
        
        // Animate loading
        if (cartLoading && typeof gsap !== 'undefined') {
            gsap.to(cartLoading, { opacity: 1, duration: 0.3 });
        }
        
        setTimeout(() => {
            if (cart.length === 0) {
                showEmptyCart();
            } else {
                displayCart(cart);
            }
        }, 300);
    }
    
    function showEmptyCart() {
        if (cartLoading) cartLoading.style.display = 'none';
        if (cartContent) cartContent.style.display = 'none';
        if (cartEmpty) {
            cartEmpty.style.display = 'block';
            // Animate empty cart
            if (typeof gsap !== 'undefined') {
                gsap.from(cartEmpty, {
                    opacity: 0,
                    y: 30,
                    duration: 0.6,
                    ease: 'power2.out'
                });
            }
        }
    }
    
    function displayCart(cart) {
        if (cartLoading) {
            if (typeof gsap !== 'undefined') {
                gsap.to(cartLoading, {
                    opacity: 0,
                    duration: 0.3,
                    onComplete: () => {
                        cartLoading.style.display = 'none';
                    }
                });
            } else {
                cartLoading.style.display = 'none';
            }
        }
        
        if (cartContent) {
            cartContent.style.display = 'grid';
            if (typeof gsap !== 'undefined') {
                gsap.from(cartContent, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    ease: 'power2.out'
                });
            }
        }
        
        // Render cart items
        renderCartItems(cart);
        updateCartSummary();
    }
    
    function renderCartItems(cart) {
        if (!cartItemsList) return;
        
        cartItemsList.innerHTML = cart.map((item, index) => `
            <div class="cart-item-dark" data-slug="${item.product.slug}">
                <div class="cart-item-image-dark">
                    <img src="${item.product.image}" alt="${item.product.title}" loading="lazy">
                </div>
                <div class="cart-item-details-dark">
                    <h3 class="cart-item-title-dark">
                        <a href="/product/${item.product.slug}">${item.product.title}</a>
                    </h3>
                    <p class="cart-item-category-dark">${item.product.category}</p>
                    <div class="cart-item-price-dark">₹${item.product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div class="cart-item-controls-dark">
                    <div class="quantity-controls-dark">
                        <button class="qty-btn-dark" onclick="updateCartQuantity('${item.product.slug}', ${item.quantity - 1})">
                            <i data-lucide="minus"></i>
                        </button>
                        <span class="qty-value-dark">${item.quantity}</span>
                        <button class="qty-btn-dark" onclick="updateCartQuantity('${item.product.slug}', ${item.quantity + 1})">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                    <button class="remove-item-btn-dark" onclick="removeCartItem('${item.product.slug}')" aria-label="Remove item">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
                <div class="cart-item-total-dark">
                    ₹${(item.product.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
        `).join('');
        
        // Animate items
        if (typeof gsap !== 'undefined') {
            gsap.from('.cart-item-dark', {
                opacity: 0,
                x: -30,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
        
        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    function updateCartSummary() {
        const cartData = cartManager.getCartData();
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        
        if (typeof gsap !== 'undefined') {
            if (subtotalEl) {
                gsap.to(subtotalEl, {
                    textContent: `₹${cartData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    duration: 0.3,
                    snap: { textContent: 1 }
                });
            }
            
            if (totalEl) {
                gsap.to(totalEl, {
                    textContent: `₹${cartData.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    duration: 0.3,
                    snap: { textContent: 1 }
                });
            }
        } else {
            if (subtotalEl) {
                subtotalEl.textContent = `₹${cartData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
            if (totalEl) {
                totalEl.textContent = `₹${cartData.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        }
    }
    
    // Global functions for cart operations
    window.updateCartQuantity = function(slug, newQuantity) {
        const cart = cartManager.updateQuantity(slug, newQuantity);
        if (cart.length === 0) {
            showEmptyCart();
        } else {
            renderCartItems(cart);
            updateCartSummary();
        }
    };
    
    window.removeCartItem = function(slug) {
        const cartItem = document.querySelector(`.cart-item-dark[data-slug="${slug}"]`);
        if (cartItem) {
            if (typeof gsap !== 'undefined') {
                gsap.to(cartItem, {
                    opacity: 0,
                    x: 100,
                    duration: 0.4,
                    ease: 'power2.in',
                    onComplete: () => {
                        const cart = cartManager.removeItem(slug);
                        if (cart.length === 0) {
                            showEmptyCart();
                        } else {
                            renderCartItems(cart);
                            updateCartSummary();
                        }
                    }
                });
            } else {
                const cart = cartManager.removeItem(slug);
                if (cart.length === 0) {
                    showEmptyCart();
                } else {
                    renderCartItems(cart);
                    updateCartSummary();
                }
            }
        }
    };
});


// Product detail page JavaScript

// Store product slug globally for Buy Now functionality
let currentProductSlug = '';

document.addEventListener('DOMContentLoaded', function() {
    // Get product slug from URL
    let slug = '';
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug');
    
    // If no slug in query params, try to get from path
    if (!slug) {
        const pathParts = window.location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart !== 'product.html' && lastPart !== 'product') {
            slug = lastPart;
        }
    }

    if (!slug) {
        showProductNotFound();
        return;
    }

    // Store slug globally
    currentProductSlug = slug;

    // Fetch product data
    fetch(`/api/ecommerce/product/${slug}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Product not found');
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.product) {
                // Store slug from product data as well
                currentProductSlug = data.product.slug;
                displayProduct(data.product);
                loadRelatedProducts(data.product.category, data.product.slug);
            } else {
                showProductNotFound();
            }
        })
        .catch(error => {
            console.error('Error loading product:', error);
            showProductNotFound();
        });

    // Add to cart functionality
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            
            // Get current product data
            if (window.currentProduct) {
                // Add to cart with animation
                cartManager.addItem(window.currentProduct, quantity);
                
                // Animate button
                const btn = this;
                const originalHTML = btn.innerHTML;
                
                if (typeof gsap !== 'undefined') {
                    gsap.to(btn, {
                        scale: 0.95,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1,
                        ease: 'power2.inOut'
                    });
                }
                
                btn.innerHTML = '<i data-lucide="check"></i> <span>Added!</span>';
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // Show success animation
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(btn, 
                        { backgroundColor: '#ffffff' },
                        { 
                            backgroundColor: '#4ade80',
                            duration: 0.3,
                            onComplete: () => {
                                setTimeout(() => {
                                    btn.innerHTML = originalHTML;
                                    if (typeof lucide !== 'undefined') {
                                        lucide.createIcons();
                                    }
                                    gsap.to(btn, { backgroundColor: '#ffffff', duration: 0.3 });
                                }, 1500);
                            }
                        }
                    );
                    
                    // Animate cart badge
                    const badge = document.getElementById('cart-badge');
                    if (badge) {
                        gsap.fromTo(badge,
                            { scale: 1.5, rotation: 360 },
                            { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out' }
                        );
                    }
                }
            } else {
                alert('Product data not loaded. Please refresh the page.');
            }
        });
    }

    // Buy now functionality
    const buyNowBtn = document.getElementById('buy-now-btn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            
            if (currentProductSlug) {
                // Redirect to checkout with product and quantity
                window.location.href = `/checkout.html?product=${encodeURIComponent(currentProductSlug)}&quantity=${quantity}`;
            } else {
                alert('Unable to determine product. Please try again.');
            }
        });
    }
});

function displayProduct(product) {
    // Store product globally for cart
    window.currentProduct = product;
    
    // Hide loading, show content
    const loading = document.getElementById('product-loading');
    const imageSection = document.getElementById('product-image-section');
    const infoSection = document.getElementById('product-info-section');
    
    if (loading) {
        if (typeof gsap !== 'undefined') {
            gsap.to(loading, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    loading.style.display = 'none';
                }
            });
        } else {
            loading.style.display = 'none';
        }
    }
    
    if (imageSection) {
        imageSection.style.display = 'block';
        if (typeof gsap !== 'undefined') {
            gsap.from(imageSection, {
                opacity: 0,
                x: -30,
                duration: 0.6,
                ease: 'power2.out'
            });
        }
    }
    
    if (infoSection) {
        infoSection.style.display = 'block';
        if (typeof gsap !== 'undefined') {
            gsap.from(infoSection, {
                opacity: 0,
                x: 30,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.2
            });
        }
    }
    
    // Update page title
    document.getElementById('page-title').textContent = `${product.title} - Himora | himora.art`;
    
    // Update breadcrumb
    document.getElementById('breadcrumb-category').textContent = product.category;
    document.getElementById('breadcrumb-product').textContent = product.title;

    // Update product image
    const productImage = document.getElementById('product-image');
    productImage.src = product.image;
    productImage.alt = product.title;
    
    // Animate image load
    productImage.onload = function() {
        if (typeof gsap !== 'undefined') {
            gsap.from(productImage, {
                opacity: 0,
                scale: 1.1,
                duration: 0.5,
                ease: 'power2.out'
            });
        }
    };

    // Update product info
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('product-price').textContent = `₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-full-description').textContent = product.fullDescription;
    
    // Re-initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function loadRelatedProducts(category, currentSlug) {
    fetch(`/api/ecommerce/products?category=${encodeURIComponent(category)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.products) {
                // Filter out current product
                const relatedProducts = data.products.filter(p => p.slug !== currentSlug).slice(0, 4);
                displayRelatedProducts(relatedProducts);
            }
        })
        .catch(error => {
            console.error('Error loading related products:', error);
        });
}

function displayRelatedProducts(products) {
    const container = document.getElementById('related-products');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-gray); padding: 40px;">No related products found.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card-dark" data-category="${product.category}">
            <a href="/product/${product.slug}">
                <img src="${product.image}" alt="${product.title}" class="product-img-dark" loading="lazy">
            </a>
            <div class="product-category-dark">${product.category}</div>
            <h3 class="product-name-dark">
                <a href="/product/${product.slug}">${product.title}</a>
            </h3>
            <div class="product-price-dark">₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <a href="/product/${product.slug}" class="btn-view-product-dark">View Product</a>
        </div>
    `).join('');
}

function showProductNotFound() {
    const container = document.querySelector('.product-detail-container-dark');
    if (container) {
        container.innerHTML = `
            <div class="product-not-found-dark">
                <h2>Product Not Found</h2>
                <p>Sorry, the product you're looking for doesn't exist or has been removed.</p>
                <a href="/shop.html" class="btn-primary-dark">Back to Shop</a>
            </div>
        `;
    }
}


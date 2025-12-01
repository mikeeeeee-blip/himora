// Product detail page JavaScript

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
            // In a real app, this would add to cart
            alert(`Added ${quantity} item(s) to cart!`);
        });
    }

    // Buy now functionality
    const buyNowBtn = document.getElementById('buy-now-btn');
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function() {
            const quantity = parseInt(document.getElementById('quantity').value) || 1;
            // In a real app, this would redirect to checkout
            alert('Buy Now functionality coming soon!');
        });
    }
});

function displayProduct(product) {
    // Hide loading, show content
    const loading = document.getElementById('product-loading');
    const imageSection = document.getElementById('product-image-section');
    const infoSection = document.getElementById('product-info-section');
    
    if (loading) loading.style.display = 'none';
    if (imageSection) imageSection.style.display = 'block';
    if (infoSection) infoSection.style.display = 'block';
    
    // Update page title
    document.getElementById('page-title').textContent = `${product.title} - Himora | himora.art`;
    
    // Update breadcrumb
    document.getElementById('breadcrumb-category').textContent = product.category;
    document.getElementById('breadcrumb-product').textContent = product.title;

    // Update product image
    const productImage = document.getElementById('product-image');
    productImage.src = product.image;
    productImage.alt = product.title;

    // Update product info
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('product-title').textContent = product.title;
    document.getElementById('product-price').textContent = `₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('product-description').textContent = product.description;
    document.getElementById('product-full-description').textContent = product.fullDescription;
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


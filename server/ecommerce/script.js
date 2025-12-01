// FemmeWardrobe E-commerce JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Search functionality
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = prompt('Search for products:');
            if (searchTerm) {
                console.log('Searching for:', searchTerm);
                // In a real app, this would navigate to search results
                alert('Search functionality coming soon!');
            }
        });
    }

    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.btn-add-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productTitle = productCard.querySelector('.product-title').textContent;
            const productPrice = productCard.querySelector('.product-price').textContent;
            
            // Visual feedback
            const originalText = this.textContent;
            this.textContent = 'Added!';
            this.style.backgroundColor = '#666';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.backgroundColor = '';
            }, 2000);
            
            console.log('Added to cart:', productTitle, productPrice);
            // In a real app, this would add to cart state/API
        });
    });

    // Contact form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            
            console.log('Form submitted:', formData);
            
            // Show success message
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Active navigation highlighting
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.main-nav a');
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Product Carousel Functionality - Load products dynamically
    const carouselTrack = document.getElementById('carousel-track');
    if (carouselTrack) {
        fetch('/api/ecommerce/products')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products) {
                    // Show first 8 products in carousel
                    const carouselProducts = data.products.slice(0, 8);
                    carouselTrack.innerHTML = carouselProducts.map(product => `
                        <div class="carousel-item">
                            <a href="/product/${product.slug}">
                                <div class="product-card-dark">
                                    <img src="${product.image}" alt="${product.title}" class="product-img" loading="lazy">
                                    <h3 class="product-name">${product.title}</h3>
                                    <p class="product-price">₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </a>
                        </div>
                    `).join('');
                    
                    // Initialize carousel after products are loaded
                    initCarousel();
                }
            })
            .catch(error => {
                console.error('Error loading carousel products:', error);
            });
    }

    // Load accessories/products for "Explore the Women's Collections" section
    const accessoriesGrid = document.getElementById('accessories-grid');
    if (accessoriesGrid) {
        fetch('/api/ecommerce/products')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products) {
                    // Show 6 random or first 6 products
                    const accessories = data.products.slice(0, 6);
                    accessoriesGrid.innerHTML = accessories.map(product => `
                        <a href="/product/${product.slug}" class="accessory-item-link">
                            <div class="accessory-item">
                                <img src="${product.image}" alt="${product.title}" class="accessory-img" loading="lazy">
                                <h4 class="accessory-name">${product.title}</h4>
                            </div>
                        </a>
                    `).join('');
                }
            })
            .catch(error => {
                console.error('Error loading accessories:', error);
            });
    }
    
    function initCarousel() {
        const carouselTrack = document.querySelector('.carousel-track');
        const carouselPrev = document.querySelector('.carousel-prev');
        const carouselNext = document.querySelector('.carousel-next');
        const carouselItems = document.querySelectorAll('.carousel-item');
        
        if (carouselTrack && carouselPrev && carouselNext && carouselItems.length > 0) {
            let currentIndex = 0;
            const itemsToShow = 4;
            const totalItems = carouselItems.length;
            
            function updateCarousel() {
                if (carouselItems.length === 0) return;
                const itemWidth = carouselItems[0].offsetWidth + 30; // width + gap
                const maxIndex = Math.max(0, totalItems - itemsToShow);
                currentIndex = Math.min(currentIndex, maxIndex);
                carouselTrack.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
            }
            
            carouselNext.addEventListener('click', () => {
                const maxIndex = Math.max(0, totalItems - itemsToShow);
                if (currentIndex < maxIndex) {
                    currentIndex++;
                    updateCarousel();
                }
            });
            
            carouselPrev.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateCarousel();
                }
            });
            
            // Handle window resize
            window.addEventListener('resize', updateCarousel);
            updateCarousel();
        }
    }
});


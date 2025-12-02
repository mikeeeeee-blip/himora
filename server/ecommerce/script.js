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

    // Product Carousel Functionality - Load 4 products (2 male, 2 female) with auto-scroll
    const carouselTrack = document.getElementById('carousel-track');
    if (carouselTrack) {
        fetch('/api/ecommerce/products')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products) {
                    // Separate male and female products
                    const getGender = (product) => {
                        if (product.image.includes('/female/')) return 'female';
                        if (product.image.includes('/male/')) return 'male';
                        return 'unisex';
                    };
                    
                    const femaleProducts = data.products.filter(p => getGender(p) === 'female');
                    const maleProducts = data.products.filter(p => getGender(p) === 'male');
                    
                    // Get 2 female and 2 male products with variety - use Trousers and Jeans for Just Dropped
                    const selectedFemale = [
                        ...femaleProducts.filter(p => p.category === 'Trousers').slice(0, 1),
                        ...femaleProducts.filter(p => p.category === 'Jeans').slice(0, 1)
                    ].filter(Boolean).slice(0, 2);
                    
                    const selectedMale = [
                        ...maleProducts.filter(p => p.category === 'Trousers').slice(0, 1),
                        ...maleProducts.filter(p => p.category === 'Jeans').slice(0, 1)
                    ].filter(Boolean).slice(0, 2);
                    
                    // Mix them: female, male, female, male
                    const carouselProducts = [];
                    for (let i = 0; i < Math.max(selectedFemale.length, selectedMale.length); i++) {
                        if (selectedFemale[i]) carouselProducts.push(selectedFemale[i]);
                        if (selectedMale[i]) carouselProducts.push(selectedMale[i]);
                    }
                    const finalProducts = carouselProducts.slice(0, 4);
                    
                    carouselTrack.innerHTML = finalProducts.map(product => `
                        <div class="carousel-item min-w-[280px] flex-shrink-0">
                            <a href="/product/${product.slug}">
                                <div class="product-card-dark bg-primary-black border border-border-dark overflow-hidden group cursor-pointer hover:border-text-white transition-colors">
                                    <img src="${product.image}" alt="${product.title}" class="product-img w-full h-[400px] object-cover transition-transform duration-600 group-hover:scale-105" loading="lazy">
                                    <h3 class="product-name text-lg font-semibold mb-2 px-4 mt-4 text-text-white">${product.title}</h3>
                                    <p class="product-price text-xl font-bold mb-4 px-4 text-text-white">₹${product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            </a>
                        </div>
                    `).join('');
                    
                    // Initialize carousel after products are loaded
                    initCarousel();
                    
                    // Start auto-scroll
                    startAutoScroll();
                    
                    // Refresh animations after products load
                    if (typeof ScrollTrigger !== 'undefined') {
                        setTimeout(() => {
                            ScrollTrigger.refresh();
                        }, 100);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading carousel products:', error);
            });
    }
    
    // Auto-scroll functionality
    let autoScrollInterval = null;
    let isUserInteracting = false;
    
    function startAutoScroll() {
        const carouselTrack = document.getElementById('carousel-track');
        const carouselContainer = document.querySelector('.carousel-container');
        if (!carouselTrack || !carouselContainer) return;
        
        // Clear any existing interval
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
        
        // Auto-scroll every 3 seconds
        autoScrollInterval = setInterval(() => {
            if (isUserInteracting) return; // Don't auto-scroll if user is interacting
            
            const carouselItems = carouselTrack.querySelectorAll('.carousel-item');
            if (carouselItems.length <= 1) return;
            
            const firstItem = carouselItems[0];
            const itemWidth = firstItem.offsetWidth + 15; // width + gap
            
            // Move first item to end
            carouselTrack.style.transition = 'transform 0.5s ease';
            carouselTrack.style.transform = `translateX(-${itemWidth}px)`;
            
            setTimeout(() => {
                carouselTrack.style.transition = 'none';
                carouselTrack.appendChild(firstItem);
                carouselTrack.style.transform = 'translateX(0)';
            }, 500);
        }, 3000);
        
        // Pause on hover
        carouselContainer.addEventListener('mouseenter', () => {
            isUserInteracting = true;
        });
        
        carouselContainer.addEventListener('mouseleave', () => {
            isUserInteracting = false;
        });
        
        // Pause on manual navigation
        const prevBtn = document.querySelector('.carousel-prev');
        const nextBtn = document.querySelector('.carousel-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                isUserInteracting = true;
                setTimeout(() => {
                    isUserInteracting = false;
                }, 5000);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                isUserInteracting = true;
                setTimeout(() => {
                    isUserInteracting = false;
                }, 5000);
            });
        }
    }

    // Load products for "Featured Collection" section - showing 2 male and 2 female products
    const featuredGrid = document.getElementById('featured-grid');
    if (featuredGrid) {
        fetch('/api/ecommerce/products')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.products) {
                    // Separate male and female products
                    const getGender = (product) => {
                        if (product.image.includes('/female/')) return 'female';
                        if (product.image.includes('/male/')) return 'male';
                        return 'unisex';
                    };
                    
                    const femaleProducts = data.products.filter(p => getGender(p) === 'female');
                    const maleProducts = data.products.filter(p => getGender(p) === 'male');
                    
                    // Get 2 female and 2 male products with variety - use different products than Just Dropped
                    // Use second items from Casual and Formal, or use Shoes category
                    const selectedFemale = [
                        ...femaleProducts.filter(p => p.category === 'Casual').slice(1, 2),
                        ...femaleProducts.filter(p => p.category === 'Formal').slice(1, 2)
                    ].filter(Boolean);
                    
                    // If not enough, add from other categories
                    if (selectedFemale.length < 2) {
                        const shoesFemale = femaleProducts.filter(p => p.category === 'Shoes').slice(0, 1);
                        selectedFemale.push(...shoesFemale);
                    }
                    
                    const selectedMale = [
                        ...maleProducts.filter(p => p.category === 'Casual').slice(1, 2),
                        ...maleProducts.filter(p => p.category === 'Formal').slice(1, 2)
                    ].filter(Boolean);
                    
                    // If not enough, add from other categories
                    if (selectedMale.length < 2) {
                        const shoesMale = maleProducts.filter(p => p.category === 'Shoes').slice(0, 1);
                        selectedMale.push(...shoesMale);
                    }
                    
                    // Mix them: female, male, female, male
                    const selectedProducts = [];
                    for (let i = 0; i < Math.max(selectedFemale.length, selectedMale.length); i++) {
                        if (selectedFemale[i]) selectedProducts.push(selectedFemale[i]);
                        if (selectedMale[i]) selectedProducts.push(selectedMale[i]);
                    }
                    const finalProducts = selectedProducts.slice(0, 4);
                    
                    featuredGrid.innerHTML = finalProducts.map(product => `
                        <a href="/product/${product.slug}" class="accessory-item-link block">
                            <div class="accessory-item bg-primary-black border border-border-dark overflow-hidden group cursor-pointer hover:border-text-white transition-colors">
                                <img src="${product.image}" alt="${product.title}" class="accessory-img w-full h-[400px] object-cover transition-transform duration-600 group-hover:scale-105" loading="lazy">
                                <h4 class="accessory-name">${product.title}</h4>
                            </div>
                        </a>
                    `).join('');
                    
                    // Refresh animations after products load
                    if (typeof ScrollTrigger !== 'undefined') {
                        setTimeout(() => {
                            ScrollTrigger.refresh();
                        }, 100);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading featured products:', error);
            });
    }

    // Initialize Lucide icons for category CTAs
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
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
                const itemWidth = carouselItems[0].offsetWidth + 15; // width + gap
                const maxIndex = Math.max(0, totalItems - itemsToShow);
                currentIndex = Math.min(currentIndex, maxIndex);
                
                // Use GSAP for smooth carousel animation
                if (typeof gsap !== 'undefined') {
                    gsap.to(carouselTrack, {
                        x: -currentIndex * itemWidth,
                        duration: 0.6,
                        ease: 'power2.inOut'
                    });
                } else {
                    carouselTrack.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
                }
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


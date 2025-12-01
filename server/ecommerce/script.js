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

    // Product Carousel Functionality
    const carouselTrack = document.querySelector('.carousel-track');
    const carouselPrev = document.querySelector('.carousel-prev');
    const carouselNext = document.querySelector('.carousel-next');
    const carouselItems = document.querySelectorAll('.carousel-item');
    
    if (carouselTrack && carouselPrev && carouselNext) {
        let currentIndex = 0;
        const itemsToShow = 4;
        const totalItems = carouselItems.length;
        
        function updateCarousel() {
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
});


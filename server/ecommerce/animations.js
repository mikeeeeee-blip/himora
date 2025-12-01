// Production-ready GSAP animations for home page
// Subtle, smooth, and professional animations

document.addEventListener('DOMContentLoaded', function() {
    // Register GSAP plugins
    if (typeof gsap !== 'undefined') {
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
        }
        if (typeof ScrollToPlugin !== 'undefined') {
            gsap.registerPlugin(ScrollToPlugin);
        }
    }

    // Only run animations if GSAP is loaded
    if (typeof gsap === 'undefined') {
        console.warn('GSAP not loaded, animations disabled');
        return;
    }

    // ============ HEADER ANIMATIONS ============
    const header = document.querySelector('.site-header');
    if (header) {
        // Fade in header on load
        gsap.from(header, {
            y: -20,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        });

        // Header scroll effect
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 100) {
                if (currentScroll > lastScroll) {
                    // Scrolling down
                    gsap.to(header, {
                        y: -100,
                        duration: 0.3,
                        ease: 'power2.inOut'
                    });
                } else {
                    // Scrolling up
                    gsap.to(header, {
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.inOut'
                    });
                }
            }
            lastScroll = currentScroll;
        });
    }

    // ============ HERO SECTION ANIMATIONS ============
    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
        const heroImage = heroBanner.querySelector('.hero-banner-image');
        const heroTitle = heroBanner.querySelector('.hero-banner-title');
        const heroBtn = heroBanner.querySelector('.hero-shop-btn');
        const heroOverlay = heroBanner.querySelector('.hero-overlay');

        // Parallax effect for hero image
        if (heroImage) {
            gsap.to(heroImage, {
                yPercent: 30,
                ease: 'none',
                scrollTrigger: {
                    trigger: heroBanner,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: true
                }
            });
        }

        // Hero content fade in
        if (heroOverlay) {
            gsap.from(heroOverlay, {
                opacity: 0,
                y: 50,
                duration: 1.2,
                ease: 'power3.out',
                delay: 0.3
            });
        }

        if (heroTitle) {
            gsap.from(heroTitle, {
                opacity: 0,
                y: 30,
                duration: 1,
                ease: 'power3.out',
                delay: 0.5
            });
        }

        if (heroBtn) {
            gsap.from(heroBtn, {
                opacity: 0,
                y: 20,
                duration: 0.8,
                ease: 'power2.out',
                delay: 0.8
            });

            // Hover animation
            heroBtn.addEventListener('mouseenter', () => {
                gsap.to(heroBtn, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            heroBtn.addEventListener('mouseleave', () => {
                gsap.to(heroBtn, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    }

    // ============ SECTION HEADINGS ANIMATIONS ============
    const sectionHeadings = document.querySelectorAll('.section-heading');
    sectionHeadings.forEach((heading, index) => {
        gsap.from(heading, {
            opacity: 0,
            y: 40,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: heading,
                start: 'top 85%',
                end: 'top 60%',
                toggleActions: 'play none none none'
            }
        });
    });

    // ============ PRODUCT CAROUSEL ANIMATIONS ============
    const carouselItems = document.querySelectorAll('.carousel-item');
    carouselItems.forEach((item, index) => {
        const productCard = item.querySelector('.product-card-dark');
        const productImg = item.querySelector('.product-img');

        // Stagger entrance animation
        gsap.from(item, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.6,
            ease: 'power2.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: item.closest('.just-dropped-section'),
                start: 'top 80%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal animation with subtle blur
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.15,
                opacity: 0,
                filter: 'blur(10px)',
                duration: 1,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 80%',
                    toggleActions: 'play none none none'
                },
                onComplete: () => {
                    gsap.to(productImg, {
                        filter: 'blur(0px)',
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                }
            });
        }

        // Hover animations
        if (productCard) {
            item.addEventListener('mouseenter', () => {
                gsap.to(productCard, {
                    y: -10,
                    scale: 1.02,
                    duration: 0.4,
                    ease: 'power2.out'
                });
                gsap.to(productImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            });

            item.addEventListener('mouseleave', () => {
                gsap.to(productCard, {
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
                gsap.to(productImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            });
        }
    });

    // ============ COLLECTION BANNERS ANIMATIONS ============
    const collectionBanners = document.querySelectorAll('.collection-banner');
    collectionBanners.forEach((banner, index) => {
        const bannerImg = banner.querySelector('.banner-img');
        const bannerOverlay = banner.querySelector('.banner-overlay');
        const bannerTitle = banner.querySelector('.banner-title');

        // Scroll-triggered reveal
        gsap.from(banner, {
            opacity: 0,
            x: index % 2 === 0 ? -50 : 50,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: banner,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image parallax
        if (bannerImg) {
            gsap.to(bannerImg, {
                scale: 1.1,
                ease: 'none',
                scrollTrigger: {
                    trigger: banner,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        }

        // Overlay fade in on hover
        if (bannerOverlay) {
            banner.addEventListener('mouseenter', () => {
                gsap.to(bannerOverlay, {
                    opacity: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
                if (bannerTitle) {
                    gsap.from(bannerTitle, {
                        y: 20,
                        opacity: 0,
                        duration: 0.4,
                        ease: 'power2.out'
                    });
                }
            });
        }
    });

    // ============ LARGE COLLECTION BANNERS ============
    const largeBanners = document.querySelectorAll('.collection-banner-large');
    largeBanners.forEach((banner, index) => {
        const bannerImg = banner.querySelector('.banner-img-large');
        const bannerOverlay = banner.querySelector('.banner-overlay');
        const bannerTitle = banner.querySelector('.banner-title-large');

        // Scroll reveal
        gsap.from(banner, {
            opacity: 0,
            y: 80,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: banner,
                start: 'top 80%',
                toggleActions: 'play none none none'
            }
        });

        // Parallax for large images
        if (bannerImg) {
            gsap.to(bannerImg, {
                yPercent: -20,
                ease: 'none',
                scrollTrigger: {
                    trigger: banner,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        }
    });

    // ============ ACCESSORIES GRID ANIMATIONS ============
    const accessoryItems = document.querySelectorAll('.accessory-item');
    accessoryItems.forEach((item, index) => {
        const accessoryImg = item.querySelector('.accessory-img');

        // Staggered grid reveal
        gsap.from(item, {
            opacity: 0,
            scale: 0.8,
            rotation: -5,
            duration: 0.6,
            ease: 'back.out(1.7)',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal with subtle blur
        if (accessoryImg) {
            gsap.from(accessoryImg, {
                scale: 1.25,
                opacity: 0,
                filter: 'blur(8px)',
                duration: 1,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                },
                onComplete: () => {
                    gsap.to(accessoryImg, {
                        filter: 'blur(0px)',
                        duration: 0.5,
                        ease: 'power2.out'
                    });
                }
            });
        }

        // Hover effect
        item.addEventListener('mouseenter', () => {
            gsap.to(item, {
                y: -15,
                scale: 1.05,
                rotation: 0,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (accessoryImg) {
                gsap.to(accessoryImg, {
                    scale: 1.15,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        item.addEventListener('mouseleave', () => {
            gsap.to(item, {
                y: 0,
                scale: 1,
                rotation: -5,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (accessoryImg) {
                gsap.to(accessoryImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ HERO SECTIONS (Accessories & Shades) ============
    const heroSections = document.querySelectorAll('.accessories-hero, .shades-section');
    heroSections.forEach((section) => {
        const heroImg = section.querySelector('.accessories-hero-img, .shades-hero-img');
        const heroOverlay = section.querySelector('.accessories-overlay, .shades-overlay');
        const heroTitle = section.querySelector('.accessories-title, .shades-title');
        const heroLinks = section.querySelectorAll('.accessories-link, .shades-link');

        // Parallax scroll
        if (heroImg) {
            gsap.to(heroImg, {
                yPercent: 25,
                scale: 1.1,
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.5
                }
            });
        }

        // Overlay content fade in
        if (heroOverlay) {
            gsap.from(heroOverlay, {
                opacity: 0,
                y: 40,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: section,
                    start: 'top 75%',
                    toggleActions: 'play none none none'
                }
            });
        }

        if (heroTitle) {
            gsap.from(heroTitle, {
                opacity: 0,
                x: -50,
                duration: 0.8,
                ease: 'power3.out',
                delay: 0.2,
                scrollTrigger: {
                    trigger: section,
                    start: 'top 75%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Links stagger animation
        heroLinks.forEach((link, index) => {
            gsap.from(link, {
                opacity: 0,
                x: -30,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.4 + (index * 0.1),
                scrollTrigger: {
                    trigger: section,
                    start: 'top 75%',
                    toggleActions: 'play none none none'
                }
            });

            // Hover animation
            link.addEventListener('mouseenter', () => {
                gsap.to(link, {
                    x: 10,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            link.addEventListener('mouseleave', () => {
                gsap.to(link, {
                    x: 0,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        });
    });

    // ============ BLOG CARDS ANIMATIONS ============
    const blogCards = document.querySelectorAll('.blog-card');
    blogCards.forEach((card, index) => {
        const blogImg = card.querySelector('.blog-img');
        const blogContent = card.querySelector('.blog-content');

        // Card entrance
        gsap.from(card, {
            opacity: 0,
            y: 60,
            rotation: 2,
            duration: 0.8,
            ease: 'power3.out',
            delay: index * 0.15,
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal with blur effect
        if (blogImg) {
            gsap.from(blogImg, {
                scale: 1.2,
                opacity: 0,
                filter: 'blur(8px)',
                duration: 1.2,
                ease: 'power2.out',
                delay: index * 0.15 + 0.2,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                },
                onComplete: () => {
                    gsap.to(blogImg, {
                        filter: 'blur(0px)',
                        duration: 0.6,
                        ease: 'power2.out'
                    });
                }
            });
        }

        // Content fade in
        if (blogContent) {
            gsap.from(blogContent, {
                opacity: 0,
                y: 20,
                duration: 0.6,
                ease: 'power2.out',
                delay: index * 0.15 + 0.4,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Hover effect
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -10,
                rotation: 0,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (blogImg) {
                gsap.to(blogImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                rotation: 2,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (blogImg) {
                gsap.to(blogImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ FOOTER ANIMATIONS ============
    const footer = document.querySelector('.site-footer');
    if (footer) {
        const footerColumns = footer.querySelectorAll('.footer-column');
        
        gsap.from(footer, {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: footer,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Stagger footer columns
        footerColumns.forEach((column, index) => {
            gsap.from(column, {
                opacity: 0,
                y: 30,
                duration: 0.6,
                ease: 'power2.out',
                delay: index * 0.1,
                scrollTrigger: {
                    trigger: footer,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        });
    }

    // ============ SMOOTH SCROLL BEHAVIOR ============
    // Enhanced smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target && typeof ScrollToPlugin !== 'undefined') {
                    gsap.to(window, {
                        duration: 1.2,
                        scrollTo: {
                            y: target,
                            offsetY: 80
                        },
                        ease: 'power3.inOut'
                    });
                } else if (target) {
                    // Fallback to native smooth scroll
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // ============ CAROUSEL BUTTONS ANIMATIONS ============
    const carouselButtons = document.querySelectorAll('.carousel-btn');
    carouselButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, {
                scale: 1.1,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                scale: 1,
                backgroundColor: 'transparent',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });

    // ============ TEXT ANIMATIONS ============
    // Animate text elements with subtle reveal
    const animateTextElements = () => {
        const textElements = document.querySelectorAll('.section-heading, .banner-title, .banner-title-large, .accessories-title, .shades-title, .blog-title, .footer-heading');
        
        textElements.forEach((element) => {
            const text = element.textContent;
            if (text && text.length > 0) {
                // Split text into words for word-by-word animation
                const words = text.split(' ');
                element.innerHTML = words.map((word, i) => 
                    `<span class="word" style="display: inline-block; opacity: 0;">${word}</span>`
                ).join(' ');
                
                const wordSpans = element.querySelectorAll('.word');
                wordSpans.forEach((word, i) => {
                    gsap.from(word, {
                        opacity: 0,
                        y: 20,
                        rotationX: -90,
                        duration: 0.5,
                        ease: 'power2.out',
                        delay: i * 0.05,
                        scrollTrigger: {
                            trigger: element,
                            start: 'top 85%',
                            toggleActions: 'play none none none'
                        }
                    });
                });
            }
        });
    };
    
    // Run text animations after a short delay
    setTimeout(animateTextElements, 300);

    // ============ LOGO ANIMATION ============
    const logo = document.querySelector('.logo a');
    if (logo) {
        // Subtle pulse on load
        gsap.from(logo, {
            scale: 0.9,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out'
        });

        // Hover effect
        logo.addEventListener('mouseenter', () => {
            gsap.to(logo, {
                letterSpacing: '3px',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        logo.addEventListener('mouseleave', () => {
            gsap.to(logo, {
                letterSpacing: '2px',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    }

    // ============ NAVIGATION MENU ANIMATIONS ============
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach((link, index) => {
        // Initial fade in
        gsap.from(link, {
            opacity: 0,
            y: -10,
            duration: 0.5,
            ease: 'power2.out',
            delay: 0.2 + (index * 0.05)
        });

        // Hover underline effect
        link.addEventListener('mouseenter', () => {
            gsap.to(link, {
                y: -2,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        link.addEventListener('mouseleave', () => {
            gsap.to(link, {
                y: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });

    // ============ ICON BUTTONS ANIMATIONS ============
    const iconButtons = document.querySelectorAll('.icon-btn');
    iconButtons.forEach(btn => {
        // Initial scale animation
        gsap.from(btn, {
            scale: 0,
            rotation: -180,
            duration: 0.5,
            ease: 'back.out(1.7)',
            delay: 0.5
        });

        // Hover animations
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, {
                scale: 1.1,
                rotation: 5,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                scale: 1,
                rotation: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        // Click animation
        btn.addEventListener('click', () => {
            gsap.to(btn, {
                scale: 0.9,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut'
            });
        });
    });

    // ============ IMAGE LOADING ANIMATIONS ============
    const images = document.querySelectorAll('img:not(.hero-banner-image)');
    images.forEach(img => {
        // Add loading state
        img.style.opacity = '0';
        img.style.transform = 'scale(1.05)';
        img.style.filter = 'blur(5px)';
        
        img.addEventListener('load', function() {
            gsap.to(this, {
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                duration: 1,
                ease: 'power2.out'
            });
        });

        // If image is already loaded
        if (img.complete && img.naturalHeight !== 0) {
            gsap.to(img, {
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                duration: 1,
                ease: 'power2.out'
            });
        }
    });

    // ============ PRODUCT PRICE ANIMATIONS ============
    const productPrices = document.querySelectorAll('.product-price, .product-price-dark');
    productPrices.forEach(price => {
        gsap.from(price, {
            opacity: 0,
            x: -20,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: price.closest('.product-card-dark, .carousel-item'),
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });
    });

    // ============ BUTTON ANIMATIONS ============
    const buttons = document.querySelectorAll('.btn-primary-dark, .btn-secondary-dark, .hero-shop-btn, .btn-checkout-dark, .btn-checkout-full-dark');
    buttons.forEach(btn => {
        // Ripple effect on click
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            gsap.from(ripple, {
                scale: 0,
                opacity: 0.5,
                duration: 0.6,
                ease: 'power2.out',
                onComplete: () => ripple.remove()
            });
        });

        // Subtle hover glow
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, {
                boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                boxShadow: '0 0 0px rgba(255, 255, 255, 0)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });

    // ============ LINK HOVER ANIMATIONS ============
    const links = document.querySelectorAll('a:not(.icon-btn):not(.btn-primary-dark):not(.btn-secondary-dark)');
    links.forEach(link => {
        link.addEventListener('mouseenter', () => {
            gsap.to(link, {
                x: 5,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        link.addEventListener('mouseleave', () => {
            gsap.to(link, {
                x: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });

    // ============ CAROUSEL BUTTONS ENHANCED ============
    const carouselButtons = document.querySelectorAll('.carousel-btn');
    carouselButtons.forEach((btn, index) => {
        // Entrance animation
        gsap.from(btn, {
            opacity: 0,
            scale: 0,
            rotation: index === 0 ? -90 : 90,
            duration: 0.6,
            ease: 'back.out(1.7)',
            delay: 0.8 + (index * 0.1),
            scrollTrigger: {
                trigger: btn.closest('.product-carousel'),
                start: 'top 80%',
                toggleActions: 'play none none none'
            }
        });

        // Enhanced hover
        btn.addEventListener('mouseenter', () => {
            gsap.to(btn, {
                scale: 1.15,
                rotation: index === 0 ? -5 : 5,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                scale: 1,
                rotation: 0,
                backgroundColor: 'transparent',
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        // Click animation
        btn.addEventListener('click', () => {
            gsap.to(btn, {
                scale: 0.9,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut'
            });
        });
    });

    // ============ FOOTER LINKS ANIMATIONS ============
    const footerLinks = document.querySelectorAll('.footer-links a, .social-icon');
    footerLinks.forEach((link, index) => {
        gsap.from(link, {
            opacity: 0,
            x: -10,
            duration: 0.4,
            ease: 'power2.out',
            delay: index * 0.03,
            scrollTrigger: {
                trigger: link.closest('.footer-column'),
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Hover effect
        link.addEventListener('mouseenter', () => {
            gsap.to(link, {
                x: 5,
                opacity: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        link.addEventListener('mouseleave', () => {
            gsap.to(link, {
                x: 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        });
    });

    // ============ SECTION DIVIDERS ANIMATION ============
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        // Subtle fade in for entire section
        gsap.from(section, {
            opacity: 0,
            duration: 0.6,
            ease: 'power1.out',
            scrollTrigger: {
                trigger: section,
                start: 'top 95%',
                toggleActions: 'play none none none'
            }
        });
    });

    // ============ PARALLAX SCROLL EFFECTS ============
    // Enhanced parallax for hero images
    const parallaxElements = document.querySelectorAll('.hero-banner-image, .banner-img, .banner-img-large');
    parallaxElements.forEach(element => {
        gsap.to(element, {
            yPercent: 15,
            ease: 'none',
            scrollTrigger: {
                trigger: element.closest('section'),
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5
            }
        });
    });

    // ============ CURSOR FOLLOW EFFECT (Subtle) ============
    // Only on desktop, subtle cursor effect
    if (window.innerWidth > 768) {
        let cursor = document.querySelector('.custom-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'custom-cursor';
            document.body.appendChild(cursor);
        }

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Smooth cursor follow with GSAP
        gsap.to({}, {
            duration: Infinity,
            repeat: -1,
            onUpdate: () => {
                cursorX += (mouseX - cursorX) * 0.15;
                cursorY += (mouseY - cursorY) * 0.15;
                gsap.set(cursor, {
                    x: cursorX - 5,
                    y: cursorY - 5
                });
            }
        });

        // Cursor hover effects
        const hoverElements = document.querySelectorAll('a, button, .product-card-dark, .collection-banner');
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hover');
                gsap.to(cursor, {
                    scale: 2,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hover');
                gsap.to(cursor, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        });
    }

    // ============ PAGE LOAD ANIMATION ============
    // Fade in entire page
    gsap.from('body', {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
    });

    // ============ SCROLL PROGRESS INDICATOR ============
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);

    gsap.to(progressBar, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5
        },
        transformOrigin: 'left'
    });

    // Subtle glow effect on progress bar
    gsap.to(progressBar, {
        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });

    // ============ PERFORMANCE OPTIMIZATION ============
    // Refresh ScrollTrigger on dynamic content load
    const refreshScrollTrigger = () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    };

    // Refresh after images load
    window.addEventListener('load', () => {
        setTimeout(refreshScrollTrigger, 100);
    });

    // Refresh after dynamic content is added
    const observer = new MutationObserver(() => {
        setTimeout(refreshScrollTrigger, 100);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});


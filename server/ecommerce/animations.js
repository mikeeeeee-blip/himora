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

        // Image reveal animation
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.2,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 80%',
                    toggleActions: 'play none none none'
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

    // ============ TROUSERS COLLECTION ANIMATIONS ============
    const trousersProducts = document.querySelectorAll('.trousers-grid .product-card-dark');
    trousersProducts.forEach((product, index) => {
        const productImg = product.querySelector('.product-img-dark');

        // Staggered grid reveal
        gsap.from(product, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: product,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.2,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: product,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Hover effect
        product.addEventListener('mouseenter', () => {
            gsap.to(product, {
                y: -10,
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        product.addEventListener('mouseleave', () => {
            gsap.to(product, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ JEANS COLLECTION ANIMATIONS ============
    const jeansProducts = document.querySelectorAll('.jeans-grid .product-card-dark');
    jeansProducts.forEach((product, index) => {
        const productImg = product.querySelector('.product-img-dark');

        // Staggered grid reveal
        gsap.from(product, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: product,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.2,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: product,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Hover effect
        product.addEventListener('mouseenter', () => {
            gsap.to(product, {
                y: -10,
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        product.addEventListener('mouseleave', () => {
            gsap.to(product, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ SHOES COLLECTION ANIMATIONS ============
    const shoesProducts = document.querySelectorAll('.shoes-grid .product-card-dark');
    shoesProducts.forEach((product, index) => {
        const productImg = product.querySelector('.product-img-dark');

        // Staggered grid reveal
        gsap.from(product, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: product,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.2,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: product,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Hover effect
        product.addEventListener('mouseenter', () => {
            gsap.to(product, {
                y: -10,
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        product.addEventListener('mouseleave', () => {
            gsap.to(product, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ FORMAL COLLECTION ANIMATIONS ============
    const formalProducts = document.querySelectorAll('.formal-grid .product-card-dark');
    formalProducts.forEach((product, index) => {
        const productImg = product.querySelector('.product-img-dark');

        // Staggered grid reveal
        gsap.from(product, {
            opacity: 0,
            y: 60,
            scale: 0.9,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: product,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Image reveal
        if (productImg) {
            gsap.from(productImg, {
                scale: 1.2,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: product,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Hover effect
        product.addEventListener('mouseenter', () => {
            gsap.to(product, {
                y: -10,
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1.1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });

        product.addEventListener('mouseleave', () => {
            gsap.to(product, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
            if (productImg) {
                gsap.to(productImg, {
                    scale: 1,
                    duration: 0.4,
                    ease: 'power2.out'
                });
            }
        });
    });

    // ============ CATEGORY CTAs ANIMATIONS ============
    const ctaCards = document.querySelectorAll('.category-cta-card');
    ctaCards.forEach((card, index) => {
        gsap.from(card, {
            opacity: 0,
            y: 40,
            scale: 0.95,
            duration: 0.7,
            ease: 'power3.out',
            delay: index * 0.1,
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                toggleActions: 'play none none none'
            }
        });

        // Hover animation
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -8,
                scale: 1.02,
                duration: 0.4,
                ease: 'power2.out'
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out'
            });
        });
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

        // Image reveal
        if (accessoryImg) {
            gsap.from(accessoryImg, {
                scale: 1.3,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.1 + 0.2,
                scrollTrigger: {
                    trigger: item,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
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

        // Image reveal
        if (blogImg) {
            gsap.from(blogImg, {
                scale: 1.2,
                opacity: 0,
                duration: 1,
                ease: 'power2.out',
                delay: index * 0.15 + 0.2,
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
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

    // ============ FORMAL SECTION ANIMATIONS ============
    const formalSection = document.querySelector('.formal-collection-section');
    if (formalSection) {
        const formalHeading = formalSection.querySelector('.section-heading');
        const formalSubtitle = formalSection.querySelector('.section-subtitle');
        const formalGrid = formalSection.querySelector('.formal-grid');
        const formalButton = formalSection.querySelector('.btn-primary-dark');

        // Section entrance
        gsap.from(formalSection, {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: formalSection,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Heading animation
        if (formalHeading) {
            gsap.from(formalHeading, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: formalSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Subtitle animation
        if (formalSubtitle) {
            gsap.from(formalSubtitle, {
                opacity: 0,
                y: 20,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.2,
                scrollTrigger: {
                    trigger: formalSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Button animation
        if (formalButton) {
            gsap.from(formalButton, {
                opacity: 0,
                scale: 0.9,
                duration: 0.6,
                ease: 'back.out(1.7)',
                delay: 0.5,
                scrollTrigger: {
                    trigger: formalSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });

            // Button hover
            formalButton.addEventListener('mouseenter', () => {
                gsap.to(formalButton, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            formalButton.addEventListener('mouseleave', () => {
                gsap.to(formalButton, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    }

    // ============ TROUSERS SECTION ANIMATIONS ============
    const trousersSection = document.querySelector('.trousers-collection-section');
    if (trousersSection) {
        const trousersHeading = trousersSection.querySelector('.section-heading');
        const trousersSubtitle = trousersSection.querySelector('.section-subtitle');
        const trousersButton = trousersSection.querySelector('.btn-primary-dark');

        // Section entrance
        gsap.from(trousersSection, {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: trousersSection,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Heading animation
        if (trousersHeading) {
            gsap.from(trousersHeading, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: trousersSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Subtitle animation
        if (trousersSubtitle) {
            gsap.from(trousersSubtitle, {
                opacity: 0,
                y: 20,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.2,
                scrollTrigger: {
                    trigger: trousersSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Button animation
        if (trousersButton) {
            gsap.from(trousersButton, {
                opacity: 0,
                scale: 0.9,
                duration: 0.6,
                ease: 'back.out(1.7)',
                delay: 0.5,
                scrollTrigger: {
                    trigger: trousersSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });

            // Button hover
            trousersButton.addEventListener('mouseenter', () => {
                gsap.to(trousersButton, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            trousersButton.addEventListener('mouseleave', () => {
                gsap.to(trousersButton, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    }

    // ============ JEANS SECTION ANIMATIONS ============
    const jeansSection = document.querySelector('.jeans-collection-section');
    if (jeansSection) {
        const jeansHeading = jeansSection.querySelector('.section-heading');
        const jeansSubtitle = jeansSection.querySelector('.section-subtitle');
        const jeansButton = jeansSection.querySelector('.btn-primary-dark');

        // Section entrance
        gsap.from(jeansSection, {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: jeansSection,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Heading animation
        if (jeansHeading) {
            gsap.from(jeansHeading, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: jeansSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Subtitle animation
        if (jeansSubtitle) {
            gsap.from(jeansSubtitle, {
                opacity: 0,
                y: 20,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.2,
                scrollTrigger: {
                    trigger: jeansSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Button animation
        if (jeansButton) {
            gsap.from(jeansButton, {
                opacity: 0,
                scale: 0.9,
                duration: 0.6,
                ease: 'back.out(1.7)',
                delay: 0.5,
                scrollTrigger: {
                    trigger: jeansSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });

            // Button hover
            jeansButton.addEventListener('mouseenter', () => {
                gsap.to(jeansButton, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            jeansButton.addEventListener('mouseleave', () => {
                gsap.to(jeansButton, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    }

    // ============ SHOES SECTION ANIMATIONS ============
    const shoesSection = document.querySelector('.shoes-collection-section');
    if (shoesSection) {
        const shoesHeading = shoesSection.querySelector('.section-heading');
        const shoesSubtitle = shoesSection.querySelector('.section-subtitle');
        const shoesButton = shoesSection.querySelector('.btn-primary-dark');

        // Section entrance
        gsap.from(shoesSection, {
            opacity: 0,
            y: 40,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: shoesSection,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Heading animation
        if (shoesHeading) {
            gsap.from(shoesHeading, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: shoesSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Subtitle animation
        if (shoesSubtitle) {
            gsap.from(shoesSubtitle, {
                opacity: 0,
                y: 20,
                duration: 0.6,
                ease: 'power2.out',
                delay: 0.2,
                scrollTrigger: {
                    trigger: shoesSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });
        }

        // Button animation
        if (shoesButton) {
            gsap.from(shoesButton, {
                opacity: 0,
                scale: 0.9,
                duration: 0.6,
                ease: 'back.out(1.7)',
                delay: 0.5,
                scrollTrigger: {
                    trigger: shoesSection,
                    start: 'top 90%',
                    toggleActions: 'play none none none'
                }
            });

            // Button hover
            shoesButton.addEventListener('mouseenter', () => {
                gsap.to(shoesButton, {
                    scale: 1.05,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });

            shoesButton.addEventListener('mouseleave', () => {
                gsap.to(shoesButton, {
                    scale: 1,
                    duration: 0.3,
                    ease: 'power2.out'
                });
            });
        }
    }

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


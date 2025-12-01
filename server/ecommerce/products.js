// Product data with slugs and model images
const products = [
    // Work & Office Collection
    {
        slug: 'timeless-classic-collection',
        title: 'Timeless Classic Collection',
        category: 'Work & Office',
        price: 3049.00,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop',
        description: 'Elevate your professional wardrobe with this timeless classic collection. Perfect for the modern working woman who values both style and sophistication.',
        fullDescription: 'This elegant collection features premium fabrics and impeccable tailoring. The pieces are designed to transition seamlessly from office to evening events. Each garment is crafted with attention to detail, ensuring a perfect fit and lasting quality.',
        inStock: true
    },
    {
        slug: 'relaxed-fit-joggers',
        title: 'Relaxed Fit Joggers',
        category: 'Work & Office',
        price: 2050.00,
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000&fit=crop',
        description: 'Comfort meets style with these relaxed-fit joggers. Perfect for a casual office environment or weekend wear.',
        fullDescription: 'These premium joggers combine the comfort of athletic wear with the polish of office attire. The relaxed fit allows for freedom of movement while maintaining a professional appearance. Made from high-quality materials that maintain their shape and comfort throughout the day.',
        inStock: true
    },
    {
        slug: 'professional-blazer-set',
        title: 'Professional Blazer Set',
        category: 'Work & Office',
        price: 3599.00,
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
        description: 'A sophisticated blazer set that commands respect in any boardroom. Tailored to perfection for the modern professional.',
        fullDescription: 'This professional blazer set features premium wool blend fabric and expert tailoring. The structured silhouette creates a powerful, confident look while maintaining comfort throughout long work days. Perfect for presentations, meetings, and corporate events.',
        inStock: true
    },
    {
        slug: 'executive-pencil-skirt',
        title: 'Executive Pencil Skirt',
        category: 'Work & Office',
        price: 1899.00,
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop',
        description: 'A classic pencil skirt that never goes out of style. Perfect for pairing with blazers and blouses.',
        fullDescription: 'This executive pencil skirt is crafted from premium stretch fabric that moves with you. The classic A-line silhouette flatters all body types while maintaining a professional appearance. Available in multiple colors to match your office wardrobe.',
        inStock: true
    },
    {
        slug: 'business-casual-dress',
        title: 'Business Casual Dress',
        category: 'Work & Office',
        price: 2299.00,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
        description: 'A versatile dress that transitions from office to after-work events seamlessly.',
        fullDescription: 'This business casual dress features a flattering fit-and-flare silhouette with professional details. The breathable fabric keeps you comfortable all day, while the elegant design ensures you look polished and put-together.',
        inStock: true
    },
    {
        slug: 'tailored-trouser-pants',
        title: 'Tailored Trouser Pants',
        category: 'Work & Office',
        price: 2499.00,
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=1000&fit=crop',
        description: 'Classic tailored trousers that fit perfectly and look professional.',
        fullDescription: 'These tailored trouser pants feature a straight-leg cut that elongates your silhouette. Made from premium fabric with a slight stretch for comfort, these pants are a wardrobe essential for any professional woman.',
        inStock: true
    },
    
    // Casual Collection
    {
        slug: 'bohemian-rhapsody-attire',
        title: 'Bohemian Rhapsody Attire',
        category: 'Casual',
        price: 2050.00,
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop',
        description: 'Embrace your free spirit with this bohemian-inspired collection. Flowing fabrics and artistic patterns create a unique, relaxed style.',
        fullDescription: 'The Bohemian Rhapsody collection celebrates individuality and comfort. Each piece features unique patterns and comfortable fits that allow you to express your personal style. Perfect for weekend adventures, casual outings, or creative work environments.',
        inStock: true
    },
    {
        slug: 'power-suit-ensemble',
        title: 'Power Suit Ensemble',
        category: 'Casual',
        price: 749.00,
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop',
        description: 'Command attention with this powerful suit ensemble. Designed for the confident woman who means business.',
        fullDescription: 'The Power Suit Ensemble combines sharp tailoring with modern design elements. This versatile set can be worn together for a complete look or mixed and matched with other pieces. Perfect for important meetings, presentations, or any occasion where you want to make a strong impression.',
        inStock: true
    },
    {
        slug: 'casual-oversized-sweater',
        title: 'Casual Oversized Sweater',
        category: 'Casual',
        price: 1599.00,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop',
        description: 'Cozy and stylish oversized sweater perfect for casual days and relaxed weekends.',
        fullDescription: 'This casual oversized sweater is made from soft, premium yarn that feels luxurious against your skin. The relaxed fit provides comfort while the modern design keeps you looking chic. Perfect for layering or wearing on its own.',
        inStock: true
    },
    {
        slug: 'denim-jacket-classic',
        title: 'Classic Denim Jacket',
        category: 'Casual',
        price: 2199.00,
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
        description: 'A timeless denim jacket that pairs with everything in your wardrobe.',
        fullDescription: 'This classic denim jacket features premium denim fabric that softens with each wear. The versatile design works with dresses, skirts, and pants, making it a must-have piece for any casual wardrobe.',
        inStock: true
    },
    {
        slug: 'comfortable-cargo-pants',
        title: 'Comfortable Cargo Pants',
        category: 'Casual',
        price: 1799.00,
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000&fit=crop',
        description: 'Functional and fashionable cargo pants with multiple pockets for your essentials.',
        fullDescription: 'These comfortable cargo pants combine utility with style. The relaxed fit and multiple pockets make them perfect for active days, while the modern design ensures you look great wherever you go.',
        inStock: true
    },
    {
        slug: 'casual-maxi-dress',
        title: 'Casual Maxi Dress',
        category: 'Casual',
        price: 1899.00,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
        description: 'A flowing maxi dress perfect for casual outings and relaxed occasions.',
        fullDescription: 'This casual maxi dress features a comfortable, flowing silhouette that moves beautifully. The breathable fabric and relaxed fit make it perfect for warm weather days, beach outings, or casual weekend activities.',
        inStock: true
    },
    
    // Evening Dresses Collection
    {
        slug: 'midnight-gala-maxi-dress',
        title: 'Midnight Gala Maxi Dress',
        category: 'Evening Dresses',
        price: 175.00,
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop',
        description: 'Make a stunning entrance at any evening event with this elegant maxi dress. Designed to turn heads and make you feel like royalty.',
        fullDescription: 'This exquisite maxi dress features a flowing silhouette that flatters every body type. The premium fabric drapes beautifully, creating an elegant and sophisticated look. Perfect for galas, formal dinners, and special occasions.',
        inStock: true
    },
    {
        slug: 'urban-chic-ensemble',
        title: 'Urban Chic Ensemble',
        category: 'Evening Dresses',
        price: 2240.95,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
        description: 'Embrace urban sophistication with this chic ensemble. Modern design meets timeless elegance.',
        fullDescription: 'The Urban Chic Ensemble captures the essence of modern city style. This carefully curated set features contemporary cuts and premium fabrics that create a polished, fashion-forward look. Perfect for dinner dates, city events, or any occasion where you want to showcase your style.',
        inStock: true
    },
    {
        slug: 'elegant-cocktail-dress',
        title: 'Elegant Cocktail Dress',
        category: 'Evening Dresses',
        price: 3299.00,
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=1000&fit=crop',
        description: 'A sophisticated cocktail dress perfect for evening events and special occasions.',
        fullDescription: 'This elegant cocktail dress features a flattering A-line silhouette with delicate details. The premium fabric and expert tailoring create a stunning look that will make you the center of attention at any event.',
        inStock: true
    },
    {
        slug: 'sequin-evening-gown',
        title: 'Sequin Evening Gown',
        category: 'Evening Dresses',
        price: 4499.00,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop',
        description: 'A glamorous sequin gown that sparkles under the lights. Perfect for formal galas and red carpet events.',
        fullDescription: 'This stunning sequin evening gown features hand-sewn sequins that catch the light beautifully. The elegant silhouette and luxurious fabric create a truly glamorous look for your most special occasions.',
        inStock: true
    },
    {
        slug: 'silk-wrap-dress',
        title: 'Silk Wrap Dress',
        category: 'Evening Dresses',
        price: 2799.00,
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
        description: 'A luxurious silk wrap dress that flatters every figure.',
        fullDescription: 'This silk wrap dress features premium silk fabric that feels luxurious against your skin. The wrap design creates a flattering silhouette that can be adjusted for the perfect fit. Perfect for dinner dates, parties, or any evening occasion.',
        inStock: true
    },
    {
        slug: 'velvet-evening-dress',
        title: 'Velvet Evening Dress',
        category: 'Evening Dresses',
        price: 3699.00,
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop',
        description: 'A rich velvet dress that exudes elegance and sophistication.',
        fullDescription: 'This velvet evening dress features premium velvet fabric with a beautiful sheen. The classic design and luxurious material create a timeless, elegant look perfect for formal events and special occasions.',
        inStock: true
    },
    
    // Activewear Collection
    {
        slug: 'pinstripe-jacket',
        title: 'Pinstripe jacket',
        category: 'Activewear',
        price: 1090.99,
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
        description: 'A versatile pinstripe jacket that adds sophistication to any outfit. Perfect for layering and creating polished looks.',
        fullDescription: 'This classic pinstripe jacket features a tailored fit that flatters your silhouette. The timeless pattern never goes out of style, making it a wardrobe essential. Layer it over dresses, pair it with jeans, or wear it as part of a complete suit ensemble.',
        inStock: true
    },
    {
        slug: 'weekend-wanderlust-wardrobe',
        title: 'Weekend Wanderlust Wardrobe',
        category: 'Activewear',
        price: 1019.95,
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=1000&fit=crop',
        description: 'Your perfect companion for weekend adventures. Comfortable, stylish, and ready for anything.',
        fullDescription: 'The Weekend Wanderlust Wardrobe is designed for the active, adventurous woman. These pieces are versatile enough for hiking, brunch, shopping, or exploring new places. Made from durable, comfortable materials that move with you and keep you looking great all day long.',
        inStock: true
    },
    {
        slug: 'athletic-leggings-set',
        title: 'Athletic Leggings Set',
        category: 'Activewear',
        price: 2199.00,
        image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&h=1000&fit=crop',
        description: 'High-performance leggings and sports bra set for your active lifestyle.',
        fullDescription: 'This athletic leggings set features moisture-wicking fabric that keeps you dry during workouts. The compression fit provides support while the stylish design ensures you look great at the gym or on the go.',
        inStock: true
    },
    {
        slug: 'yoga-outfit-collection',
        title: 'Yoga Outfit Collection',
        category: 'Activewear',
        price: 1899.00,
        image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&h=1000&fit=crop',
        description: 'Comfortable and flexible yoga outfit perfect for your practice.',
        fullDescription: 'This yoga outfit collection features stretchy, breathable fabric that moves with your body. The comfortable fit and stylish design make it perfect for yoga classes, meditation, or casual wear.',
        inStock: true
    },
    {
        slug: 'running-jacket-windbreaker',
        title: 'Running Jacket Windbreaker',
        category: 'Activewear',
        price: 2499.00,
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1000&fit=crop',
        description: 'A lightweight windbreaker perfect for running and outdoor activities.',
        fullDescription: 'This running jacket windbreaker features water-resistant fabric and breathable design. The lightweight construction makes it perfect for layering, while the modern design ensures you look great during your workouts.',
        inStock: true
    },
    {
        slug: 'sports-bra-tank-top',
        title: 'Sports Bra Tank Top',
        category: 'Activewear',
        price: 1299.00,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
        description: 'A supportive sports bra with built-in tank top for maximum comfort.',
        fullDescription: 'This sports bra tank top combines support with style. The built-in bra provides excellent support during workouts, while the tank top design keeps you cool and comfortable. Perfect for running, gym sessions, or any high-intensity activity.',
        inStock: true
    }
];

// Function to get product by slug
function getProductBySlug(slug) {
    return products.find(product => product.slug === slug);
}

// Function to get all products
function getAllProducts() {
    return products;
}

// Function to get products by category
function getProductsByCategory(category) {
    return products.filter(product => product.category === category);
}

module.exports = {
    products,
    getProductBySlug,
    getAllProducts,
    getProductsByCategory
};

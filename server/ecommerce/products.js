// Product data with slugs and model images
const products = [
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
        slug: 'weekend-wanderlust-wardrobe',
        title: 'Weekend Wanderlust Wardrobe',
        category: 'Activewear',
        price: 1019.95,
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=1000&fit=crop',
        description: 'Your perfect companion for weekend adventures. Comfortable, stylish, and ready for anything.',
        fullDescription: 'The Weekend Wanderlust Wardrobe is designed for the active, adventurous woman. These pieces are versatile enough for hiking, brunch, shopping, or exploring new places. Made from durable, comfortable materials that move with you and keep you looking great all day long.',
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


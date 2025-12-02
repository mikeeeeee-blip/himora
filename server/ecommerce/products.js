// Product data with slugs and model images
const products = [
    // Casual Collection - Female
    {
        slug: 'casual-comfort-dress',
        title: 'Casual Comfort Dress',
        category: 'Casual',
        price: 2299.00,
        image: '/assets/casuals/female/image.png',
        description: 'A comfortable and stylish casual dress perfect for everyday wear. Relaxed fit with modern design.',
        fullDescription: 'This casual comfort dress features soft, breathable fabric that keeps you comfortable all day. The relaxed silhouette and modern design make it perfect for casual outings, weekend activities, or relaxed work environments.',
        inStock: true
    },
    {
        slug: 'casual-chic-outfit',
        title: 'Casual Chic Outfit',
        category: 'Casual',
        price: 2799.00,
        image: '/assets/casuals/female/image copy.png',
        description: 'A chic casual outfit that combines comfort with style. Perfect for casual dates and weekend outings.',
        fullDescription: 'This casual chic outfit features premium materials and contemporary design. The versatile pieces can be mixed and matched to create multiple looks. Perfect for casual dates, weekend brunches, or relaxed social gatherings.',
        inStock: true
    },
    {
        slug: 'relaxed-casual-ensemble',
        title: 'Relaxed Casual Ensemble',
        category: 'Casual',
        price: 2499.00,
        image: '/assets/casuals/female/image copy 2.png',
        description: 'A relaxed casual ensemble for comfortable everyday wear. Effortless style meets maximum comfort.',
        fullDescription: 'This relaxed casual ensemble features comfortable fabrics and easy-going silhouettes. Perfect for running errands, casual meetups, or simply lounging in style. The pieces work together or can be styled separately.',
        inStock: true
    },
    {
        slug: 'weekend-casual-wear',
        title: 'Weekend Casual Wear',
        category: 'Casual',
        price: 2199.00,
        image: '/assets/casuals/female/image copy 3.png',
        description: 'Perfect weekend casual wear that keeps you comfortable and stylish. Ideal for relaxed days.',
        fullDescription: 'This weekend casual wear collection features comfortable, easy-to-wear pieces that don\'t compromise on style. Made from soft, quality fabrics that feel great against your skin. Perfect for weekend adventures, casual outings, or relaxed activities.',
        inStock: true
    },
    {
        slug: 'everyday-casual-outfit',
        title: 'Everyday Casual Outfit',
        category: 'Casual',
        price: 2599.00,
        image: '/assets/casuals/female/image copy 4.png',
        description: 'An everyday casual outfit that works for any occasion. Versatile and comfortable.',
        fullDescription: 'This everyday casual outfit features versatile pieces that can be dressed up or down. The comfortable fit and modern design make it perfect for daily wear, casual office environments, or relaxed social events.',
        inStock: true
    },
    
    // Casual Collection - Male
    {
        slug: 'casual-comfort-shirt',
        title: 'Casual Comfort Shirt',
        category: 'Casual',
        price: 1899.00,
        image: '/assets/casuals/male/image.png',
        description: 'A comfortable casual shirt perfect for everyday wear. Relaxed fit with modern style.',
        fullDescription: 'This casual comfort shirt features soft, breathable fabric that keeps you comfortable all day. The relaxed fit and modern design make it perfect for casual outings, weekend activities, or relaxed work environments.',
        inStock: true
    },
    {
        slug: 'casual-weekend-outfit',
        title: 'Casual Weekend Outfit',
        category: 'Casual',
        price: 3299.00,
        image: '/assets/casuals/male/image copy.png',
        description: 'A stylish casual weekend outfit that combines comfort with contemporary design.',
        fullDescription: 'This casual weekend outfit features premium materials and modern styling. The versatile pieces can be mixed and matched to create multiple looks. Perfect for weekend outings, casual dates, or relaxed social gatherings.',
        inStock: true
    },
    {
        slug: 'relaxed-casual-attire',
        title: 'Relaxed Casual Attire',
        category: 'Casual',
        price: 2799.00,
        image: '/assets/casuals/male/image copy 2.png',
        description: 'Relaxed casual attire for comfortable everyday wear. Effortless style and maximum comfort.',
        fullDescription: 'This relaxed casual attire features comfortable fabrics and easy-going silhouettes. Perfect for running errands, casual meetups, or simply lounging in style. The pieces work together or can be styled separately.',
        inStock: true
    },
    {
        slug: 'casual-everyday-wear',
        title: 'Casual Everyday Wear',
        category: 'Casual',
        price: 2499.00,
        image: '/assets/casuals/male/image copy 3.png',
        description: 'Perfect casual everyday wear that keeps you comfortable and stylish throughout the day.',
        fullDescription: 'This casual everyday wear collection features comfortable, easy-to-wear pieces that don\'t compromise on style. Made from soft, quality fabrics that feel great. Perfect for daily activities, casual outings, or relaxed work environments.',
        inStock: true
    },
    {
        slug: 'weekend-casual-comfort',
        title: 'Weekend Casual Comfort',
        category: 'Casual',
        price: 2999.00,
        image: '/assets/casuals/male/image copy 4.png',
        description: 'Comfortable weekend casual wear perfect for relaxed days and casual activities.',
        fullDescription: 'This weekend casual comfort collection features soft, comfortable fabrics and relaxed fits. Perfect for weekend adventures, casual outings, or simply enjoying your day in comfort and style.',
        inStock: true
    },
    {
        slug: 'casual-stylish-outfit',
        title: 'Casual Stylish Outfit',
        category: 'Casual',
        price: 3499.00,
        image: '/assets/casuals/male/image copy 5.png',
        description: 'A stylish casual outfit that combines modern design with everyday comfort.',
        fullDescription: 'This casual stylish outfit features contemporary design elements and premium materials. The versatile pieces can be styled in multiple ways, making it perfect for various casual occasions and everyday wear.',
        inStock: true
    },
    {
        slug: 'everyday-casual-comfort',
        title: 'Everyday Casual Comfort',
        category: 'Casual',
        price: 2699.00,
        image: '/assets/casuals/male/image copy 6.png',
        description: 'An everyday casual outfit that works for any occasion. Versatile, comfortable, and stylish.',
        fullDescription: 'This everyday casual comfort outfit features versatile pieces that can be dressed up or down. The comfortable fit and modern design make it perfect for daily wear, casual office environments, or relaxed social events.',
        inStock: true
    },
    
    // Trousers Collection - Female
    {
        slug: 'classic-trouser-pants-female',
        title: 'Classic Trouser Pants',
        category: 'Trousers',
        price: 2499.00,
        image: '/assets/trousers/female/image.png',
        description: 'Classic trouser pants with a perfect fit. Versatile and comfortable for everyday wear.',
        fullDescription: 'These classic trouser pants feature a straight-leg cut that elongates your silhouette. Made from premium fabric with a slight stretch for comfort, these pants are a wardrobe essential. Perfect for office wear, casual outings, or any occasion where you want to look polished.',
        inStock: true
    },
    {
        slug: 'tailored-trouser-pants-female',
        title: 'Tailored Trouser Pants',
        category: 'Trousers',
        price: 2799.00,
        image: '/assets/trousers/female/image copy.png',
        description: 'Expertly tailored trouser pants that fit perfectly and look professional.',
        fullDescription: 'These tailored trouser pants feature premium fabric and expert tailoring. The perfect fit and classic design make them ideal for professional settings, formal occasions, or when you want to look your best.',
        inStock: true
    },
    {
        slug: 'slim-fit-trousers-female',
        title: 'Slim Fit Trousers',
        category: 'Trousers',
        price: 2699.00,
        image: '/assets/trousers/female/image copy 2.png',
        description: 'Slim fit trousers that flatter your figure while maintaining comfort.',
        fullDescription: 'These slim fit trousers feature a modern silhouette that flatters your figure. The premium fabric and comfortable fit make them perfect for both professional and casual settings.',
        inStock: true
    },
    {
        slug: 'wide-leg-trousers-female',
        title: 'Wide Leg Trousers',
        category: 'Trousers',
        price: 2899.00,
        image: '/assets/trousers/female/image copy 3.png',
        description: 'Stylish wide leg trousers with a contemporary design. Comfortable and fashionable.',
        fullDescription: 'These wide leg trousers feature a contemporary design that combines style with comfort. The flowing silhouette and premium fabric create a sophisticated look perfect for modern fashion.',
        inStock: true
    },
    {
        slug: 'professional-trousers-female',
        title: 'Professional Trousers',
        category: 'Trousers',
        price: 2999.00,
        image: '/assets/trousers/female/image copy 4.png',
        description: 'Professional trousers designed for the modern working woman. Perfect for office wear.',
        fullDescription: 'These professional trousers feature premium materials and expert tailoring. The classic design and perfect fit make them ideal for business meetings, office environments, or professional events.',
        inStock: true
    },
    {
        slug: 'comfort-fit-trousers-female',
        title: 'Comfort Fit Trousers',
        category: 'Trousers',
        price: 2599.00,
        image: '/assets/trousers/female/image copy 5.png',
        description: 'Comfortable trouser pants with a relaxed fit. Perfect for all-day wear.',
        fullDescription: 'These comfort fit trousers feature a relaxed fit that doesn\'t compromise on style. Made from soft, premium fabric, they are perfect for long days at work or casual outings.',
        inStock: true
    },
    
    // Trousers Collection - Male
    {
        slug: 'classic-trouser-pants-male',
        title: 'Classic Trouser Pants',
        category: 'Trousers',
        price: 2799.00,
        image: '/assets/trousers/male/image.png',
        description: 'Classic trouser pants with timeless design. Perfect for professional and casual wear.',
        fullDescription: 'These classic trouser pants feature a traditional design that never goes out of style. Made from premium fabric with expert tailoring, they are perfect for business meetings, formal events, or everyday professional wear.',
        inStock: true
    },
    {
        slug: 'tailored-trouser-pants-male',
        title: 'Tailored Trouser Pants',
        category: 'Trousers',
        price: 3099.00,
        image: '/assets/trousers/male/image copy.png',
        description: 'Expertly tailored trouser pants that fit perfectly. Premium quality and professional appearance.',
        fullDescription: 'These tailored trouser pants feature premium materials and meticulous tailoring. The perfect fit and classic design make them ideal for business professionals, formal occasions, or when you want to look your best.',
        inStock: true
    },
    {
        slug: 'slim-fit-trousers-male',
        title: 'Slim Fit Trousers',
        category: 'Trousers',
        price: 2899.00,
        image: '/assets/trousers/male/image copy 2.png',
        description: 'Modern slim fit trousers that combine style with comfort.',
        fullDescription: 'These slim fit trousers feature a contemporary silhouette that flatters your figure. The premium fabric and comfortable fit make them perfect for both professional and casual settings.',
        inStock: true
    },
    {
        slug: 'professional-trousers-male',
        title: 'Professional Trousers',
        category: 'Trousers',
        price: 3199.00,
        image: '/assets/trousers/male/image copy 3.png',
        description: 'Professional trousers designed for the modern businessman. Perfect for office wear.',
        fullDescription: 'These professional trousers feature premium materials and expert tailoring. The classic design and perfect fit make them ideal for business meetings, office environments, or professional events.',
        inStock: true
    },
    {
        slug: 'comfort-fit-trousers-male',
        title: 'Comfort Fit Trousers',
        category: 'Trousers',
        price: 2699.00,
        image: '/assets/trousers/male/image copy 4.png',
        description: 'Comfortable trouser pants with a relaxed fit. Perfect for all-day wear.',
        fullDescription: 'These comfort fit trousers feature a relaxed fit that doesn\'t compromise on style. Made from soft, premium fabric, they are perfect for long days at work or casual outings.',
        inStock: true
    },
    {
        slug: 'executive-trousers-male',
        title: 'Executive Trousers',
        category: 'Trousers',
        price: 3399.00,
        image: '/assets/trousers/male/image copy 5.png',
        description: 'Premium executive trousers for the modern professional. Exceptional quality and sophisticated design.',
        fullDescription: 'These executive trousers feature the finest materials and expert craftsmanship. The sophisticated design and perfect fit make them ideal for executives, formal business events, or when you want to make a powerful impression.',
        inStock: true
    },
    {
        slug: 'formal-trousers-male',
        title: 'Formal Trousers',
        category: 'Trousers',
        price: 3299.00,
        image: '/assets/trousers/male/image copy 6.png',
        description: 'Formal trousers with classic design. Perfect for formal occasions and professional wear.',
        fullDescription: 'These formal trousers feature traditional design elements and premium materials. The expert tailoring and classic fit make them perfect for formal events, professional occasions, or business meetings.',
        inStock: true
    },
    
    // Jeans Collection - Female
    {
        slug: 'classic-jeans-female',
        title: 'Classic Jeans',
        category: 'Jeans',
        price: 1999.00,
        image: '/assets/jeans/female/image.png',
        description: 'Classic jeans with timeless design. Perfect for everyday casual wear.',
        fullDescription: 'These classic jeans feature premium denim fabric and traditional design. The comfortable fit and durable construction make them perfect for daily wear, casual outings, or weekend activities.',
        inStock: true
    },
    {
        slug: 'slim-fit-jeans-female',
        title: 'Slim Fit Jeans',
        category: 'Jeans',
        price: 2199.00,
        image: '/assets/jeans/female/image copy.png',
        description: 'Slim fit jeans that flatter your figure. Modern design with comfortable fit.',
        fullDescription: 'These slim fit jeans feature a contemporary silhouette that flatters your figure. Made from premium denim with stretch for comfort, they are perfect for casual wear or relaxed social settings.',
        inStock: true
    },
    {
        slug: 'skinny-jeans-female',
        title: 'Skinny Jeans',
        category: 'Jeans',
        price: 2099.00,
        image: '/assets/jeans/female/image copy 2.png',
        description: 'Stylish skinny jeans with a modern fit. Perfect for casual and semi-casual occasions.',
        fullDescription: 'These skinny jeans feature a modern fit that hugs your curves. Made from premium stretch denim, they are comfortable and stylish, perfect for casual outings or weekend wear.',
        inStock: true
    },
    {
        slug: 'straight-leg-jeans-female',
        title: 'Straight Leg Jeans',
        category: 'Jeans',
        price: 2299.00,
        image: '/assets/jeans/female/image copy 3.png',
        description: 'Classic straight leg jeans with timeless appeal. Versatile and comfortable.',
        fullDescription: 'These straight leg jeans feature a classic design that never goes out of style. The comfortable fit and premium denim make them perfect for everyday wear or casual occasions.',
        inStock: true
    },
    {
        slug: 'bootcut-jeans-female',
        title: 'Bootcut Jeans',
        category: 'Jeans',
        price: 2199.00,
        image: '/assets/jeans/female/image copy 4.png',
        description: 'Stylish bootcut jeans that flatter your figure. Perfect for casual wear.',
        fullDescription: 'These bootcut jeans feature a flattering fit that widens slightly at the hem. Made from premium denim, they are perfect for casual outings, weekend activities, or relaxed social settings.',
        inStock: true
    },
    {
        slug: 'relaxed-fit-jeans-female',
        title: 'Relaxed Fit Jeans',
        category: 'Jeans',
        price: 1999.00,
        image: '/assets/jeans/female/image copy 5.png',
        description: 'Comfortable relaxed fit jeans. Perfect for all-day wear and casual activities.',
        fullDescription: 'These relaxed fit jeans feature a comfortable fit that doesn\'t compromise on style. Made from soft, premium denim, they are perfect for long days, casual outings, or when you want maximum comfort.',
        inStock: true
    },
    {
        slug: 'high-waist-jeans-female',
        title: 'High Waist Jeans',
        category: 'Jeans',
        price: 2299.00,
        image: '/assets/jeans/female/image copy 6.png',
        description: 'Stylish high waist jeans with a flattering fit. Modern design with classic appeal.',
        fullDescription: 'These high waist jeans feature a flattering high-rise design that elongates your silhouette. Made from premium stretch denim, they are comfortable and stylish, perfect for casual wear or relaxed social settings.',
        inStock: true
    },
    {
        slug: 'distressed-jeans-female',
        title: 'Distressed Jeans',
        category: 'Jeans',
        price: 2399.00,
        image: '/assets/jeans/female/image copy 7.png',
        description: 'Trendy distressed jeans with a modern edge. Perfect for casual and street style.',
        fullDescription: 'These distressed jeans feature contemporary distressing details that add character. Made from premium denim, they are perfect for casual outings, weekend wear, or when you want to make a fashion statement.',
        inStock: true
    },
    
    // Jeans Collection - Male
    {
        slug: 'classic-jeans-male',
        title: 'Classic Jeans',
        category: 'Jeans',
        price: 1899.00,
        image: '/assets/jeans/male/image.png',
        description: 'Classic jeans with timeless design. Perfect for everyday casual wear.',
        fullDescription: 'These classic jeans feature premium denim fabric and traditional design. The comfortable fit and durable construction make them perfect for daily wear, casual outings, or weekend activities.',
        inStock: true
    },
    {
        slug: 'slim-fit-jeans-male',
        title: 'Slim Fit Jeans',
        category: 'Jeans',
        price: 2099.00,
        image: '/assets/jeans/male/image copy.png',
        description: 'Slim fit jeans with modern design. Comfortable and stylish for casual wear.',
        fullDescription: 'These slim fit jeans feature a contemporary silhouette that flatters your figure. Made from premium denim with stretch for comfort, they are perfect for casual wear or relaxed social settings.',
        inStock: true
    },
    {
        slug: 'straight-leg-jeans-male',
        title: 'Straight Leg Jeans',
        category: 'Jeans',
        price: 1999.00,
        image: '/assets/jeans/male/image copy 2.png',
        description: 'Classic straight leg jeans with timeless appeal. Versatile and comfortable.',
        fullDescription: 'These straight leg jeans feature a classic design that never goes out of style. The comfortable fit and premium denim make them perfect for everyday wear or casual occasions.',
        inStock: true
    },
    {
        slug: 'relaxed-fit-jeans-male',
        title: 'Relaxed Fit Jeans',
        category: 'Jeans',
        price: 1899.00,
        image: '/assets/jeans/male/image copy 3.png',
        description: 'Comfortable relaxed fit jeans. Perfect for all-day wear and casual activities.',
        fullDescription: 'These relaxed fit jeans feature a comfortable fit that doesn\'t compromise on style. Made from soft, premium denim, they are perfect for long days, casual outings, or when you want maximum comfort.',
        inStock: true
    },
    {
        slug: 'skinny-jeans-male',
        title: 'Skinny Jeans',
        category: 'Jeans',
        price: 2099.00,
        image: '/assets/jeans/male/image copy 4.png',
        description: 'Modern skinny jeans with a sleek fit. Perfect for casual and contemporary style.',
        fullDescription: 'These skinny jeans feature a modern fit that hugs your legs. Made from premium stretch denim, they are comfortable and stylish, perfect for casual outings or weekend wear.',
        inStock: true
    },
    {
        slug: 'bootcut-jeans-male',
        title: 'Bootcut Jeans',
        category: 'Jeans',
        price: 2199.00,
        image: '/assets/jeans/male/image copy 5.png',
        description: 'Stylish bootcut jeans with a flattering fit. Perfect for casual wear.',
        fullDescription: 'These bootcut jeans feature a fit that widens slightly at the hem. Made from premium denim, they are perfect for casual outings, weekend activities, or relaxed social settings.',
        inStock: true
    },
    {
        slug: 'distressed-jeans-male',
        title: 'Distressed Jeans',
        category: 'Jeans',
        price: 2299.00,
        image: '/assets/jeans/male/image copy 6.png',
        description: 'Trendy distressed jeans with a modern edge. Perfect for casual and street style.',
        fullDescription: 'These distressed jeans feature contemporary distressing details that add character. Made from premium denim, they are perfect for casual outings, weekend wear, or when you want to make a fashion statement.',
        inStock: true
    },
    {
        slug: 'tapered-jeans-male',
        title: 'Tapered Jeans',
        category: 'Jeans',
        price: 2199.00,
        image: '/assets/jeans/male/image copy 7.png',
        description: 'Modern tapered jeans with a contemporary fit. Perfect for casual and smart-casual wear.',
        fullDescription: 'These tapered jeans feature a modern fit that narrows towards the ankle. Made from premium denim, they are perfect for casual outings, weekend activities, or when you want a contemporary look.',
        inStock: true
    },
    {
        slug: 'vintage-jeans-male',
        title: 'Vintage Jeans',
        category: 'Jeans',
        price: 2399.00,
        image: '/assets/jeans/male/image copy 8.png',
        description: 'Classic vintage-style jeans with retro appeal. Perfect for casual and retro style.',
        fullDescription: 'These vintage jeans feature a classic design with retro styling. Made from premium denim, they are perfect for casual outings, weekend wear, or when you want to embrace a timeless look.',
        inStock: true
    },
    
    // Formal Collection - Female
    {
        slug: 'elegant-formal-dress-black',
        title: 'Elegant Formal Dress - Black',
        category: 'Formal',
        price: 4599.00,
        image: '/assets/formal/female/image.png',
        description: 'A sophisticated black formal dress perfect for business meetings, conferences, and formal events.',
        fullDescription: 'This elegant black formal dress features premium fabric and impeccable tailoring. The classic design ensures you look professional and polished for any formal occasion. Perfect for corporate events, business meetings, or formal dinners.',
        inStock: true
    },
    {
        slug: 'professional-formal-shirt-navy',
        title: 'Professional Formal Shirt - Navy',
        category: 'Formal',
        price: 5299.00,
        image: '/assets/formal/female/image copy.png',
        description: 'A tailored navy blue formal shirt that exudes confidence and professionalism.',
        fullDescription: 'This professional navy blue formal shirt features expert tailoring and premium fabric. The structured design creates a powerful, confident look. Perfect for important business meetings, presentations, or formal corporate events.',
        inStock: true
    },
    {
        slug: 'classic-formal-shirt-set',
        title: 'Classic Formal Shirt Set',
        category: 'Formal',
        price: 4899.00,
        image: '/assets/formal/female/image copy 2.png',
        description: 'A timeless formal shirt set that never goes out of style. Perfect for the modern professional woman.',
        fullDescription: 'This classic formal shirt set features premium fabric and expert tailoring. The structured silhouette creates a powerful, confident look while maintaining comfort. Perfect for professional occasions and business meetings.',
        inStock: true
    },
    {
        slug: 'sophisticated-formal-ensemble',
        title: 'Sophisticated Formal Ensemble',
        category: 'Formal',
        price: 5499.00,
        image: '/assets/formal/female/image copy 3.png',
        description: 'A sophisticated formal ensemble designed for the executive woman who demands excellence.',
        fullDescription: 'This sophisticated formal ensemble combines modern design with classic elegance. The premium fabric and expert tailoring ensure a perfect fit and lasting quality. Perfect for board meetings, executive presentations, or high-profile corporate events.',
        inStock: true
    },
    {
        slug: 'executive-formal-attire',
        title: 'Executive Formal Attire',
        category: 'Formal',
        price: 5999.00,
        image: '/assets/formal/female/image copy 4.png',
        description: 'Premium executive formal attire that commands respect and attention in any professional setting.',
        fullDescription: 'This executive formal attire features the finest materials and meticulous attention to detail. The elegant design and perfect fit create a commanding presence. Ideal for C-level executives, formal business events, or prestigious corporate gatherings.',
        inStock: true
    },
    
    // Formal Collection - Male
    {
        slug: 'classic-formal-shirt-black',
        title: 'Classic Formal Shirt - Black',
        category: 'Formal',
        price: 6999.00,
        image: '/assets/formal/male/image.png',
        description: 'A timeless black formal shirt that defines sophistication and professionalism.',
        fullDescription: 'This classic black formal shirt features premium fabric and expert tailoring. The traditional design creates a sharp, professional appearance. Perfect for business meetings, formal events, or corporate functions.',
        inStock: true
    },
    {
        slug: 'navy-formal-business-shirt',
        title: 'Navy Formal Business Shirt',
        category: 'Formal',
        price: 7499.00,
        image: '/assets/formal/male/image copy.png',
        description: 'A sophisticated navy blue business shirt that combines style with professionalism.',
        fullDescription: 'This navy blue formal business shirt features premium fabric and modern tailoring. The contemporary fit and classic color make it versatile for various formal occasions. Perfect for important business meetings, conferences, or formal corporate events.',
        inStock: true
    },
    {
        slug: 'executive-formal-shirt-gray',
        title: 'Executive Formal Shirt - Gray',
        category: 'Formal',
        price: 7999.00,
        image: '/assets/formal/male/image copy 2.png',
        description: 'An elegant gray formal shirt designed for the modern executive professional.',
        fullDescription: 'This executive gray formal shirt features premium materials and expert craftsmanship. The sophisticated color and tailored fit create a distinguished appearance. Ideal for executive meetings, formal presentations, or high-profile business events.',
        inStock: true
    },
    {
        slug: 'premium-formal-shirt',
        title: 'Premium Formal Shirt',
        category: 'Formal',
        price: 8999.00,
        image: '/assets/formal/male/image copy 3.png',
        description: 'A luxurious formal shirt perfect for formal events and professional occasions.',
        fullDescription: 'This premium formal shirt features the finest materials and meticulous attention to detail. The classic design creates an elegant, sophisticated look. Perfect for formal events, business meetings, or prestigious occasions.',
        inStock: true
    },
    {
        slug: 'tailored-formal-shirt-charcoal',
        title: 'Tailored Formal Shirt - Charcoal',
        category: 'Formal',
        price: 8499.00,
        image: '/assets/formal/male/image copy 4.png',
        description: 'A perfectly tailored charcoal formal shirt that exudes confidence and style.',
        fullDescription: 'This tailored charcoal formal shirt features premium fabric and expert tailoring. The modern fit and sophisticated color create a powerful, confident appearance. Perfect for business executives, formal meetings, or important corporate events.',
        inStock: true
    },
    
    // Shoes Collection
    {
        slug: 'classic-leather-shoes',
        title: 'Classic Leather Shoes',
        category: 'Shoes',
        price: 3499.00,
        image: '/assets/shoes/image.png',
        description: 'Timeless classic leather shoes that combine elegance with durability. Perfect for formal and semi-formal occasions.',
        fullDescription: 'These classic leather shoes feature premium genuine leather construction and expert craftsmanship. The comfortable fit and timeless design make them perfect for business meetings, formal events, or everyday professional wear. Built to last with attention to detail.',
        inStock: true
    },
    {
        slug: 'premium-formal-oxfords',
        title: 'Premium Formal Oxfords',
        category: 'Shoes',
        price: 4299.00,
        image: '/assets/shoes/image copy.png',
        description: 'Premium formal Oxford shoes with impeccable craftsmanship. The perfect choice for business professionals.',
        fullDescription: 'These premium formal Oxfords feature superior leather quality and traditional brogue detailing. The refined design and comfortable construction make them ideal for corporate environments, formal meetings, or special occasions. A sophisticated addition to any professional wardrobe.',
        inStock: true
    },
    {
        slug: 'elegant-dress-shoes',
        title: 'Elegant Dress Shoes',
        category: 'Shoes',
        price: 3999.00,
        image: '/assets/shoes/image copy 2.png',
        description: 'Elegant dress shoes that elevate any formal outfit. Sophisticated design meets exceptional comfort.',
        fullDescription: 'These elegant dress shoes combine classic design with modern comfort technology. The premium materials and expert construction ensure durability and style. Perfect for formal events, business occasions, or when you want to make a polished impression.',
        inStock: true
    },
    {
        slug: 'professional-business-shoes',
        title: 'Professional Business Shoes',
        category: 'Shoes',
        price: 3799.00,
        image: '/assets/shoes/image copy 3.png',
        description: 'Professional business shoes designed for the modern executive. Comfort and style in perfect harmony.',
                    fullDescription: 'These professional business shoes feature premium leather and ergonomic design for all-day comfort. The versatile style works with formal shirts, dress pants, or business casual attire. Perfect for long work days, important meetings, or professional networking events.',
        inStock: true
    },
    {
        slug: 'sophisticated-leather-oxfords',
        title: 'Sophisticated Leather Oxfords',
        category: 'Shoes',
        price: 4599.00,
        image: '/assets/shoes/image copy 4.png',
        description: 'Sophisticated leather Oxfords with refined detailing. A statement piece for the discerning professional.',
        fullDescription: 'These sophisticated leather Oxfords feature premium full-grain leather and meticulous handcrafted details. The elegant design and superior construction make them a standout choice for executives, formal occasions, or anyone who appreciates fine footwear craftsmanship.',
        inStock: true
    },
    {
        slug: 'classic-formal-lace-ups',
        title: 'Classic Formal Lace-Ups',
        category: 'Shoes',
        price: 3499.00,
        image: '/assets/shoes/image copy 5.png',
        description: 'Classic formal lace-up shoes with traditional design. Versatile and timeless.',
        fullDescription: 'These classic formal lace-up shoes feature traditional design elements and premium materials. The comfortable fit and durable construction make them perfect for daily professional wear, formal events, or special occasions. A reliable choice for any formal wardrobe.',
        inStock: true
    },
    {
        slug: 'premium-executive-shoes',
        title: 'Premium Executive Shoes',
        category: 'Shoes',
        price: 4999.00,
        image: '/assets/shoes/image copy 6.png',
        description: 'Premium executive shoes crafted for leadership. Exceptional quality and sophisticated design.',
        fullDescription: 'These premium executive shoes represent the pinnacle of footwear craftsmanship. Made from the finest materials with attention to every detail, they are designed for those who demand excellence. Perfect for C-level executives, board meetings, or prestigious business events.',
        inStock: true
    },
    {
        slug: 'refined-business-oxfords',
        title: 'Refined Business Oxfords',
        category: 'Shoes',
        price: 4199.00,
        image: '/assets/shoes/image copy 7.png',
        description: 'Refined business Oxfords that combine classic elegance with modern comfort technology.',
        fullDescription: 'These refined business Oxfords feature premium leather construction and advanced comfort features. The elegant design works seamlessly with business attire, while the innovative comfort technology ensures all-day wearability. Perfect for professionals who value both style and comfort.',
        inStock: true
    },
    {
        slug: 'luxury-formal-footwear',
        title: 'Luxury Formal Footwear',
        category: 'Shoes',
        price: 5499.00,
        image: '/assets/shoes/image copy 8.png',
        description: 'Luxury formal footwear crafted with the finest materials. The ultimate expression of sophistication.',
        fullDescription: 'This luxury formal footwear represents the highest standard of shoemaking excellence. Handcrafted from premium materials with meticulous attention to detail, these shoes are designed for those who appreciate the finest things in life. Perfect for special occasions, formal galas, or when you want to make an unforgettable impression.',
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

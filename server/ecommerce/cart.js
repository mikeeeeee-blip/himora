// Cart Management System with localStorage

class CartManager {
    constructor() {
        this.cartKey = 'himora_cart';
        this.init();
    }

    init() {
        if (!this.getCart()) {
            this.saveCart([]);
        }
        this.updateCartBadge();
    }

    getCart() {
        try {
            const cart = localStorage.getItem(this.cartKey);
            return cart ? JSON.parse(cart) : [];
        } catch (e) {
            console.error('Error reading cart:', e);
            return [];
        }
    }

    saveCart(cart) {
        try {
            localStorage.setItem(this.cartKey, JSON.stringify(cart));
            this.updateCartBadge();
            this.dispatchCartUpdate();
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    }

    addItem(product, quantity = 1) {
        const cart = this.getCart();
        const existingItemIndex = cart.findIndex(item => item.product.slug === product.slug);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += quantity;
        } else {
            cart.push({
                product: {
                    slug: product.slug,
                    title: product.title,
                    price: product.price,
                    image: product.image,
                    category: product.category
                },
                quantity: quantity
            });
        }

        this.saveCart(cart);
        return cart;
    }

    removeItem(slug) {
        const cart = this.getCart();
        const filteredCart = cart.filter(item => item.product.slug !== slug);
        this.saveCart(filteredCart);
        return filteredCart;
    }

    updateQuantity(slug, quantity) {
        const cart = this.getCart();
        const item = cart.find(item => item.product.slug === slug);
        
        if (item) {
            if (quantity <= 0) {
                return this.removeItem(slug);
            }
            item.quantity = quantity;
            this.saveCart(cart);
        }
        return cart;
    }

    clearCart() {
        this.saveCart([]);
    }

    getTotalItems() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + item.quantity, 0);
    }

    getTotalPrice() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    }

    getCartData() {
        const cart = this.getCart();
        return {
            items: cart,
            subtotal: this.getTotalPrice(),
            total: this.getTotalPrice()
        };
    }

    updateCartBadge() {
        const badge = document.getElementById('cart-badge');
        const count = this.getTotalItems();
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    dispatchCartUpdate() {
        window.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: { cart: this.getCart(), total: this.getTotalItems() }
        }));
    }
}

// Initialize global cart manager
const cartManager = new CartManager();


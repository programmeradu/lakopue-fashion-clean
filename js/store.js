const STORE = (() => {
    const CART_KEY = 'lakopue_cart_v1';

    const formatMoney = (value, currency = 'USD') => {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
        } catch {
            return `$${Number(value).toFixed(2)}`;
        }
    };

    const readCart = () => {
        try {
            const raw = localStorage.getItem(CART_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const writeCart = (items) => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
        window.dispatchEvent(new CustomEvent('lakopue:cart-updated'));
    };

    const addToCart = ({ productId, qty = 1 }) => {
        const cart = readCart();
        const existing = cart.find(i => i.productId === productId);
        if (existing) {
            existing.qty += qty;
        } else {
            cart.push({ productId, qty });
        }
        writeCart(cart);
    };

    const setQty = ({ productId, qty }) => {
        const cart = readCart()
            .map(i => (i.productId === productId ? { ...i, qty } : i))
            .filter(i => i.qty > 0);
        writeCart(cart);
    };

    const removeFromCart = ({ productId }) => {
        const cart = readCart().filter(i => i.productId !== productId);
        writeCart(cart);
    };

    const clearCart = () => writeCart([]);

    const fetchCatalog = async () => {
        const res = await fetch('data/products.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load catalog');
        return await res.json();
    };

    const getYouTubeId = (url) => {
        if (!url) return '';
        const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
        const match = url.match(regExp);
        return match && match[1] ? match[1] : '';
    };

    const renderShop = async () => {
        const grid = document.querySelector('[data-shop-grid]');
        const filters = document.querySelectorAll('[data-shop-filter]');
        if (!grid) return;

        const catalog = await fetchCatalog();
        const currency = catalog.currency || 'USD';
        const products = catalog.products || [];

        const makeCard = (p) => {
            const el = document.createElement('article');
            el.className = 'shop-card';
            el.setAttribute('data-category', p.category);
            el.innerHTML = `
                <a class="shop-card-link" href="product.html?id=${encodeURIComponent(p.id)}">
                    <div class="shop-card-image">
                        <img src="${p.images?.[0] || ''}" alt="${p.name}">
                    </div>
                    <div class="shop-card-body">
                        <h3 class="shop-card-title">${p.name}</h3>
                        <p class="shop-card-desc">${p.shortDescription || ''}</p>
                        <div class="shop-card-footer">
                            <span class="shop-card-price">${formatMoney(p.price, currency)}</span>
                            <span class="shop-card-cta">View</span>
                        </div>
                    </div>
                </a>
            `;
            return el;
        };

        grid.innerHTML = '';
        products.forEach(p => grid.appendChild(makeCard(p)));

        const apply = (category) => {
            const cards = grid.querySelectorAll('.shop-card');
            cards.forEach(card => {
                const c = card.getAttribute('data-category');
                const show = category === 'All' || c === category;
                card.style.display = show ? '' : 'none';
            });
        };

        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                apply(btn.getAttribute('data-shop-filter') || 'All');
            });
        });

        apply('All');
    };

    const renderProduct = async () => {
        const mount = document.querySelector('[data-product]');
        if (!mount) return;

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id') || '';

        const catalog = await fetchCatalog();
        const currency = catalog.currency || 'USD';
        const products = catalog.products || [];
        const p = products.find(x => x.id === id);

        if (!p) {
            mount.innerHTML = `<p class="product-missing">This product could not be found.</p>`;
            return;
        }

        const images = Array.isArray(p.images) ? p.images : [];
        const main = images[0] || '';

        mount.innerHTML = `
            <div class="product-shell">
                <div class="product-gallery">
                    <div class="product-main">
                        <img src="${main}" alt="${p.name}" data-product-main>
                    </div>
                    <div class="product-thumbs">
                        ${images.map((src, idx) => `
                            <button class="product-thumb ${idx === 0 ? 'active' : ''}" type="button" data-thumb-src="${src}">
                                <img src="${src}" alt="${p.name} thumbnail ${idx + 1}">
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="product-info">
                    <p class="product-kicker">${p.category || ''}</p>
                    <h1 class="product-title">${p.name}</h1>
                    <p class="product-price">${formatMoney(p.price, currency)}</p>
                    <p class="product-desc">${p.description || ''}</p>
                    <div class="product-actions">
                        <label class="product-qty">
                            <span class="sr-only">Quantity</span>
                            <input type="number" min="1" value="1" />
                        </label>
                        <button class="product-add" type="button">Add to bag</button>
                    </div>
                    <p class="product-fineprint">This is a demo checkout flow. For production payments, we can integrate Stripe/Shopify.</p>
                </div>
            </div>
        `;

        const mainImg = mount.querySelector('[data-product-main]');
        mount.querySelectorAll('.product-thumb').forEach(btn => {
            btn.addEventListener('click', () => {
                mount.querySelectorAll('.product-thumb').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const src = btn.getAttribute('data-thumb-src');
                if (mainImg && src) mainImg.src = src;
            });
        });

        const qtyInput = mount.querySelector('.product-qty input');
        const addBtn = mount.querySelector('.product-add');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const qty = Math.max(1, Number(qtyInput?.value || 1));
                addToCart({ productId: p.id, qty });
                addBtn.textContent = 'Added';
                setTimeout(() => (addBtn.textContent = 'Add to bag'), 1000);
            });
        }
    };

    const renderCart = async () => {
        const mount = document.querySelector('[data-cart]');
        if (!mount) return;

        const catalog = await fetchCatalog();
        const currency = catalog.currency || 'USD';
        const products = catalog.products || [];

        const hydrate = () => {
            const cart = readCart();
            const lines = cart.map(item => {
                const p = products.find(x => x.id === item.productId);
                return p ? { ...item, product: p } : null;
            }).filter(Boolean);

            const subtotal = lines.reduce((sum, l) => sum + (l.product.price * l.qty), 0);

            mount.innerHTML = `
                <div class="cart-shell">
                    <div class="cart-list">
                        <h1 class="cart-title">Shopping Bag</h1>
                        ${lines.length === 0 ? `<p class="cart-empty">Your bag is empty.</p>` : `
                            ${lines.map(l => `
                                <div class="cart-item" data-product-id="${l.productId}">
                                    <div class="cart-item-img">
                                        <img src="${l.product.images?.[0] || ''}" alt="${l.product.name}">
                                    </div>
                                    <div class="cart-item-info">
                                        <div class="cart-item-top">
                                            <div>
                                                <p class="cart-item-kicker">${l.product.category || ''}</p>
                                                <p class="cart-item-name">${l.product.name}</p>
                                            </div>
                                            <button class="cart-remove" type="button" aria-label="Remove">Remove</button>
                                        </div>
                                        <div class="cart-item-bottom">
                                            <label class="cart-qty">
                                                <span class="sr-only">Quantity</span>
                                                <input type="number" min="1" value="${l.qty}" />
                                            </label>
                                            <span class="cart-item-price">${formatMoney(l.product.price * l.qty, currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        `}
                    </div>
                    <aside class="cart-summary">
                        <div class="cart-summary-card">
                            <p class="cart-summary-kicker">Order Summary</p>
                            <div class="cart-summary-row">
                                <span>Subtotal</span>
                                <span>${formatMoney(subtotal, currency)}</span>
                            </div>
                            <div class="cart-summary-row faint">
                                <span>Shipping</span>
                                <span>Calculated at checkout</span>
                            </div>
                            <a class="cart-checkout ${lines.length === 0 ? 'disabled' : ''}" href="${lines.length === 0 ? 'shop.html' : 'checkout.html'}">
                                ${lines.length === 0 ? 'Browse shop' : 'Proceed to checkout'}
                            </a>
                            <p class="cart-summary-fine">Secure checkout can be integrated with Stripe/Shopify.</p>
                        </div>
                    </aside>
                </div>
            `;

            mount.querySelectorAll('.cart-item').forEach(row => {
                const productId = row.getAttribute('data-product-id');
                const qtyInput = row.querySelector('.cart-qty input');
                const removeBtn = row.querySelector('.cart-remove');
                if (qtyInput && productId) {
                    qtyInput.addEventListener('change', () => {
                        const qty = Math.max(1, Number(qtyInput.value || 1));
                        setQty({ productId, qty });
                        hydrate();
                    });
                }
                if (removeBtn && productId) {
                    removeBtn.addEventListener('click', () => {
                        removeFromCart({ productId });
                        hydrate();
                    });
                }
            });
        };

        hydrate();
        window.addEventListener('lakopue:cart-updated', hydrate);
    };

    const renderCheckout = async () => {
        const mount = document.querySelector('[data-checkout]');
        if (!mount) return;

        const catalog = await fetchCatalog();
        const currency = catalog.currency || 'USD';
        const products = catalog.products || [];
        const cart = readCart();

        const lines = cart.map(item => {
            const p = products.find(x => x.id === item.productId);
            return p ? { ...item, product: p } : null;
        }).filter(Boolean);

        const subtotal = lines.reduce((sum, l) => sum + (l.product.price * l.qty), 0);

        mount.innerHTML = `
            <div class="checkout-shell">
                <div class="checkout-card">
                    <h1 class="checkout-title">Checkout</h1>
                    <p class="checkout-note">This is a premium demo checkout flow (no payment processing yet).</p>
                    <form id="checkoutForm" class="checkout-form">
                        <div class="checkout-grid">
                            <label class="checkout-field">
                                <span>Full name</span>
                                <input type="text" name="name" required autocomplete="name" />
                            </label>
                            <label class="checkout-field">
                                <span>Email</span>
                                <input type="email" name="email" required autocomplete="email" />
                            </label>
                            <label class="checkout-field checkout-field--full">
                                <span>Address</span>
                                <input type="text" name="address" required autocomplete="street-address" />
                            </label>
                            <label class="checkout-field">
                                <span>City</span>
                                <input type="text" name="city" required autocomplete="address-level2" />
                            </label>
                            <label class="checkout-field">
                                <span>Country</span>
                                <input type="text" name="country" required autocomplete="country-name" />
                            </label>
                        </div>
                        <button class="checkout-submit" type="submit">Place order</button>
                        <p class="checkout-success" role="status" aria-live="polite"></p>
                    </form>
                </div>
                <aside class="checkout-summary">
                    <div class="checkout-summary-card">
                        <p class="checkout-summary-kicker">Order Summary</p>
                        ${lines.length === 0 ? `<p class="checkout-empty">Your bag is empty.</p>` : `
                            ${lines.map(l => `
                                <div class="checkout-line">
                                    <span>${l.product.name} × ${l.qty}</span>
                                    <span>${formatMoney(l.product.price * l.qty, currency)}</span>
                                </div>
                            `).join('')}
                        `}
                        <div class="checkout-total">
                            <span>Subtotal</span>
                            <span>${formatMoney(subtotal, currency)}</span>
                        </div>
                        <a class="checkout-back" href="cart.html">Back to bag</a>
                    </div>
                </aside>
            </div>
        `;

        const form = mount.querySelector('#checkoutForm');
        const success = mount.querySelector('.checkout-success');
        const submit = mount.querySelector('.checkout-submit');

        if (form && success && submit) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                submit.disabled = true;
                submit.textContent = 'Processing…';
                setTimeout(() => {
                    success.textContent = 'Order received. A confirmation email will be sent shortly.';
                    clearCart();
                    submit.textContent = 'Placed';
                }, 600);
            });
        }
    };

    const init = async () => {
        // keep existing YouTube oEmbed helper behavior (used on media page)
        const mediaGrid = document.querySelector('.media-grid');
        const mediaCards = document.querySelectorAll('.media-card');
        if (mediaGrid && mediaCards.length) {
            mediaCards.forEach(card => {
                const videoUrl = card.getAttribute('data-video-url');
                const imgEl = card.querySelector('.media-thumb img');
                const titleEl = card.querySelector('.media-card-title');
                if (!videoUrl) return;
                fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(videoUrl))
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (!data) return;
                        if (titleEl && !titleEl.textContent) titleEl.textContent = data.title;
                        if (imgEl && !imgEl.getAttribute('src')) {
                            imgEl.src = data.thumbnail_url;
                            imgEl.alt = data.title || 'Video thumbnail';
                        }
                    })
                    .catch(() => {
                        if (imgEl && !imgEl.getAttribute('src')) {
                            const id = getYouTubeId(videoUrl);
                            if (id) imgEl.src = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';
                        }
                    });
            });
        }

        await Promise.allSettled([renderShop(), renderProduct(), renderCart(), renderCheckout()]);
    };

    return { init, formatMoney, readCart, addToCart, clearCart };
})();

window.addEventListener('DOMContentLoaded', () => {
    STORE.init().catch(() => {});
});


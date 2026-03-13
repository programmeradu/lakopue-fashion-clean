// Loader
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.querySelector('.loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.8s ease';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 800);
        }
        document.body.classList.add('body-loaded');
    }, 2500);
});

// Navigation Scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (nav) {
        if (window.scrollY > 100) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }
});

// Mobile Menu (initialized after layout injection)
const initMobileMenu = () => {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!mobileToggle || !mobileMenu || mobileToggle.dataset.bound === 'true') return;

    mobileToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        mobileToggle.classList.toggle('active');
    });

    mobileToggle.dataset.bound = 'true';
};

document.addEventListener('layout:ready', initMobileMenu);

// Smooth Scroll (for same-page anchors)
document.addEventListener('layout:ready', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href) return;
            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });

            const mobileMenu = document.querySelector('.mobile-menu');
            const mobileToggle = document.querySelector('.mobile-toggle');
            if (mobileMenu) mobileMenu.classList.remove('active');
            if (mobileToggle) mobileToggle.classList.remove('active');
        });
    });

    // Special case: nav "News" links pointing to index.html#news
    document.querySelectorAll('a[href="index.html#news"]').forEach(link => {
        link.addEventListener('click', function (e) {
            if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                e.preventDefault();
                const target = document.querySelector('#news');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Intersection Observer
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.collection-item, .news-card, .section-header, .editorial-text, .quote-banner, .heritage-content, .footer-grid > div, .media-hero-inner, .media-card, .show-look-card, .show-notes-inner, .collections-hero-inner, .collections-card, .gallery-hero-inner, .gallery-item, .craft-hero-inner, .craft-chapter, .craft-detail, .contact-hero-inner, .contact-card, .contact-aside-card, .faq-hero-inner, .faq-group, .faq-cta').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(40px)';
    el.style.transition = 'all 0.8s ease';
    observer.observe(el);
});

// Hero color reveal (press and hold)
const hero = document.querySelector('.hero');

if (hero) {
    const activateColor = () => {
        hero.classList.add('is-colored');
    };

    const deactivateColor = () => {
        hero.classList.remove('is-colored');
    };

    hero.addEventListener('mousedown', activateColor);
    hero.addEventListener('mouseup', deactivateColor);
    hero.addEventListener('mouseleave', deactivateColor);

    hero.addEventListener('touchstart', () => {
        activateColor();
    }, { passive: true });

    hero.addEventListener('touchend', deactivateColor);
    hero.addEventListener('touchcancel', deactivateColor);
}

// Hero logo interaction: swap hero image on hover / tap
const heroBg = document.querySelector('.hero-bg');
const heroLogo = document.querySelector('.hero-logo');

if (heroBg && heroLogo) {
    const primarySrc = heroBg.getAttribute('data-hero-primary') || heroBg.getAttribute('src');
    const altSrc = heroBg.getAttribute('data-hero-alt');
    let showingAlt = false;

    if (altSrc) {
        const preload = new Image();
        preload.src = altSrc;
    }

    const swapImage = (targetSrc) => {
        if (!targetSrc) return;
        heroBg.style.opacity = '0';
        setTimeout(() => {
            heroBg.setAttribute('src', targetSrc);
            heroBg.style.opacity = '1';
        }, 200);
    };

    const showAlt = () => {
        if (!altSrc || showingAlt) return;
        swapImage(altSrc);
        showingAlt = true;
    };

    const showPrimary = () => {
        if (!showingAlt) return;
        swapImage(primarySrc);
        showingAlt = false;
    };

    heroLogo.addEventListener('mouseenter', showAlt);
    heroLogo.addEventListener('mouseleave', showPrimary);

    heroLogo.addEventListener('click', (event) => {
        event.preventDefault();
        if (showingAlt) {
            showPrimary();
        } else {
            showAlt();
        }
    });

    heroLogo.addEventListener('touchstart', (event) => {
        event.preventDefault();
        if (showingAlt) {
            showPrimary();
        } else {
            showAlt();
        }
    }, { passive: false });
}

// Media: filters and modal
const mediaGrid = document.querySelector('.media-grid');
const mediaCards = document.querySelectorAll('.media-card');
const mediaFilters = document.querySelectorAll('.media-filter');
const mediaModal = document.querySelector('.media-modal');
const mediaModalIframe = mediaModal ? mediaModal.querySelector('.media-modal-iframe') : null;
const mediaModalTitle = mediaModal ? mediaModal.querySelector('.media-modal-title') : null;
const mediaModalDetails = mediaModal ? mediaModal.querySelector('.media-modal-details') : null;
const mediaModalClose = mediaModal ? mediaModal.querySelector('.media-modal-close') : null;

// helper to extract YouTube video ID
const getYouTubeId = (url) => {
    if (!url) return '';
    const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1] ? match[1] : '';
};

if (mediaGrid && mediaCards.length && mediaModal && mediaModalIframe && mediaModalTitle && mediaModalDetails) {
    // dynamically fetch titles & thumbnails via YouTube oEmbed
    mediaCards.forEach(card => {
        const videoUrl = card.getAttribute('data-video-url');
        const imgEl = card.querySelector('.media-thumb img');
        const titleEl = card.querySelector('.media-card-title');

        if (!videoUrl) return;

        fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(videoUrl))
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (!data) return;
                if (titleEl && !titleEl.textContent) {
                    titleEl.textContent = data.title;
                }
                if (imgEl && !imgEl.getAttribute('src')) {
                    imgEl.src = data.thumbnail_url;
                    imgEl.alt = data.title || 'Video thumbnail';
                }
            })
            .catch(() => {
                if (imgEl && !imgEl.getAttribute('src')) {
                    const idFallback = getYouTubeId(videoUrl);
                    if (idFallback) {
                        imgEl.src = 'https://img.youtube.com/vi/' + idFallback + '/hqdefault.jpg';
                    }
                }
            });
    });
    mediaFilters.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');

            mediaFilters.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            mediaCards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (!filter || filter === 'all' || category === filter) {
                    card.classList.remove('is-hidden');
                } else {
                    card.classList.add('is-hidden');
                }
            });
        });
    });

    const openMediaModal = (card) => {
        const videoUrl = card.getAttribute('data-video-url');
        const title = card.querySelector('.media-card-title')?.textContent || '';
        const meta = card.querySelector('.media-card-meta')?.textContent || '';

        if (!videoUrl) return;

        const videoId = getYouTubeId(videoUrl);
        if (!videoId) return;

        const embedUrl = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&modestbranding=1';

        mediaModalIframe.src = embedUrl;
        mediaModalTitle.textContent = title;
        mediaModalDetails.textContent = meta;

        mediaModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    const closeMediaModal = () => {
        mediaModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        if (mediaModalIframe) {
            mediaModalIframe.src = '';
        }
    };

    mediaCards.forEach(card => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('.media-card-link')) {
                return;
            }
            openMediaModal(card);
        });
    });

    if (mediaModalClose) {
        mediaModalClose.addEventListener('click', closeMediaModal);
    }

    if (mediaModal) {
        mediaModal.addEventListener('click', (event) => {
            if (event.target === mediaModal) {
                closeMediaModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mediaModal.classList.contains('active')) {
            closeMediaModal();
        }
    });
}

// Show look modal
const showLookCards = document.querySelectorAll('.show-look-card');
const lookModal = document.querySelector('.look-modal');
const lookModalImage = lookModal ? lookModal.querySelector('.look-modal-image') : null;
const lookModalTitle = lookModal ? lookModal.querySelector('.look-modal-title') : null;
const lookModalDesc = lookModal ? lookModal.querySelector('.look-modal-desc') : null;
const lookModalClose = lookModal ? lookModal.querySelector('.look-modal-close') : null;

if (showLookCards.length && lookModal && lookModalImage && lookModalTitle && lookModalDesc) {
    const openLookModal = (card) => {
        const fullSrc = card.getAttribute('data-look-full') || card.querySelector('img')?.src;
        const title = card.querySelector('.show-look-number')?.textContent || '';
        const desc = card.querySelector('.show-look-desc')?.textContent || '';

        if (!fullSrc) return;

        lookModalImage.src = fullSrc;
        lookModalTitle.textContent = title;
        lookModalDesc.textContent = desc;

        lookModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    const closeLookModal = () => {
        lookModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        lookModalImage.removeAttribute('src');
    };

    showLookCards.forEach(card => {
        card.addEventListener('click', () => openLookModal(card));
    });

    if (lookModalClose) {
        lookModalClose.addEventListener('click', closeLookModal);
    }

    lookModal.addEventListener('click', (event) => {
        if (event.target === lookModal) {
            closeLookModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && lookModal.classList.contains('active')) {
            closeLookModal();
        }
    });
}

// Gallery filters & modal
const galleryGrid = document.querySelector('.gallery-grid');
const galleryItems = document.querySelectorAll('.gallery-item');
const galleryFilters = document.querySelectorAll('.gallery-filter');
const galleryModal = document.querySelector('.gallery-modal');
const galleryModalImage = galleryModal ? galleryModal.querySelector('.gallery-modal-image') : null;
const galleryModalCaption = galleryModal ? galleryModal.querySelector('.gallery-modal-caption') : null;
const galleryModalClose = galleryModal ? galleryModal.querySelector('.gallery-modal-close') : null;

if (galleryGrid && galleryItems.length && galleryModal && galleryModalImage && galleryModalCaption) {
    galleryFilters.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');

            galleryFilters.forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (!filter || filter === 'all' || category === filter) {
                    item.classList.remove('is-hidden');
                } else {
                    item.classList.add('is-hidden');
                }
            });
        });
    });

    const openGalleryModal = (item) => {
        const src = item.querySelector('img')?.src;
        const caption = item.getAttribute('data-caption') || '';

        if (!src) return;

        galleryModalImage.src = src;
        galleryModalCaption.textContent = caption;

        galleryModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    const closeGalleryModal = () => {
        galleryModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        galleryModalImage.removeAttribute('src');
    };

    galleryItems.forEach(item => {
        item.addEventListener('click', () => openGalleryModal(item));
    });

    if (galleryModalClose) {
        galleryModalClose.addEventListener('click', closeGalleryModal);
    }

    galleryModal.addEventListener('click', (event) => {
        if (event.target === galleryModal) {
            closeGalleryModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && galleryModal.classList.contains('active')) {
            closeGalleryModal();
        }
    });
}

// Craft detail modal
const craftDetails = document.querySelectorAll('.craft-detail');
const craftModal = document.querySelector('.craft-modal');
const craftModalImage = craftModal ? craftModal.querySelector('.craft-modal-image') : null;
const craftModalCaption = craftModal ? craftModal.querySelector('.craft-modal-caption') : null;
const craftModalClose = craftModal ? craftModal.querySelector('.craft-modal-close') : null;

if (craftDetails.length && craftModal && craftModalImage && craftModalCaption) {
    const openCraftModal = (item) => {
        const src = item.querySelector('img')?.src;
        const caption = item.getAttribute('data-caption') || '';
        if (!src) return;

        craftModalImage.src = src;
        craftModalCaption.textContent = caption;
        craftModal.classList.add('active');
        document.body.classList.add('modal-open');
    };

    const closeCraftModal = () => {
        craftModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        craftModalImage.removeAttribute('src');
    };

    craftDetails.forEach(item => {
        item.addEventListener('click', () => openCraftModal(item));
    });

    if (craftModalClose) {
        craftModalClose.addEventListener('click', closeCraftModal);
    }

    craftModal.addEventListener('click', (event) => {
        if (event.target === craftModal) {
            closeCraftModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && craftModal.classList.contains('active')) {
            closeCraftModal();
        }
    });
}

// Boutiques filter
const boutiqueGrid = document.getElementById('boutiqueGrid');
const boutiqueSearch = document.getElementById('boutiqueSearch');
const boutiqueRegion = document.getElementById('boutiqueRegion');
const boutiqueEmpty = document.getElementById('boutiqueEmpty');

if (boutiqueGrid && boutiqueSearch && boutiqueRegion) {
    const boutiqueCards = Array.from(boutiqueGrid.querySelectorAll('.boutique-card'));

    const applyBoutiqueFilters = () => {
        const q = (boutiqueSearch.value || '').trim().toLowerCase();
        const region = boutiqueRegion.value || 'all';

        let visibleCount = 0;

        boutiqueCards.forEach(card => {
            const cardRegion = card.getAttribute('data-region') || '';
            const haystack = (card.getAttribute('data-search') || '').toLowerCase();

            const matchesRegion = region === 'all' || cardRegion === region;
            const matchesQuery = !q || haystack.includes(q);

            const show = matchesRegion && matchesQuery;
            card.style.display = show ? '' : 'none';
            if (show) visibleCount += 1;
        });

        if (boutiqueEmpty) {
            boutiqueEmpty.textContent = visibleCount === 0 ? 'No boutiques match your search.' : '';
        }
    };

    boutiqueSearch.addEventListener('input', applyBoutiqueFilters);
    boutiqueRegion.addEventListener('change', applyBoutiqueFilters);
    applyBoutiqueFilters();
}

// Appointments form (client-side confirmation)
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
    const successEl = appointmentForm.querySelector('.appt-success');
    appointmentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (successEl) {
            successEl.textContent = 'Request received. A client advisor will contact you shortly to confirm availability.';
        }
        appointmentForm.reset();
    });
}

// Contact form (client-side confirmation)
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    const successEl = contactForm.querySelector('.contact-success');
    contactForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (successEl) {
            successEl.textContent = 'Message received. A member of the Maison will respond shortly.';
        }
        contactForm.reset();
    });
}

// FAQ accordion
const faqItems = document.querySelectorAll('.faq-item');
if (faqItems.length) {
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-q');
        const panel = item.querySelector('.faq-a');
        if (!btn || !panel) return;

        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            faqItems.forEach(i => {
                i.classList.remove('open');
                const b = i.querySelector('.faq-q');
                const p = i.querySelector('.faq-a');
                if (b) b.setAttribute('aria-expanded', 'false');
                if (p) p.hidden = true;
            });

            if (!isOpen) {
                item.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
                panel.hidden = false;
            }
        });
    });
}

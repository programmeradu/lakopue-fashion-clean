document.addEventListener('DOMContentLoaded', () => {
    const includeEls = Array.from(document.querySelectorAll('[data-include]'));
    if (!includeEls.length) {
        document.dispatchEvent(new CustomEvent('layout:ready'));
        return;
    }

    const loads = includeEls.map(el => {
        const name = el.getAttribute('data-include');
        if (!name) return Promise.resolve();

        return fetch(`partials/${name}.html`, { cache: 'no-store' })
            .then(response => response.ok ? response.text() : '')
            .then(html => {
                if (html) {
                    el.outerHTML = html;
                }
            })
            .catch(() => {
                // Fail silently; page still works with no injected partial
            });
    });

    Promise.all(loads).then(() => {
        document.dispatchEvent(new CustomEvent('layout:ready'));
    });
});


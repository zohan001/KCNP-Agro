/**
 * Header, footer and mobile-menu wiring for the two signed-in utility pages
 * (verification and orders). The marketing pages ship their own copy of this
 * markup inline; these two pages are generated from a single source so the
 * auth-aware slots cannot drift apart.
 */
(function () {
    'use strict';

    var NAV = [
        ['/', 'nav_home', 'Home'],
        ['/marketplace', 'nav_marketplace', 'Marketplace'],
        ['/education', 'nav_education', 'Education'],
        ['/market-insights', 'nav_insights', 'Market Insights'],
        ['/pricing', 'nav_pricing', 'Pricing']
    ];
    var AUTH_NAV = [
        ['/dashboard', 'nav_dashboard', 'Dashboard'],
        ['/orders', 'Orders', 'My Orders'],
        ['/verification', '', 'Verify Identity'],
        ['/admin', '', 'Admin Panel']
    ];

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function readStored(name) {
        try {
            var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
            if (m) return decodeURIComponent(m[1]);
        } catch (e) { /* ignore */ }
        try { return localStorage.getItem(name); } catch (e) { return null; }
    }

    function currentUser() {
        try {
            return JSON.parse(readStored('kcnp_user') || readStored('user') || 'null');
        } catch (e) { return null; }
    }

    function hasToken() {
        return Boolean(readStored('kcnp_token') || readStored('token'));
    }

    function logout() {
        try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
        ['kcnp_token', 'kcnp_user', 'token', 'user'].forEach(function (n) {
            document.cookie = n + '=; path=/; max-age=0';
        });
        window.location.href = '/login';
    }

    function link(href, labelKey, label, extra) {
        return '<a href="' + href + '" class="' + (extra || 'text-sm font-medium text-gray-700 hover:text-primary-400 transition-colors duration-300') + '">' +
            (labelKey ? '<span data-i18n="' + labelKey + '">' + label + '</span>' : label) +
            '</a>';
    }

    var INLINE_CLS = 'text-sm font-medium text-gray-700 hover:text-primary-400 transition-colors duration-300';
    var BLOCK_CLS = 'block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-400 hover:bg-primary-50 transition-all duration-300';

    function authLinks(cls) {
        var user = currentUser();
        if (!user) return '';
        var name = String(user.name || '').split(' ')[0] || 'Account';
        var html = '';
        AUTH_NAV.forEach(function (item) {
            if (item[0] === '/verification' && user.role !== 'farmer') return;
            if (item[0] === '/admin' && user.role !== 'admin') return;
            html += link(item[0], item[1], item[2], cls);
        });
        html += '<a href="#" class="' + cls + '" data-chrome-logout>Logout (' + esc(name) + ')</a>';
        return html;
    }

    function buildHeader() {
        var nav = '';
        NAV.forEach(function (i) { nav += link(i[0], i[1], i[2]); });
        nav += link('/dashboard', 'nav_dashboard', 'Dashboard');

        var mobile = '';
        NAV.forEach(function (i) {
            mobile += link(i[0], i[1], i[2], 'block px-4 py-3 rounded-lg text-gray-700 hover:text-primary-400 hover:bg-primary-50 transition-all duration-300') + '\n';
        });

        return '' +
    '<header id="navbar" class="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-gray-200">\n' +
    '        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Main navigation">\n' +
    '            <div class="flex items-center justify-between h-16 md:h-20">\n' +
    '                <a href="/" class="flex items-center gap-2 group" aria-label="KCNP Agro Home">\n' +
    '                    <img src="/logo.jpg" alt="KCNP Agro logo" class="w-10 h-10 rounded-xl object-cover transition-transform duration-300 group-hover:scale-110" width="40" height="40">\n' +
    '                    <span class="font-heading font-bold text-xl text-gray-900">KCNP<span class="text-primary-400">Agro</span></span>\n' +
    '                </a>\n' +
    '                <div class="hidden md:flex items-center gap-6 lg:gap-8">' + nav + '\n' +
    '                    <span id="nav-auth-desktop" class="hidden md:inline-flex"></span>\n' +
    '                </div>\n' +
    '                <button id="mobile-menu-btn" class="hamburger md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5" aria-label="Toggle mobile menu" aria-expanded="false" aria-controls="mobile-menu">\n' +
    '                    <span class="block w-6 h-0.5 bg-gray-800 rounded-full"></span>\n' +
    '                    <span class="block w-6 h-0.5 bg-gray-800 rounded-full"></span>\n' +
    '                    <span class="block w-6 h-0.5 bg-gray-800 rounded-full"></span>\n' +
    '                </button>\n' +
    '            </div>\n' +
    '            <div id="mobile-menu" class="mobile-menu closed md:hidden pb-4" role="menu">\n' +
    '                <div class="flex flex-col gap-2 pt-2">\n' + mobile +
    '                    <div id="nav-auth-mobile" class="pt-2 px-4"></div>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '        </nav>\n' +
    '    </header>';
    }

    function buildFooter() {
        var year = new Date().getFullYear();
        return '' +
    '<footer class="border-t border-gray-200 py-12 md:py-16" role="contentinfo">\n' +
    '        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">\n' +
    '            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">\n' +
    '                <div>\n' +
    '                    <a href="/" class="flex items-center gap-2 mb-4" aria-label="KCNP Agro Home">\n' +
    '                        <img src="/logo.jpg" alt="KCNP Agro logo" class="w-10 h-10 rounded-xl object-cover" width="40" height="40">\n' +
    '                        <span class="font-heading font-bold text-xl text-gray-900">KCNP<span class="text-primary-400">Agro</span></span>\n' +
    '                    </a>\n' +
    '                    <p class="text-gray-500 text-sm leading-relaxed mb-6">Promoting climate smart agriculture and trade initiatives for sustainable economic growth worldwide.</p>\n' +
    '                </div>\n' +
    '                <div>\n' +
    '                    <h3 class="text-gray-900 font-semibold text-sm uppercase tracking-wider mb-4">Quick Links</h3>\n' +
    '                    <ul class="space-y-3">\n' +
    '                        <li>' + link('/marketplace', 'nav_marketplace', 'Marketplace', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/education', 'nav_education', 'Education', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/dashboard', 'nav_dashboard', 'Dashboard', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/orders', '', 'My Orders', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                    </ul>\n' +
    '                </div>\n' +
    '                <div>\n' +
    '                    <h3 class="text-gray-900 font-semibold text-sm uppercase tracking-wider mb-4">Services</h3>\n' +
    '                    <ul class="space-y-3">\n' +
    '                        <li>' + link('/education', '', 'Climate Smart Farming', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/marketplace', '', 'Trade Facilitation', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/pricing', 'nav_pricing', 'Pricing', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                    </ul>\n' +
    '                </div>\n' +
    '                <div>\n' +
    '                    <h3 class="text-gray-900 font-semibold text-sm uppercase tracking-wider mb-4">Account</h3>\n' +
    '                    <ul class="space-y-3">\n' +
    '                        <li>' + link('/verification', '', 'Farmer Verification', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/orders', '', 'Track Orders', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                        <li>' + link('/contact', '', 'Contact Support', 'text-gray-500 hover:text-primary-400 text-sm transition-colors') + '</li>\n' +
    '                    </ul>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">\n' +
    '                <p>&copy; ' + year + ' KCNP Agro. All rights reserved.</p>\n' +
    '                <div class="flex gap-6">\n' +
    '                    ' + link('/terms', '', 'Terms of Service', 'text-gray-500 hover:text-primary-400 transition-colors') + '\n' +
    '                    ' + link('/privacy', '', 'Privacy Policy', 'text-gray-500 hover:text-primary-400 transition-colors') + '\n' +
    '                </div>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </footer>';
    }

    function renderAuthSlots() {
        var signedIn = hasToken() && currentUser();
        var desktop = document.getElementById('nav-auth-desktop');
        var mobile = document.getElementById('nav-auth-mobile');

        if (desktop) {
            desktop.className = signedIn ? 'hidden md:inline-flex items-center gap-6' : 'hidden';
            desktop.innerHTML = signedIn ? authLinks(INLINE_CLS) : '';
        }
        if (mobile) {
            if (signedIn) {
                mobile.className = 'pt-2 px-4 flex flex-col gap-2';
                mobile.innerHTML = authLinks(BLOCK_CLS);
            } else {
                mobile.className = 'pt-2 px-4';
                mobile.innerHTML = '<a href="/login" class="block text-center px-5 py-3 rounded-xl border border-gray-300 text-gray-900 font-semibold text-sm">Log in</a>';
            }
        }

        document.querySelectorAll('[data-chrome-logout]').forEach(function (el) {
            if (el.getAttribute('data-bound')) return;
            el.setAttribute('data-bound', '1');
            el.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        });
    }

    function wireMobileMenu() {
        var btn = document.getElementById('mobile-menu-btn');
        var menu = document.getElementById('mobile-menu');
        if (!btn || !menu || btn.getAttribute('data-bound')) return;
        btn.setAttribute('data-bound', '1');
        btn.addEventListener('click', function () {
            var open = menu.classList.contains('open');
            menu.classList.toggle('open', !open);
            menu.classList.toggle('closed', open);
            btn.classList.toggle('active', !open);
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        });
    }

    window.KCNPChrome = { logout: logout };

    function init() {
        var header = document.getElementById('site-header');
        if (header && !header.innerHTML.trim()) header.outerHTML = buildHeader();
        var footer = document.getElementById('site-footer');
        if (footer && !footer.innerHTML.trim()) footer.outerHTML = buildFooter();

        wireMobileMenu();
        renderAuthSlots();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

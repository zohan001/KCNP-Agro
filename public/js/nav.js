/**
 * Shared navigation helper for the marketing pages.
 *
 * Every page ships the same static list of links inline, but the auth-aware
 * slot and the "current page" highlight used to be wired per page, which let
 * the navbar drift between pages. This script owns both so the navbar looks and
 * behaves the same everywhere:
 *   - fills #nav-auth-desktop / #nav-auth-mobile with the signed-in links
 *     (Dashboard, My Orders, role links, Logout) or a Login link;
 *   - marks the link for the current page so the active style is consistent.
 *
 * Loaded with `defer`; it registers its DOMContentLoaded hook after the pages'
 * inline scripts, so it wins over any legacy per-page nav logic.
 */
(function () {
    'use strict';

    var INLINE_CLS = 'text-sm font-medium text-gray-300 hover:text-primary-400 transition-colors duration-300';
    var INLINE_ACTIVE = 'text-sm font-medium text-primary-400 transition-colors duration-300';
    var BLOCK_CLS = 'block px-4 py-3 rounded-lg text-gray-300 hover:text-primary-400 hover:bg-primary-50 transition-all duration-300';
    var BLOCK_ACTIVE = 'block px-4 py-3 rounded-lg text-primary-400 hover:bg-primary-50 transition-all duration-300';

    function readStored(name) {
        try {
            var v = localStorage.getItem(name);
            if (v !== null && v !== undefined) return v;
        } catch (e) { /* storage unavailable */ }
        try {
            var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
            return m ? decodeURIComponent(m[1]) : null;
        } catch (e) { return null; }
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
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } catch (e) { /* storage unavailable */ }
        ['kcnp_token', 'kcnp_user', 'token', 'user'].forEach(function (n) {
            document.cookie = n + '=; path=/; max-age=0';
        });
        window.location.href = '/login';
    }

    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function link(href, labelKey, label, cls) {
        return '<a href="' + href + '" class="' + cls + '">' +
            (labelKey ? '<span data-i18n="' + labelKey + '">' + label + '</span>' : label) +
            '</a>';
    }

    function firstName(user) {
        return String((user && user.name) || '').split(' ')[0] || 'Account';
    }

    function renderAuthSlots() {
        var signedIn = hasToken() && currentUser();
        var user = currentUser();
        var desktop = document.getElementById('nav-auth-desktop');
        var mobile = document.getElementById('nav-auth-mobile');

        if (desktop) {
            if (signedIn) {
                var html = link('/dashboard', 'nav_dashboard', 'Dashboard', INLINE_CLS);
                html += link('/orders', '', 'My Orders', INLINE_CLS);
                if (user && user.role === 'farmer') html += link('/verification', '', 'Verify Identity', INLINE_CLS);
                if (user && user.role === 'admin') html += link('/admin', '', 'Admin', INLINE_CLS);
                html += '<a href="#" class="' + INLINE_CLS + '" data-nav-logout>Logout (' + esc(firstName(user)) + ')</a>';
                desktop.className = 'hidden md:inline-flex items-center gap-6';
                desktop.innerHTML = html;
            } else {
                desktop.className = 'hidden md:inline-flex';
                desktop.innerHTML = link('/login', 'nav_login', 'Login', INLINE_CLS);
            }
        }

        if (mobile) {
            if (signedIn) {
                var mhtml = link('/dashboard', 'nav_dashboard', 'Dashboard', BLOCK_CLS);
                mhtml += link('/orders', '', 'My Orders', BLOCK_CLS);
                if (user && user.role === 'farmer') mhtml += link('/verification', '', 'Verify Identity', BLOCK_CLS);
                if (user && user.role === 'admin') mhtml += link('/admin', '', 'Admin', BLOCK_CLS);
                mhtml += '<a href="#" class="' + BLOCK_CLS + '" data-nav-logout>Logout (' + esc(firstName(user)) + ')</a>';
                mobile.className = 'pt-2 px-4 flex flex-col gap-2';
                mobile.innerHTML = mhtml;
            } else {
                mobile.className = 'pt-2 px-4';
                mobile.innerHTML = '<a href="/login" class="block text-center px-5 py-3 rounded-xl border border-gray-300 text-gray-900 font-semibold text-sm"><span data-i18n="nav_login">Login</span></a>';
            }
        }

        document.querySelectorAll('[data-nav-logout]').forEach(function (el) {
            if (el.getAttribute('data-bound')) return;
            el.setAttribute('data-bound', '1');
            el.addEventListener('click', function (e) {
                e.preventDefault();
                logout();
            });
        });
    }

    function highlightActive() {
        var here = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
        document.querySelectorAll('#navbar a[href]').forEach(function (a) {
            var cls = a.className || '';
            var href = a.getAttribute('href') || '';
            var isMobile = cls.indexOf('block px-4') === 0;
            var isDesktop = cls.indexOf('text-sm font-medium') !== -1;
            if (!isMobile && !isDesktop) return;
            if (href.charAt(0) !== '/') return;

            var target = href.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
            var isActive = target === here || (target !== '/' && here.indexOf(target + '/') === 0);
            var inSlot = Boolean(a.parentElement && /^nav-auth-(desktop|mobile)$/.test(a.parentElement.id || ''));

            if (isActive) {
                a.className = isMobile ? BLOCK_ACTIVE : INLINE_ACTIVE;
                if (!inSlot) a.setAttribute('aria-current', 'page');
            } else {
                a.className = isMobile ? BLOCK_CLS : INLINE_CLS;
                a.removeAttribute('aria-current');
            }
        });
    }

    function enhance() {
        renderAuthSlots();
        highlightActive();
    }

    document.addEventListener('DOMContentLoaded', enhance);
})();

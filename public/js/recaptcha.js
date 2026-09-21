/**
 * ============================================
 * reCAPTCHA v2 invisible bootstrap (shared)
 * ============================================
 * Fetches the public site key from /api/recaptcha-config,
 * loads the Google reCAPTCHA script, and registers an
 * invisible widget (no checkbox, no user interaction).
 * Tokens are minted in the background on demand and
 * returned as a Promise by KCNPRecaptcha.execute(action).
 *
 * When reCAPTCHA is not configured on the server the
 * script is never loaded, active() is false and
 * execute() resolves to '' (the server skips
 * verification in that case), so dev/staging keep
 * working without Google keys.
 * ============================================
 */
(function () {
    'use strict';

    var siteKey = '';
    var widgetId = null;
    var active = false;
    var scriptBusy = false;
    var pendingRenders = [];

    function ensureHolder() {
        var host = document.getElementById('kcnp-recaptcha-holder');
        if (!host) {
            host = document.createElement('div');
            host.id = 'kcnp-recaptcha-holder';
            host.setAttribute('aria-hidden', 'true');
            host.style.position = 'absolute';
            host.style.left = '-9999px';
            host.style.top = '-9999px';
            host.style.width = '1px';
            host.style.height = '1px';
            document.body.appendChild(host);
        }
        return host;
    }

    function onScriptReady() {
        scriptBusy = false;
        if (typeof grecaptcha === 'undefined' || !siteKey) return;
        try {
            widgetId = grecaptcha.render(ensureHolder(), {
                sitekey: siteKey,
                size: 'invisible',
                badge: 'bottomright',
                theme: 'dark'
            });
        } catch (e) {
            widgetId = null;
        }
        active = widgetId !== null;
        var q = pendingRenders;
        pendingRenders = [];
        for (var i = 0; i < q.length; i++) q[i]();
    }

    function injectScript() {
        if (scriptBusy) return;
        if (typeof grecaptcha !== 'undefined') { onScriptReady(); return; }
        scriptBusy = true;
        window.onRecaptchaReady = onScriptReady;
        var s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaReady&render=explicit';
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
        // Safety net: if Google's loader is slow or blocked, give up so the
        // page keeps working without a captcha (dev/local environments).
        setTimeout(function () {
            if (typeof grecaptcha !== 'undefined') onScriptReady();
            scriptBusy = false;
        }, 4000);
    }

    function init() {
        fetch('/api/recaptcha-config')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d.success || !d.data || !d.data.siteKey) return;
                siteKey = d.data.siteKey;
                injectScript();
            })
            .catch(function () { /* keep page functional without captcha */ });
    }

    /**
     * Mint a fresh verification token in the background. Resolves with '' when
     * reCAPTCHA is not configured or unavailable (the server skips verification).
     *
     * @param {string} [action] - one of 'login', 'register', 'forgot-password',
     *                            'reset-password', 'payment', ...
     * @returns {Promise<string>}
     */
    function execute(action) {
        if (!active || typeof grecaptcha === 'undefined' || widgetId === null) {
            return Promise.resolve('');
        }
        var opts = action ? { action: action } : undefined;
        return new Promise(function (resolve) {
            grecaptcha.execute(widgetId, opts).then(function (token) {
                resolve(token || '');
            }).catch(function () { resolve(''); });
        });
    }

    function activeFlag() { return active; }

    // Legacy sync helpers (no-op) kept so older inline scripts that still call
    // tokenFrom/getToken never throw; they always yield '' and the new pages
    // use execute() instead.
    function tokenFrom() { return ''; }
    function getToken() { return ''; }

    window.KCNPRecaptcha = {
        init: init,
        execute: execute,
        getToken: getToken,
        tokenFrom: tokenFrom,
        active: activeFlag
    };
})();
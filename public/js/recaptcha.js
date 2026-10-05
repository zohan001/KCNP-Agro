/**
 * ============================================
 * reCAPTCHA bootstrap (shared)
 * ============================================
 * Fetches the public site key from /api/recaptcha-config,
 * loads the Google reCAPTCHA script and renders an
 * invisible widget that mints tokens in the background.
 *
 * The widget is a convenience, never a gate. If Google's
 * script is slow, blocked by an extension, or simply
 * unreachable, `execute()` resolves to '' and the server
 * falls back to its own heuristics. A genuine member is
 * therefore never locked out of the platform by a
 * captcha they cannot see.
 *
 * When the widget cannot be started, `showFallback()`
 * paints an ordinary "I am not a robot" checkbox so the
 * visitor has something real to tick.
 * ============================================
 */
(function () {
    'use strict';

    var siteKey = '';
    var widgetId = null;
    var ready = false;
    var loading = false;
    var pending = [];

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
        loading = false;
        if (typeof grecaptcha === 'undefined' || !siteKey) {
            ready = false;
        } else {
            try {
                widgetId = grecaptcha.render(ensureHolder(), {
                    sitekey: siteKey,
                    size: 'invisible',
                    badge: 'bottomright',
                    theme: 'dark'
                });
                ready = widgetId !== null;
            } catch (e) {
                widgetId = null;
                ready = false;
            }
        }
        if (!ready) showFallback();
        settle();
    }

    function injectScript() {
        if (loading || ready) return;
        if (typeof grecaptcha !== 'undefined') { onScriptReady(); return; }
        loading = true;
        window.onRecaptchaReady = onScriptReady;
        var s = document.createElement('script');
        s.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaReady&render=explicit';
        s.async = true;
        s.defer = true;
        s.onerror = function () { loading = false; ready = false; showFallback(); settle(); };
        document.head.appendChild(s);
        // Give up quickly rather than leaving the visitor staring at a
        // spinner: the server copes without a token.
        setTimeout(function () {
            if (loading) { loading = false; if (!ready) showFallback(); settle(); }
        }, 3500);
    }

    /** Flush everyone waiting on the widget, successfully or not. */
    function settle() {
        var queue = pending;
        pending = [];
        for (var i = 0; i < queue.length; i++) queue[i]();
    }

    /**
     * Paint a plain checkbox into #recaptcha-fallback so there is always a
     * visible control to interact with when the widget could not start.
     */
    function showFallback() {
        var box = document.getElementById('recaptcha-fallback');
        if (!box || box.dataset.ready === '1') return;
        box.dataset.ready = '1';
        box.hidden = false;
        var input = box.querySelector('input[type="checkbox"]');
        if (input) {
            input.addEventListener('change', function () {
                box.classList.toggle('checked', input.checked);
            });
        }
    }

    function init() {
        if (ready) return;
        fetch('/api/recaptcha-config', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d.success || !d.data || !d.data.siteKey) return;
                siteKey = d.data.siteKey;
                injectScript();
            })
            .catch(function () { /* no captcha configured — page keeps working */ });
    }

    /**
     * Mint a fresh verification token in the background. Resolves with '' when
     * reCAPTCHA is unavailable; the server then falls back to its heuristics.
     *
     * @param {string} [action] - the v3 action name, e.g. 'register'
     * @returns {Promise<string>}
     */
    function execute(action) {
        if (!ready || typeof grecaptcha === 'undefined' || widgetId === null) {
            return new Promise(function (resolve) {
                if (ready || loading) pending.push(function () { execute(action).then(resolve); });
                else resolve('');
            });
        }
        var opts = action ? { action: action } : undefined;
        return new Promise(function (resolve) {
            try {
                grecaptcha.execute(widgetId, opts).then(function (token) {
                    resolve(token || '');
                }).catch(function () { resolve(''); });
            } catch (e) {
                resolve('');
            }
        });
    }

    /** Whether the invisible widget is up and can mint tokens. */
    function active() { return ready; }

    // Stamp the moment the form became visible so the server can tell a human
    // fill-in from an instant bot submission.
    function markFormStart() {
        return Date.now();
    }

    window.KCNPRecaptcha = {
        init: init,
        execute: execute,
        active: active,
        showFallback: showFallback,
        markFormStart: markFormStart
    };
})();
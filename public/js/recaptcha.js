/**
 * ============================================
 * reCAPTCHA v2 checkbox bootstrap (shared)
 * ============================================
 * Fetches the public site key from /api/recaptcha-config,
 * injects the Google reCAPTCHA script, and renders a
 * checkbox widget into a container element. Exposes a
 * tiny global API for page scripts.
 *
 * When reCAPTCHA is not configured on the server the
 * widget is simply never rendered and getToken() returns
 * '' (the server skips verification in that case).
 * ============================================
 */
(function () {
    'use strict';

    var siteKey = '';
    var widgetId = null;
    var active = false;
    var scriptBusy = false;

    function onScriptReady() {
        scriptBusy = false;
        if (typeof grecaptcha === 'undefined' || !siteKey) return;
        var firstWidget = null;
        document.querySelectorAll('[data-recaptcha]').forEach(function (el) {
            var wid = grecaptcha.render(el, {
                sitekey: siteKey,
                theme: 'dark'
            });
            el.setAttribute('data-widget-id', String(wid));
            if (firstWidget === null) firstWidget = wid;
        });
        if (firstWidget !== null) widgetId = firstWidget;
        active = true;
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
        // Safety net: if Google's loader is slow or blocked, give up and let
        // the page work without the widget (dev/local environments).
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

    function getToken() {
        if (!active || typeof grecaptcha === 'undefined' || !widgetId) return '';
        try { return grecaptcha.getResponse(widgetId) || ''; } catch (e) { return ''; }
    }

    // widgetId stays for the first container rendered. Multi-form pages use
    // tokenFrom() instead, which always queries the container by reference.
    function tokenFrom(containerId) {
        if (typeof grecaptcha === 'undefined' || !active) return '';
        var el = document.getElementById(containerId);
        if (!el) return '';
        var wid = el.getAttribute('data-widget-id');
        try { return grecaptcha.getResponse(wid ? Number(wid) : widgetId) || ''; } catch (e) { return ''; }
    }

    function activeFlag() { return active; }

    window.KCNPRecaptcha = {
        init: init,
        getToken: getToken,
        tokenFrom: tokenFrom,
        active: activeFlag
    };
})();
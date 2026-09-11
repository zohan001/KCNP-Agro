/**
 * ============================================
 * UX Assist Script (read-aloud + Kiswahili toggle)
 * ============================================
 * Adds low-literacy and accessibility support
 * across the whole site:
 *
 * 1. "Listen" buttons  — read any content block
 *    aloud using the browser's built-in speech
 *    synthesis (no internet/tool needed).
 * 2. Language toggle   — ENGLISH <-> KISWAHILI
 *    for the main interface labels (stored in
 *    localStorage). Helpful for farmers who do
 *    not read comfortably in English.
 *
 * It is intentionally dependency-free and runs
 * defensively on any page that includes it.
 * ============================================
 */
(function () {
    'use strict';

    // ==============================
    // Configuration
    // ==============================
    var LANG_KEY = 'kcnp_lang';
    var TTS_LANG = { en: 'en-US', sw: 'sw-KE' };

    // ==============================
    // Translations (EN -> SW)
    // ==============================
    var I18N = {
        en: {
            nav_home: 'Home',
            nav_marketplace: 'Marketplace',
            nav_education: 'Education',
            nav_dashboard: 'Dashboard',
            nav_login: 'Login',
            nav_register: 'Register',
            hero_title: 'Promoting <span class="text-white">Climate Smart</span><br>Agriculture &amp;<br><span class="gradient-text">Trade Initiatives</span>',
            hero_subtitle: 'Driving sustainable economic growth through innovative agricultural practices, equitable trade partnerships, and community-powered climate resilience.',
            btn_join: 'Join the Movement',
            btn_learn: 'Learn More',
            btn_help: 'Help',
            p_marketplace: 'Marketplace',
            p_education: 'Education <span class="gradient-text">Center</span>',
            p_dashboard: 'Dashboard',
            p_login: 'Login to <span class="gradient-text">KCNP Agro</span>',
            p_register: 'Create <span class="gradient-text">Account</span>',
            p_forgot: 'Forgot <span class="gradient-text">Password?</span>',
            p_reset: 'Choose a New <span class="gradient-text">Password</span>',
            p_eyebrow_login: 'Welcome Back',
            p_eyebrow_join: 'Join Us',
            p_eyebrow_recovery: 'Account Recovery',
            p_eyebrow_market: 'Marketplace',
            p_eyebrow_educ: 'Knowledge & Learning',
            p_login_sub: 'Access the marketplace and education center',
            p_register_sub: 'Join the climate-smart agriculture community',
            p_forgot_sub: 'Enter your account email and we\'ll send you a reset link.',
            p_reset_sub: 'Enter a new password for your account.',
            d_my: 'My Listings',
            d_all: 'Marketplace Listings',
            f_quick: 'Quick Links',
            f_services: 'Services',
            f_stay: 'Stay Updated',
            f_rights: 'All rights reserved.',
            f_privacy: 'Privacy Policy',
            f_terms: 'Terms of Service',
            btn_login: 'Login',
            btn_create: 'Create Account',
            btn_sendlink: 'Send Reset Link',
            btn_reset: 'Reset Password',
            btn_listen: 'Listen',
            btn_stop: 'Stop',
            quiz_prev: 'Previous',
            quiz_next: 'Next',
            quiz_submit: 'Submit Answers',
            edu_listen_article: 'Listen to article',
            mp_listen_listing: 'Listen to listing'
        },
        sw: {
            nav_home: 'Nyumbani',
            nav_marketplace: 'Soko',
            nav_education: 'Elimu',
            nav_dashboard: 'Dashibodi',
            nav_login: 'Ingia',
            nav_register: 'Jisajili',
            hero_title: '<span class="text-white">Kukuza Kilimo</span><br>Bora kwa Mazingira<br><span class="gradient-text">na Biashara Nzuri</span>',
            hero_subtitle: 'Kukuza ukuaji wa uchumi endelevu kupitia mbinu bora za kilimo, ubia wa haki kibiashara, na jumuiya zinazostahimili mabadiliko ya tabianchi.',
            btn_join: 'Jiunge na Harakati',
            btn_learn: 'Jifunze Zaidi',
            btn_help: 'Msaada',
            p_marketplace: 'Soko',
            p_education: 'Kituo cha <span class="gradient-text">Elimu</span>',
            p_dashboard: 'Dashibodi',
            p_login: 'Ingia kwenye <span class="gradient-text">KCNP Agro</span>',
            p_register: 'Fungua <span class="gradient-text">Akaunti</span>',
            p_forgot: 'Umesahau <span class="gradient-text">Nenosiri?</span>',
            p_reset: 'Chagua Nenosiri <span class="gradient-text">Jipya</span>',
            p_eyebrow_login: 'Karibu Tena',
            p_eyebrow_join: 'Jiunge Nasi',
            p_eyebrow_recovery: 'Urejeshaji Akaunti',
            p_eyebrow_market: 'Soko',
            p_eyebrow_educ: 'Elimu na Kujifunza',
            p_login_sub: 'Fikia soko na kituo cha elimu',
            p_register_sub: 'Jiunge na jumuiya ya kilimo bora cha mazingira',
            p_forgot_sub: 'Weka barua pepe ya akaunti yako na tutakutumia kiungo cha kuweka upya.',
            p_reset_sub: 'Weka nenosiri jipya la akaunti yako.',
            d_my: 'Orodha Zangu',
            d_all: 'Matangazo ya Soko',
            f_quick: 'Viungo vya Haraka',
            f_services: 'Huduma',
            f_stay: 'Endelea Kupata Habari',
            f_rights: 'Haki zote zimehifadhiwa.',
            f_privacy: 'Sera ya Faragha',
            f_terms: 'Masharti ya Huduma',
            btn_login: 'Ingia',
            btn_create: 'Fungua Akaunti',
            btn_sendlink: 'Tuma Kiungo',
            btn_reset: 'Weka Upya Nenosiri',
            btn_listen: 'Sikiliza',
            btn_stop: 'Acha',
            quiz_prev: 'Nyuma',
            quiz_next: 'Endelea',
            quiz_submit: 'Tuma Majibu',
            edu_listen_article: 'Sikiliza makala',
            mp_listen_listing: 'Sikiliza matangazo'
        }
    };

    function tr(key) {
        var dict = I18N[currentLang()] || I18N.en;
        return dict[key] !== undefined ? dict[key] : key;
    }

    // ==============================
    // Language helpers
    // ==============================
    function currentLang() {
        try {
            return localStorage.getItem(LANG_KEY) || 'en';
        } catch (e) {
            return 'en';
        }
    }

    function applyLang() {
        var lang = currentLang();
        var dict = I18N[lang] || I18N.en;

        document.querySelectorAll('[data-i18n]').forEach(function (el) {
            var key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) el.innerHTML = dict[key];
        });

        try { document.documentElement.lang = lang === 'sw' ? 'sw-KE' : 'en'; } catch (e) {}

        var btn = document.getElementById('lang-toggle');
        if (btn) {
            btn.textContent = lang === 'en' ? 'SW' : 'EN';
            btn.setAttribute('aria-label', lang === 'en' ? 'Switch to Kiswahili' : 'Badilisha kwa Kiingereza');
        }
    }

    function toggleLang() {
        var next = currentLang() === 'en' ? 'sw' : 'en';
        try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
        applyLang();
    }

    // ==============================
    // Read-aloud helpers
    // ==============================
    function ttsSupported() {
        return ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
    }

    function speakText(text, lang) {
        if (!text) return;
        if (!ttsSupported()) {
            alert('Voice is not supported by this browser.');
            return;
        }
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = TTS_LANG[lang] || 'en-US';
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
    }

    function collectText(el) {
        if (!el) return '';
        var clone = el.cloneNode(true);
        clone.querySelectorAll('script,style,button,input,select,textarea,.listen-btn').forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });
        return (clone.innerText || '').replace(/\s+/g, ' ').trim();
    }

    function bindListeners() {
        document.querySelectorAll('.listen-btn').forEach(function (btn) {
            if (btn.getAttribute('data-bound')) return;
            btn.setAttribute('data-bound', '1');

            var defaultLabel = btn.innerHTML;
            btn.addEventListener('click', function () {
                var sel = btn.getAttribute('data-speak');
                var target = null;
                if (sel && sel !== 'self') {
                    target = document.querySelector(sel);
                } else if (sel === 'self') {
                    target = btn.closest('.listen-block');
                }
                var text = target ? collectText(target) : (btn.getAttribute('data-speak-text') || '');

                if (text) {
                    speakText(text, currentLang());
                    btn.textContent = tr('btn_stop');
                    setTimeout(function () { btn.innerHTML = defaultLabel; }, 3000);
                }
            });
        });
    }

    // ==============================
    // Init
    // ==============================
    function init() {
        applyLang();

        var toggle = document.getElementById('lang-toggle');
        if (toggle && !toggle.getAttribute('data-bound')) {
            toggle.setAttribute('data-bound', '1');
            toggle.addEventListener('click', toggleLang);
        }

        window.addEventListener('beforeunload', function () {
            try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
        });

        bindListeners();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
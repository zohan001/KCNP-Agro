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
 * Handlers are attached inline via
 * `onclick="KCNP.speakBtn(this)"` in each page
 * template, so buttons created later (cards
 * rendered after API fetch) always work.
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
            p_knowledge: 'Knowledge Base',
            p_quizzes: 'Self-Assessment Quizzes',
            p_educ_sub: 'Learn climate-smart agricultural practices and test your knowledge with self-assessment quizzes.',
            cat_all_topics: 'All Topics',
            cat_csa: 'Climate Smart Farming',
            cat_water: 'Water Management',
            cat_soil: 'Soil Health',
            cat_crops: 'Crop Diversification',
            cat_carbon: 'Carbon Credits',
            cat_market: 'Market Access',
            cat_policy: 'Policy & Support',
            cat_livestock: 'Livestock & Sustainability',
            cat_all_quizzes: 'All Quizzes',
            cat_climate_basics: 'Climate Basics',
            cat_soil_mgmt: 'Soil Management',
            cat_water_con: 'Water Conservation',
            cat_crop_plan: 'Crop Planning',
            cat_carbon_ft: 'Carbon Footprint',
            q_of: 'Question {i} of {n}',
            quiz_please_answer: 'Please answer question {n}.',
            res_score: 'You scored {s} out of {t}',
            res_excellent: 'Excellent! You have a strong grasp of this topic.',
            res_good: 'Good job! Review the material to improve further.',
            res_keep: 'Keep learning — revisit the knowledge base and try again.',
            res_correct: '✓ Correct',
            res_incorrect: '✗ Incorrect',
            res_close: 'Close',
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
            p_knowledge: 'Kituo cha Maarifa',
            p_quizzes: 'Maswali ya Kujipima',
            p_educ_sub: 'Jifunze mbinu bora za kilimo kwa mazingira na ujipime kwa maswali ya kujipima.',
            cat_all_topics: 'Mada Zote',
            cat_csa: 'Kilimo Bora kwa Mazingira',
            cat_water: 'Uhifadhi wa Maji',
            cat_soil: 'Afya ya Udongo',
            cat_crops: 'Mazao Mbalimbali',
            cat_carbon: 'Kadi za Carbon',
            cat_market: 'Ufikiaji wa Soko',
            cat_policy: 'Sera na Msaada',
            cat_livestock: 'Mifugo na Uendelevu',
            cat_all_quizzes: 'Maswali Yote',
            cat_climate_basics: 'Misingi ya Tabianchi',
            cat_soil_mgmt: 'Usimamizi wa Udongo',
            cat_water_con: 'Uhifadhi wa Maji',
            cat_crop_plan: 'Upangaji wa Mazao',
            cat_carbon_ft: 'Kiwango cha Carbon',
            q_of: 'Swali {i} kati ya {n}',
            quiz_please_answer: 'Tafadhali jibu swali la {n}.',
            res_score: 'Umepata {s} kati ya {t}',
            res_excellent: 'Hongera! Umeelewa mada hii vizuri.',
            res_good: 'Umefanya vizuri! Soma tena ili uboreke zaidi.',
            res_keep: 'Endelea kujifunza — soma tena maarifa na ujaribu tena.',
            res_correct: '✓ Sahihi',
            res_incorrect: '✗ Si Sahihi',
            res_close: 'Funga',
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

        // Let pages that load dynamic content re-render in the new language
        try {
            var evt = new Event('kcnp:lang', { bubbles: true });
            document.dispatchEvent(evt);
        } catch (e) {}
    }

    function toggleLang() {
        var next = currentLang() === 'en' ? 'sw' : 'en';
        try { localStorage.setItem(LANG_KEY, next); } catch (e) {}
        applyLang();
    }

    // ==============================
    // Read-aloud helpers
    // ==============================
    function pickVoice(lang) {
        var voices = [];
        try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { return null; }
        if (!voices.length) return null;
        var prefix = lang.split('-')[0];
        return voices.find(function (v) { return v.lang === lang; })
            || voices.find(function (v) { return v.lang && v.lang.split('-')[0] === prefix; })
            || voices.find(function (v) { return v.lang && v.lang.split('-')[0] === 'en'; })
            || voices[0];
    }

    // Split long text into sentence-sized chunks so the voice
    // pauses naturally and the listener can follow every word.
    function splitSentences(text) {
        var cleaned = (text || '').replace(/\s+/g, ' ').trim();
        var parts = cleaned.match(/[^.!?]+[.!?]*/g) || [cleaned];
        var chunks = [];
        var buffer = '';
        parts.forEach(function (p) {
            if (buffer) {
                if ((buffer + ' ' + p).length > 220) {
                    chunks.push(buffer);
                    buffer = p;
                } else {
                    buffer += ' ' + p;
                }
            } else {
                buffer = p;
            }
        });
        if (buffer) chunks.push(buffer);
        return chunks.slice(0, 40);
    }

    function speak(text, lang) {
        if (!text || !text.trim()) return;
        if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
            alert('This browser does not support text-to-speech.');
            return;
        }
        try { window.speechSynthesis.cancel(); } catch (e) {}

        var code = TTS_LANG[lang] || 'en-US';
        var v = pickVoice(code);
        var chunks = splitSentences(text);

        chunks.forEach(function (chunk) {
            var u = new SpeechSynthesisUtterance(chunk);
            u.lang = code;
            if (v) u.voice = v;
            u.rate = 0.7;   // slow & clear
            u.pitch = 1;
            u.volume = 1;
            // Some engines support a short pause at sentence ends
            if ('pause' in u) u.pause = 350;
            window.speechSynthesis.speak(u);
        });
    }

    function collectText(el) {
        if (!el) return '';
        var clone = el.cloneNode(true);
        (clone.querySelectorAll('script,style,button,input,select,textarea,.listen-btn,a') || []).forEach(function (n) {
            if (n.parentNode) n.parentNode.removeChild(n);
        });
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function speakBtn(btn) {
        if (!btn) return;

        if (btn.getAttribute('speaking') === '1') {
            try { window.speechSynthesis.cancel(); } catch (e) {}
            btn.removeAttribute('speaking');
            btn.innerHTML = btn.getAttribute('data-label') || tr('btn_listen');
            return;
        }

        var sel = btn.getAttribute('data-speak');
        var target = null;
        if (sel && sel !== 'self') {
            target = document.querySelector(sel);
        } else if (sel === 'self') {
            target = btn.closest('.listen-block');
        }
        var text = target ? collectText(target) : (btn.getAttribute('data-speak-text') || '');

        if (!text) return;
        btn.setAttribute('data-label', btn.innerHTML);
        speak(text, currentLang());
        btn.setAttribute('speaking', '1');
        btn.textContent = tr('btn_stop');
        setTimeout(function () {
            if (btn.getAttribute('speaking') === '1') {
                btn.innerHTML = btn.getAttribute('data-label') || tr('btn_listen');
                btn.removeAttribute('speaking');
            }
        }, 5000);
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

        // Refresh voice list once available (voices load asynchronously on some devices)
        if ('speechSynthesis' in window) {
            var loadVoices = function () { try { window.speechSynthesis.getVoices(); } catch (e) {} };
            loadVoices();
            window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
        }
    }

    // Expose to inline onclick handlers in templates
    window.KCNP = {
        speakBtn: speakBtn,
        speak: speak,
        t: tr,
        lang: currentLang,
        applyLang: applyLang
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
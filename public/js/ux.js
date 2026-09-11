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
            mp_listen_listing: 'Listen to listing',
            mp_post: 'Post a New Listing',
            btn_post_listing: 'Post Listing',
            btn_post_cta: 'Post a Listing',
            toggle_post: '+ Post a Listing',
            btn_search: 'Search',
            mp_loading: 'Loading listings...',
            mp_empty: 'No listings found. Be the first to post!',
            mp_posted: 'Listing posted successfully!',
            mp_failed: 'Failed to post listing.',
            mp_network: 'Network error or timeout. Please try again.',
            np_trader: 'Traders browse and buy — only farmers can post listings. Contact the farmer shown on any listing to make an order.',
            np_login1: 'Only registered farmers can post listings.',
            np_login2: 'to start selling.',
            np_or: 'or',
            np_link_reg: 'Create an account',
            np_link_login: 'log in',
            l_title: 'Title',
            l_desc: 'Description',
            l_cat: 'Category',
            l_price: 'Price',
            l_unit: 'Unit',
            l_loc: 'Location',
            l_email: 'Contact Email',
            l_phone: 'Contact Phone',
            l_image: 'Photo of the item',
            ph_title: 'e.g. Organic maize seeds',
            ph_desc: 'Describe your product or service...',
            ph_price: 'e.g. 150',
            ph_unit: 'e.g. kg, bag, unit',
            ph_loc: 'e.g. Mombasa, Kenya',
            ph_email: 'you@example.com',
            ph_phone: '+254 7XX XXX XXX',
            ph_search: 'Search listings...',
            cat_all: 'All Categories',
            cat_seeds: 'Seeds',
            cat_tools: 'Tools',
            cat_fertilizer: 'Fertilizer',
            cat_livestock: 'Livestock',
            cat_produce: 'Produce',
            cat_equipment: 'Equipment',
            cat_services: 'Services',
            cat_other: 'Other',
            err_price: 'Please enter the price.',
            err_unit: 'Please enter the unit (e.g. kg, bag).',
            err_loc: 'Please enter the location.',
            err_phone: 'Please enter a phone number buyers can call.',
            err_image_big: 'That photo is too big. Please choose one under 5 MB.',
            err_image_type: 'Please choose an image file (JPG, PNG, WEBP or GIF).',
            err_image_empty: 'No photo chosen yet.',
            mp_contact: 'Contact',
            price_on_request: 'Price on request',
            d_no_listings: "You haven't posted any listings yet.",
            r_no_listings: 'No listings available yet.',
            s_all: 'See all marketplace listings',
            s_post_new: '+ Post a new listing',
            f_howto: 'How to Use',
            tour_title: 'Welcome to KCNP Agro!',
            tour_sub: 'Here is a quick guide to get you started in minutes.',
            t1_t: 'Marketplace',
            t1_d: 'Farmers post what they grow — produce, seeds, tools and services. Traders browse and buy. Use the search and category filter to find what you need.',
            t2_t: 'Knowledge & Quizzes',
            t2_d: 'Visit Education to learn climate-smart farming. Tap a lesson to read it, use the Listen button to hear it read aloud, then take a quiz to test yourself.',
            t3_t: 'Listen anywhere',
            t3_d: 'Press the dark ▶ Listen button on any article, quiz, or listing to hear it spoken slowly and clearly, without needing to read.',
            t4_t: 'Choose your language',
            t4_d: 'Press the SW / EN button in the corner to switch the whole site between Kiswahili and English.',
            t5_t: 'Call for help',
            t5_d: 'Need a hand? Tap the green Help button to call us anytime, day or night.',
            tour_next: 'Next',
            tour_skip: 'Skip — I do not need this',
            tour_done: 'Got it, let us go!',
            stat_farmers: 'Farmers',
            stat_traders: 'Traders',
            stat_listings: 'Live Listings',
            stat_articles: 'Knowledge Articles'
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
            mp_listen_listing: 'Sikiliza matangazo',
            mp_post: 'Chapisha Tangazo Jipya',
            btn_post_listing: 'Chapisha Tangazo',
            btn_post_cta: 'Chapisha Tangazo',
            toggle_post: '+ Chapisha Tangazo',
            btn_search: 'Tafuta',
            mp_loading: 'Inapakia matangazo...',
            mp_empty: 'Hakuna matangazo. Kuwa wa kwanza kuchapisha!',
            mp_posted: 'Tangazo limechapishwa kikamilifu!',
            mp_failed: 'Imeshindikana kuchapisha tangazo.',
            mp_network: 'Hitilafu ya mtandao. Tafadhali jaribu tena.',
            np_trader: 'Wafanyabiashara hutazama na kununua — wakulima pekee ndio wanaweza kuchapisha matangazo. Wasiliana na mkulima aliyeandika tangazo kufanya agizo.',
            np_login1: 'Wakulima waliojisajili tu ndio wanaweza kuchapisha matangazo.',
            np_login2: 'uanze kuuza.',
            np_or: 'au',
            np_link_reg: 'Fungua akaunti',
            np_link_login: 'ingia',
            l_title: 'Jina la Kitu',
            l_desc: 'Maelezo',
            l_cat: 'Aina',
            l_price: 'Bei',
            l_unit: 'Kipimo',
            l_loc: 'Eneo',
            l_email: 'Barua Pepe',
            l_phone: 'Nambari ya Simu',
            l_image: 'Picha ya Kitu',
            ph_title: 'mf. Mbegu za mahindi',
            ph_desc: 'Eleza bidhaa au huduma yako...',
            ph_price: 'mf. 150',
            ph_unit: 'mf. kg, gunia, kipande',
            ph_loc: 'mf. Mombasa, Kenya',
            ph_email: 'wewe@example.com',
            ph_phone: '+254 7XX XXX XXX',
            ph_search: 'Tafuta matangazo...',
            cat_all: 'Aina Zote',
            cat_seeds: 'Mbegu',
            cat_tools: 'Vifaa',
            cat_fertilizer: 'Mbolea',
            cat_livestock: 'Mifugo',
            cat_produce: 'Mazao',
            cat_equipment: 'Mitambo',
            cat_services: 'Huduma',
            cat_other: 'Nyingine',
            err_price: 'Tafadhali weka bei.',
            err_unit: 'Tafadhali weka kipimo (mf. kg, gunia).',
            err_loc: 'Tafadhali weka eneo.',
            err_phone: 'Tafadhali weka nambari ya simu mnunuzi aweze kukupigia.',
            err_image_big: 'Picha iko kubwa mno. Chagua moja chini ya MB 5.',
            err_image_type: 'Tafadhali chagua faili ya picha (JPG, PNG, WEBP au GIF).',
            err_image_empty: 'Hakuna picha iliyochaguliwa bado.',
            mp_contact: 'Mawasiliano',
            price_on_request: 'Bei kwa ombi',
            d_no_listings: 'Hujachapisha tangazo lolote bado.',
            r_no_listings: 'Hakuna matangazo bado.',
            s_all: 'Ona matangazo yote ya soko',
            s_post_new: '+ Chapisha tangazo jipya',
            f_howto: 'Jinsi ya Kutumia',
            tour_title: 'Karibu KCNP Agro!',
            tour_sub: 'Huu ni mwongozo wa haraka wa kukusaidia kuanza.',
            t1_t: 'Soko',
            t1_d: 'Wakulima huweka yale wanayozalisha — mazao, mbegu, vifaa na huduma. Wafanyabiashara huona na kununua. Tumia utafutaji kupata unachohitaji.',
            t2_t: 'Elimu na Maswali',
            t2_d: 'Nenda kwenye Elimu kujifunza kilimo bora kwa mazingira. Gonga somo lisome, tumia kitufe cha Sikiliza kisikizwe kwa sauti, kisha ujipime kwa maswali.',
            t3_t: 'Sikiliza popote',
            t3_d: 'Bonyeza kitufe cheusi cha ▶ Sikiliza kwenye makala, maswali au matangazo yoyote kisome kwa sauti polepole na kwa uwazi.',
            t4_t: 'Chagua lugha yako',
            t4_d: 'Bonyeza kitufe cha SW / EN kwenye kona ubadilishe tovuti nzima Kiingereza na Kiswahili.',
            t5_t: 'Piga simu kwa msaada',
            t5_d: 'Unahitaji msaada? Gonga kitufe cha kijani cha Msaada kutupigia simu wakati wowote.',
            tour_next: 'Endelea',
            tour_skip: 'Ruka — sihitaji hii',
            tour_done: 'Nimeelewa, twende!',
            stat_farmers: 'Wakulima',
            stat_traders: 'Wafanyabiashara',
            stat_listings: 'Matangazo',
            stat_articles: 'Makala za Elimu'
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

        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-placeholder');
            if (dict[key] !== undefined) el.setAttribute('placeholder', dict[key]);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
            var key = el.getAttribute('data-i18n-title');
            if (dict[key] !== undefined) el.setAttribute('title', dict[key]);
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
    // Quick guide (onboarding tour)
    // ==============================
    var TOUR_KEY = 'kcnp_tour_done';
    var tourStep = 0;
    var tourShown = false;
    var TOUR_STEPS = 5;

    function tourMarkup() {
        return '<div id="tour-wrap" class="tour-backdrop" hidden>' +
            '<div class="tour-modal" role="dialog" aria-modal="true" aria-label="Quick guide">' +
            '<button type="button" id="tour-close" class="tour-close" aria-label="Close" onclick="KCNP.skipTour()">&times;</button>' +
            '<h2 class="tour-title" data-i18n="tour_title">Welcome to KCNP Agro!</h2>' +
            '<p class="tour-sub" data-i18n="tour_sub">Quick guide to get you started.</p>' +
            '<div class="tour-step-box">' +
            '<h3 id="tour-step-title" class="tour-step-title" data-i18n="t1_t"></h3>' +
            '<p id="tour-step-desc" class="tour-step-desc" data-i18n="t1_d"></p>' +
            '</div>' +
            '<div id="tour-dots" class="tour-dots" role="presentation"></div>' +
            '<div class="tour-actions">' +
            '<button type="button" id="tour-skip-btn" class="tour-skip" data-i18n="tour_skip" onclick="KCNP.skipTour()">Skip</button>' +
            '<button type="button" id="tour-next-btn" class="tour-next" data-i18n="tour_next" onclick="KCNP.nextTour()">Next</button>' +
            '</div>' +
            '</div>' +
            '</div>';
    }

    function buildTour() {
        var wrap = document.getElementById('tour-wrap');
        if (wrap) return wrap;
        if (!document.body) return null;
        var holder = document.createElement('div');
        holder.innerHTML = tourMarkup();
        document.body.appendChild(holder.firstElementChild);
        var dots = document.getElementById('tour-dots');
        if (dots) {
            for (var i = 0; i < TOUR_STEPS; i++) {
                var d = document.createElement('span');
                d.className = 'tour-dot';
                dots.appendChild(d);
            }
        }
        applyLang();
        return document.getElementById('tour-wrap');
    }

    function setTourStep(n) {
        if (n >= TOUR_STEPS) { finishTour(); return; }
        if (n < 0) n = 0;
        tourStep = n;
        var dict = I18N[currentLang()] || I18N.en;
        var t = document.getElementById('tour-step-title');
        var d = document.getElementById('tour-step-desc');
        var tk = 't' + (n + 1) + '_t';
        var dk = 't' + (n + 1) + '_d';
        if (t) {
            t.setAttribute('data-i18n', tk);
            t.innerHTML = dict[tk] !== undefined ? dict[tk] : t.innerHTML;
        }
        if (d) {
            d.setAttribute('data-i18n', dk);
            d.innerHTML = dict[dk] !== undefined ? dict[dk] : d.innerHTML;
        }
        var dots = document.querySelectorAll('#tour-dots .tour-dot');
        dots.forEach(function (dot, idx) {
            if (idx === n) dot.className = 'tour-dot active';
            else dot.className = 'tour-dot';
        });
        var nextBtn = document.getElementById('tour-next-btn');
        if (nextBtn) {
            nextBtn.setAttribute('data-i18n', n === TOUR_STEPS - 1 ? 'tour_done' : 'tour_next');
            nextBtn.innerHTML = n === TOUR_STEPS - 1
                ? (dict.tour_done !== undefined ? dict.tour_done : 'Got it, let\'s go!')
                : (dict.tour_next !== undefined ? dict.tour_next : 'Next');
        }
    }

    function showTour() {
        var wrap = buildTour();
        if (!wrap) return;
        wrap.hidden = false;
        document.body.classList.add('tour-lock');
        setTourStep(0);
    }

    function hideTour() {
        var wrap = document.getElementById('tour-wrap');
        if (wrap) wrap.hidden = true;
        document.body.classList.remove('tour-lock');
    }

    function finishTour() { skipTour(); }

    function skipTour() {
        try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {}
        hideTour();
        tourShown = true;
    }

    function maybeShowTour() {
        if (tourShown) return;
        var done = false;
        try { done = localStorage.getItem(TOUR_KEY) === '1'; } catch (e) {}
        if (done) return;
        showTour();
        tourShown = true;
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

        // Show the quick guide on first visit
        maybeShowTour();
    }

    // Expose to inline onclick handlers in templates
    window.KCNP = {
        speakBtn: speakBtn,
        speak: speak,
        t: tr,
        lang: currentLang,
        applyLang: applyLang,
        showTour: showTour,
        skipTour: skipTour,
        nextTour: nextTour
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
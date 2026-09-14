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
            nav_insights: 'Market Insights',
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
            mp_waking: 'Server is cold-starting, retrying automatically...',
            mp_failed_listings: 'Failed to load listings. Please make sure the server is running.',
            mp_more_from: 'More from this seller',
            mp_updated: 'Listing updated successfully!',
            btn_edit: 'Edit',
            btn_update: 'Update Listing',
            btn_cancel: 'Cancel',
            mp_posted: 'Listing posted successfully!',
            mp_failed: 'Failed to post listing.',
            mp_network: 'Network error or timeout. Please try again.',
            mp_interest: 'I\'m interested',
            mp_views_short: 'views',
            mp_interest_short: 'interested',
            mi_eyebrow: 'Supply & Demand Analysis',
            mi_subtitle: 'Automatic analysis of what buyers are looking at and where selling opportunities are strongest, based on live marketplace activity.',
            mi_active_listings: 'Active Listings',
            mi_views_30d: 'Views (30 days)',
            mi_interest_30d: 'Interested (30 days)',
            mi_top_opportunity: 'Top Opportunity',
            mi_category: 'Category',
            mi_location: 'Location',
            mi_listings: 'Listings',
            mi_listings_low: 'listings',
            mi_avg_price: 'Avg Price',
            mi_avg: 'unit',
            mi_views: 'Views',
            mi_interest: 'Interest',
            mi_balance: 'Balance',
            mi_supply: 'Supply',
            mi_demand: 'Demand',
            mi_top_opportunities: 'Top Opportunities',
            mi_by_category: 'Demand by Category',
            mi_segments: 'Market Segments',
            mi_loading: 'Analyzing the market...',
            mi_error: 'Could not load market insights. Please try again.',
            mi_empty: 'No listings yet — once farmers post listings, supply and demand analysis will appear here.',
            mi_no_activity: 'Not enough buyer activity yet. As farmers promote their listings and buyers click "I\'m interested", the analysis gets smarter.',
            mi_no_opportunities: 'No standout opportunities right now.',
            mi_no_listings_link: 'Post a listing to start the analysis',
            mi_refresh: 'Refresh',
            f_brand_sub: 'Promoting climate smart agriculture and trade initiatives for sustainable economic growth worldwide.',
            f_contact: 'Contact',
            bal_opportunity: 'High demand · Low supply',
            bal_balanced: 'Balanced',
            bal_oversupply: 'High supply · Low demand',
            bal_no_signal: 'Collecting data',
            adv_opportunity: 'Strong buyer interest here — consider posting a new listing or raising prices.',
            adv_balanced: 'Supply matches demand — expect steady prices.',
            adv_oversupply: 'Many listings with low interest — prices may soften. Differentiate your listing with quality and good photos.',
            adv_no_signal: 'Not enough buyer activity yet — keep prices fair and encourage buyers to click "I\'m interested".',
            d_insights: 'Market Insights',
            d_insights_sub: 'Supply and demand analysis from live listing activity.',
            d_top_opp: 'Top opportunity:',
            d_insights_empty: 'Posting hasn\'t started yet.',
            d_insights_open: 'Open Market Insights',
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
            t1_t: 'Welcome to KCNP Agro!',
            t1_d: 'This platform helps farmers buy, sell, and learn climate-smart farming. Use the buttons below to walk through the main pages.',
            t2_t: 'Move around the site',
            t2_d: 'Use the menu at the top: Home, Marketplace, and Education. The Marketplace is where farmers and traders buy and sell; Education has free lessons and quizzes.',
            t3_t: 'Browse and buy',
            t3_d: 'On the Marketplace, search listings, filter by category, and call the seller using the number shown on each listing. No account is needed to buy.',
            t4_t: 'Post your own listing',
            t4_d: 'Log in, open the Marketplace, and tap "+ Post a new listing". Fill in title, description, price, unit, location and phone, add a photo, then press Post.',
            t5_t: 'Learn and take quizzes',
            t5_d: 'Open the Education Center to read lessons. Press the Listen button to hear each lesson read aloud, then take the quiz at the end of each lesson.',
            t6_t: 'Login or create an account',
            t6_d: 'Use "Login" to enter your account, or "Register" to create one as a Farmer or Trader. Logging in lets you post listings, use the Dashboard, and track your activity.',
            t7_t: 'Get help anytime',
            t7_d: 'Tap the green Help button to call us directly, and use the SW / EN button to switch the whole site between Kiswahili and English.',
            t8_t: 'Market Insights',
            t8_d: 'Open "Market Insights" from the top menu to see demand in real time: which products people view and express interest in, supply vs demand by region, and advice on what to grow or sell. On the Marketplace, every listing shows its views and "I\'m interested" clicks so you get real market signals.',
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
            nav_insights: 'Uchambuzi wa Soko',
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
            mp_waking: 'Seva inaanza, inajirudia kiotomatiki...',
            mp_failed_listings: 'Imeshindikana kupakia matangazo. Tafadhali hakikisha seva inaendesha.',
            mp_more_from: 'Zaidi kutoka kwa muuzaji huyu',
            mp_updated: 'Tangazo limehaririwa kikamilifu!',
            btn_edit: 'Hariri',
            btn_update: 'Sasisha Tangazo',
            btn_cancel: 'Ghairi',
            mp_posted: 'Tangazo limechapishwa kikamilifu!',
            mp_failed: 'Imeshindikana kuchapisha tangazo.',
            mp_network: 'Hitilafu ya mtandao. Tafadhali jaribu tena.',
            mp_interest: 'Nina nia',
            mp_views_short: 'watazamaji',
            mp_interest_short: 'wenye nia',
            mi_eyebrow: 'Uchambuzi wa Ugavi na Mahitaji',
            mi_subtitle: 'Uchambuzi wa kiotomatiki wa kile wanunuzi wanachokitafuta na mahali ambapo fursa za kuuza zina nguvu zaidi, kulingana na shughuli za moja kwa moja za soko.',
            mi_active_listings: 'Matao Halali',
            mi_views_30d: 'Waliotazama (Siku 30)',
            mi_interest_30d: 'Wanaopenda (Siku 30)',
            mi_top_opportunity: 'Fursa Kubwa Zaidi',
            mi_category: 'Kategoria',
            mi_location: 'Eneo',
            mi_listings: 'Matao',
            mi_listings_low: 'matao',
            mi_avg_price: 'Bei ya Wastani',
            mi_avg: 'unit',
            mi_views: 'Waliotazama',
            mi_interest: 'Wanaopenda',
            mi_balance: 'Usawa',
            mi_supply: 'Ugavi',
            mi_demand: 'Mahitaji',
            mi_top_opportunities: 'Fursa Kubwa',
            mi_by_category: 'Mahitaji kwa Kategoria',
            mi_segments: 'Makundi ya Soko',
            mi_loading: 'Inachambua soko...',
            mi_error: 'Imeshindikana kupakia uchambuzi wa soko. Tafadhali jaribu tena.',
            mi_empty: 'Bado hakuna matao — mara tu wakulima watakapochapisha matangazo, uchambuzi wa ugavi na mahitaji utaonekana hapa.',
            mi_no_activity: 'Bado hakuna shughuli za kutosha za wanunuzi. Wakulima wanapotangaza na wanunuzi kubofya "Nina nia", uchambuzi unaboreka.',
            mi_no_opportunities: 'Hakuna fursa dhahiri kwa sasa.',
            mi_no_listings_link: 'Chapisha tangazo ili kuanza uchambuzi',
            mi_refresh: 'Boresha',
            f_brand_sub: 'Kukuza kilimo bora cha hali ya hewa na mipango ya biashara kwa ukuaji endelevu wa uchumi duniani.',
            f_contact: 'Wasiliana',
            bal_opportunity: 'Mahitaji makubwa · Ugavi mdogo',
            bal_balanced: 'Sawa',
            bal_oversupply: 'Ugavi mwingi · Mahitaji machache',
            bal_no_signal: 'Inakusanya data',
            adv_opportunity: 'Kuna hamu kubwa ya wanunuzi hapa — zingatia kuchapisha tangazo jipya au kuongeza bei.',
            adv_balanced: 'Ugavi unalingana na mahitaji — tarajia bei thabiti.',
            adv_oversupply: 'Matao mengi yenye mahitaji machache — bei zinaweza kushuka. Boresha tangazo lako kwa ubora na picha nzuri.',
            adv_no_signal: 'Bado hakuna shughuli za kutosha za wanunuzi — weka bei zenye usawa na uwahimize wanunuzi kubofya "Nina nia".',
            d_insights: 'Uchambuzi wa Soko',
            d_insights_sub: 'Uchambuzi wa ugavi na mahitaji kutokana na shughuli za matangazo.',
            d_top_opp: 'Fursa kubwa:',
            d_insights_empty: 'Bado hakuna matangazo yamechapishwa.',
            d_insights_open: 'Fungua Uchambuzi wa Soko',
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
            t1_t: 'Karibu kwenye KCNP Agro!',
            t1_d: 'Jukwaa hili husaidia wakulima kununua, kuuza, na kujifunza kilimo bora cha hali ya hewa. Tumia vitufe hapa chini kutembea kurasa kuu.',
            t2_t: 'Tembea kwenye tovuti',
            t2_d: 'Tumia menyu iliyo juu: Nyumbani, Soko, na Elimu. Soko ndipo wakulima na wafanyabiashara wanunuzi na kuuza; Elimu ina masomo na majaribio bila malipo.',
            t3_t: 'Vinjari na ununue',
            t3_d: 'Kwenye Soko, tafuta matangazo, chuja kwa kategoria, na mpigie muuzaji simu kwa nambari inayoonekana kwenye kila tangazo. Huna haja ya akaunti kununua.',
            t4_t: 'Chapisha tangazo lako',
            t4_d: 'Ingia, funua Soko, na gonga "+ Chapisha tangazo jipya". Jaza jina, maelezo, bei, kipimo, eneo na simu, ongeza picha, kisha bofya Chapisha.',
            t5_t: 'Jifunze na ufanye majaribio',
            t5_d: 'Funua Kituo cha Elimu kusoma masomo. Bofya kitufe cha Sikiliza kusikiza kila somo, kisha fanya jaribio mwishoni mwa kila somo.',
            t6_t: 'Ingia au unda akaunti',
            t6_d: 'Tumia "Ingia" kuingia akaunti yako, au "Jisajili" kuunda moja kama Mkulima au Mfanyabiashara. Kuingia hukuruhusu kuchapisha matangazo, kutumia Dashibodi, na kufuatilia shughuli zako.',
            t7_t: 'Pata usaidizi wakati wowote',
            t7_d: 'Gonga kitufe cha kijani cha Msaada kutupigia simu moja kwa moja, na tumia kitufe cha SW / EN kubadilisha tovuti nzima Kiingereza na Kiswahili.',
            t8_t: 'Uchambuzi wa Soko',
            t8_d: 'Fungua "Uchambuzi wa Soko" kwenye menyu ya juu kuona mahitaji kwa wakati halisi: ni bidhaa zipi watu wanaangalia na kuonyesha nia, usambazaji dhidi ya mahitaji kwa eneo, na ushauri wa kukua au kuuza nini. Kwenye Soko, kila tangazo linaonyesha idadi ya watazamaji na mibofyo ya "Nina nia" ili upate ishara halisi za soko.',
            tour_next: 'Endelea',
            tour_skip: 'Ruka — sihitaji hii',
            tour_done: 'Nimeelewa, twende!',
            stat_farmers: 'Wakulima',
            stat_traders: 'Wafanyabiashara',
            stat_listings: 'Matangazo',
            stat_articles: 'Makala za Elimu'
        }
    };

    // Comprehensive English -> Kiswahili phrase dictionary used to translate any
    // text that is not explicitly tagged with data-i18n (footers, legal pages,
    // auth forms, etc.). Matching is done by exact phrase.
    var PHRASES = {
  "5 out of 5 stars": "Nyenzo 5 kati ya 5",
  "2026 Theme: Climate Smart Agriculture": "Kaulimbiu ya 2026: Kilimo Bora cha Hali ya Hewa",
  ") and its services. By using our website, you consent to the practices described in this Policy.": ") na huduma zake. Kwa kutumia tovuti yetu, unakubali mazoea yaliyoelezwa katika Sera hii.",
  ") and related services. By accessing or using our website, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use the website.": ") na huduma zinazohusiana. Kwa kufikia au kutumia tovuti yetu, unakubali kufungwa na Masharti haya. Ikiwa hukubaliani na sehemu yoyote ya Masharti haya, tafadhali usitumie tovuti.",
  ". You confirm that the information you provide is accurate and that you have the right to provide it.": ". Unathibitisha kwamba taarifa unazotoa ni sahihi na kwamba una haki ya kuzitoa.",
  "1. About KCNP Agro": "1. Kuhusu KCNP Agro",
  "1. Information We Collect": "1. Taarifa Tunazozikusanya",
  "10. Changes to This Privacy Policy": "10. Mabadiliko ya Sera hii ya Faragha",
  "10. Severability": "10. Kutengwa kwa Vifungu",
  "11. Contact Us": "11. Wasiliana Nasi",
  "11. Termination": "11. Kukomeshwa",
  "12. Contact Us": "12. Wasiliana Nasi",
  "2. How We Use Your Information": "2. Jinsi Tunavyotumia Taarifa Zako",
  "2. Use of the Website": "2. Matumizi ya Tovuti",
  "3. Intellectual Property": "3. Haki za Miliki",
  "3. Legal Basis for Processing": "3. Msingi wa Kisheria wa Kusindika",
  "4. Data Storage and Security": "4. Uhifadhi wa Data na Usalama",
  "4. Submissions and User Content": "4. Mawasilisho na Maudhui ya Mtumiaji",
  "5. Data Retention": "5. Uhifadhi wa Data",
  "5. Disclaimer of Warranties": "5. Kukataliwa kwa Dhamana",
  "6. Limitation of Liability": "6. Kikomo cha Wajibu",
  "6. Sharing and Disclosure": "6. Kushiriki na Kufichua",
  "7. Third-Party Links": "7. Viungo vya Wahusika Wengine",
  "7. Your Rights": "7. Haki Zako",
  "8. Cookies and Tracking": "8. Vidakuzi na Ufuatiliaji",
  "8. Governing Law and Jurisdiction": "8. Sheria Inayotumika na Mamlaka",
  "9. Changes to These Terms": "9. Mabadiliko ya Masharti Haya",
  "9. Third-Party Links": "9. Viungo vya Nje",
  "A structured, community-first approach to transforming agriculture and trade.": "Mbinu iliyopangwa inayoweka jamii kwanza ya kubadilisha kilimo na biashara.",
  "Access the personal information we hold about you.": "Kupata taarifa za kibinafsi tunazokuweka.",
  "Account created successfully! Please log in with your new credentials.": "Akaunti imeundwa kwa mafanikio! Tafadhali ingia kwa kitambulisho chako kipya.",
  "Account Type": "Aina ya Akaunti",
  "Active Market Listings": "Matangazo ya Soko Yanayofanya Kazi",
  "Admin Overview": "Muhtasari wa Msimamizi",
  "Agriculture Thrives": "Kilimo Hustawi",
  "Already have an account?": "Tayari una akaunti?",
  "Assess & Research": "Tathmini na Utafiti",
  "At least 6 characters": "Angalau herufi 6",
  "Back to login": "Rudi kwenye kuingia",
  "Building a Future Where": "Kujenga Maisha ya Baadaye Ambapo",
  "Building transparent, traceable, and environmentally responsible supply networks that benefit every stakeholder from farm to fork.": "Kujenga mitandao ya ugavi iliyo wazi, inayoweza kufuatiliwa, na inayowajibika kwa mazingira inayowanufaisha wadau wote kutoka shambani hadi mezani.",
  "Buy and sell quality farm produce, seeds, tools, and services that support sustainable agriculture.": "Nunua na uze mazao bora ya shambani, mbegu, zana, na huduma zinazosaidia kilimo endelevu.",
  "Call for help": "Piga simu kwa usaidizi",
  "Capacity Building": "Uboreshaji wa Uwezo",
  "Carbon Credit Programs": "Programu za Mikopo ya Kaboni",
  "Carbon Credits": "Mikopo ya Kaboni",
  "Championing evidence-based policies that support climate-smart agriculture and fair international trade agreements for developing nations.": "Kutetea sera zenye msingi wa ushahidi zinazosaidia kilimo bora cha hali ya hewa na makubaliano ya biashara ya kimataifa kwa nchi zinazoendelea.",
  "Climate Smart Farming": "Kilimo Bora cha Hali ya Hewa",
  "Close quiz": "Funga jaribio",
  "Community-driven programs that prioritize equity and inclusion": "Programu zinazoendeshwa na jamii zinazotanguliza usawa na ushirikishwaji",
  "Comply with legal obligations and protect our legal rights.": "Kutimiza wajibu wa kisheria na kulinda haki zetu za kisheria.",
  "Comprehensive solutions that bridge the gap between sustainable agriculture and global trade markets.": "Suluhu kamili zinazouziba pengo kati ya kilimo endelevu na masoko ya biashara ya kimataifa.",
  "Confirm Password": "Thibitisha Nenosiri",
  "Connect & Scale": "Unganisha na Panua",
  "Connecting smallholder farmers with fair trade markets, establishing transparent supply chains, and promoting equitable commerce worldwide.": "Kuwaunganisha wakulima wadogo na masoko ya biashara ya haki, kuanzisha misururu wazi ya ugavi, na kukuza biashara yenye usawa duniani.",
  "Contact": "Wasiliana",
  "Contact form:": "Fomu ya mawasiliano:",
  "Contact Us": "Wasiliana Nasi",
  "Cooperative Leader, India": "Kiongozi wa Chama cha Ushirika, India",
  "Copy Link": "Nakili Kiungo",
  "Create one": "Unda moja",
  "Data portability.": "Uhamishaji wa data.",
  "Depending on your location, you may have the right to:": "Kulingana na mahali ulipo, unaweza kuwa na haki ya:",
  "Describe your product or service...": "Elezea bidhaa au huduma yako...",
  "Direct market access connecting farmers to fair trade buyers globally": "Ufikiaji wa soko la moja kwa moja unaowaunganisha wakulima na wanunuzi wa biashara ya haki duniani",
  "Don't have an account?": "Huna akaunti?",
  "e.g. 150": "k.m. 150",
  "e.g. kg, bag, unit": "k.m. kg, gunia, mzigo",
  "e.g. Mombasa, Kenya": "k.m. Mombasa, Kenya",
  "e.g. Organic maize seeds": "k.m. Mbegu za mahindi",
  "Email": "Barua pepe",
  "Email Address": "Anwani ya Barua pepe",
  "Email for newsletter": "Barua pepe kwa jarida",
  "Email:": "Barua pepe:",
  "Enabling farmers to earn from sustainable practices through verified carbon offset programs and environmental stewardship incentives.": "Kuwawezesha wakulima kupata mapato kutokana na mazoea endelevu kupitia programu zilizothibitishwa za kukabiliana na kaboni na motisha za utunzaji wa mazingira.",
  "Enter your full name": "Ingiza jina lako kamili",
  "Enter your password": "Ingiza nenosiri lako",
  "Evidence-based climate adaptation strategies for diverse agro-ecologies": "Mikakati ya kukabiliana na mabadiliko ya hali ya hewa yenye msingi wa ushahidi kwa aina mbalimbali za kilimo",
  "Farmer": "Mkulima",
  "Farmer, Kenya": "Mkulima, Kenya",
  "Farmers on Platform": "Wakulima kwenye Jukwaa",
  "Follow us on Instagram": "Tufuate kwenye Instagram",
  "Follow us on LinkedIn": "Tufuate kwenye LinkedIn",
  "Follow us on Twitter": "Tufuate kwenye Twitter",
  "Forgot password?": "Umesahau nenosiri?",
  "Full Name": "Jina Kamili",
  "General Inquiry": "Maswali ya Jumla",
  "Get In Touch": "Wasiliana Nasi",
  "Get Started": "Anza Sasa",
  "Hear from the communities and partners we work with across the globe.": "Sikia kutoka kwa jamii na washirika tunaofanya kazi nao duniani kote.",
  "Hero images": "Picha za mada",
  "How We Create": "Jinsi Tunavyounda",
  "If any provision of these Terms is held to be invalid or unenforceable, that provision shall be severed, and the remaining provisions shall continue in full force and effect.": "Ikiwa kifungu chochote cha Masharti haya kitapatikana kuwa batili au kisichotekelezeka, kifungu hicho kitaondolewa, na vifungu vilivyobaki vitaendelea kuwa na nguvu kamili.",
  "If you have any questions about these Terms, please contact us:": "Ikiwa una maswali kuhusu Masharti haya, tafadhali wasiliana nasi:",
  "If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:": "Ikiwa una maswali au wasiwasi kuhusu Sera hii ya Faragha au jinsi tunavyoshughulikia data, tafadhali wasiliana nasi:",
  "Impact": "Athari",
  "Implement & Train": "Tekeleza na Fundisha",
  "Implementing adaptive agricultural techniques that increase productivity while reducing environmental footprint and building climate resilience.": "Kutekeleza mbinu za kilimo zenye kubadilika zinazoongeza tija huku tukipunguza athari za mazingira na kujenga ustahimilivu wa hali ya hewa.",
  "Improve our website, services, and user experience.": "Kuboresha tovuti yetu, huduma, na uzoefu wa mtumiaji.",
  "Introduce any malicious software or interfere with the proper working of the website.": "Kuanzisha programu hasidi au kuingilia utendakazi mzuri wa tovuti.",
  "KCNP Agro Home": "Nyumbani KCNP Agro",
  "KCNP Agro is at the forefront of the global movement to transform agricultural systems. We believe that climate-smart agriculture isn't just about surviving — it's about building resilient, prosperous communities.": "KCNP Agro iko mstari wa mbele katika harakati za kimataifa za kubadilisha mifumo ya kilimo. Tunaamini kwamba kilimo bora cha hali ya hewa si kuhusu kuishi tu — ni kuhusu kujenga jamii zenye ustahimilivu na ustawi.",
  "KCNP Agro promotes climate-smart agriculture and trade initiatives for sustainable economic growth. The website provides information, resources, and contact facilities related to our programmes and services.": "KCNP Agro inakuza kilimo bora cha hali ya hewa na mipango ya biashara kwa ukuaji endelevu wa uchumi. Tovuti hutoa taarifa, rasilimali, na njia za mawasiliano zinazohusiana na programu na huduma zetu.",
  "Key statistics": "Takwimu muhimu",
  "Knowledge Articles": "Makala za Elimu",
  "Last updated: August 2026": "Ilisasishwa mwisho: Agosti 2026",
  "Learn More →": "Jifunze Zaidi →",
  "Legal": "Sheria",
  "Let's Build a": "Wacha Tujenge",
  "Loading articles...": "Inapakia makala...",
  "Loading listings...": "Inapakia matangazo...",
  "Loading quizzes...": "Inapakia maswali ya majaribio...",
  "Loading your dashboard...": "Inapakia dashibodi yako...",
  "Loading your listings...": "Inapakia matangazo yako...",
  "Location": "Eneo",
  "Location:": "Mahali:",
  "Login": "Ingia",
  "Main navigation": "Urambazaji mkuu",
  "Maintain records and audit logs of website activity.": "Kuhifadhi rekodi na kumbukumbu za shughuli za tovuti.",
  "Manage Education": "Simamia Elimu",
  "Marketplace": "Soko",
  "Message": "Ujumbe",
  "name, email address, subject, and message content you submit.": "jina, anwani ya barua pepe, mada, na maudhui ya ujumbe unayotuma.",
  "New Password": "Nenosiri Jipya",
  "Newsletter subscription:": "Usajili wa jarida:",
  "No listings found. Be the first to post!": "Hakuna matangazo. Kuwa wa kwanza kuchapisha!",
  "No photo chosen yet": "Hakuna picha iliyochaguliwa bado",
  "No reset token found in the link. Please request a new reset link.": "Hakuna hatimu ya kuweka upya katika kiungo. Tafadhali omba kiungo kipya.",
  "Object to or restrict certain processing of your data.": "Kukataa au kuzuia usindikaji fulani wa data yako.",
  "Oops! Something went wrong. Please try again later.": "Pole! Kuna hitilafu imetokea. Tafadhali jaribu tena baadaye.",
  "Organization": "Taasisi",
  "Our Approach": "Mbinu Yetu",
  "Our approach integrates cutting-edge research, indigenous knowledge, and modern technology to create farming systems that are productive, environmentally sustainable, and economically viable.": "Mbinu yetu inachanganya utafiti wa kisasa, maarifa ya asili, na teknolojia mpya kuunda mifumo ya kilimo yenye tija, endelevu kwa mazingira, na yenye faida kiuchumi.",
  "Our Core": "Msingi Wetu",
  "Our Mission": "Dhamira Yetu",
  "Our website may contain links to third-party websites and resources. We have no control over, and accept no responsibility for, the content, policies, or practices of any third-party sites. Access to any such sites is at your own risk.": "Tovuti inaweza kuwa na viungo vya tovuti na rasilimali za wahusika wengine. Hatuna udhibiti wa, na hatuchukulii jukumu la, maudhui, sera, au mazoea ya tovuti za wahusika wengine. Ufikiaji wa tovuti hizo ni kwa hatari yako mwenyewe.",
  "Our website may contain links to third-party websites, such as our social media profiles. We are not responsible for the privacy practices or content of those third-party sites. We encourage you to review their privacy policies.": "Tovuti yetu inaweza kuwa na viungo vya tovuti za wahusika wengine, kama vile wasifu wa mitandao yetu ya kijamii. Hatujibiki kwa mazoea ya faragha au maudhui ya tovuti hizo. Tunakuhimiza uyapitie sera zao za faragha.",
  "Our website may use cookies and similar technologies to enhance your browsing experience and analyse site usage. You can control cookies through your browser settings. At present, we do not use third-party advertising or analytics cookies that track you across other websites.": "Tovuti yetu inaweza kutumia vidakuzi na teknolojia sawa ili kuboresha uzoefu wako wa kuvinjari na kuchambua matumizi ya tovuti. Unaweza kudhibiti vidakuzi kupitia mipangilio ya kivinjari chako. Kwa sasa, hatutumii vidakuzi vya matangazo au uchambuzi vya wahusika wengine vinavyokufuatilia kwenye tovuti zingine.",
  "Partner With Us": "Shirikiana Nasi",
  "Partnership Inquiry": "Maswali ya Ushirikiano",
  "Password": "Nenosiri",
  "Phone": "Simu",
  "Phone:": "Simu:",
  "Policy & Advocacy": "Sera na Utetezi",
  "Policy Advocacy": "Utetezi wa Sera",
  "Policy Analyst, Nigeria": "Mchambuzi wa Sera, Nigeria",
  "Privacy Policy": "Sera ya Faragha",
  "Promoting climate smart agriculture and trade initiatives for sustainable economic growth worldwide.": "Kukuza kilimo bora cha hali ya hewa na mipango ya biashara kwa ukuaji wa uchumi endelevu duniani.",
  "Re-enter your new password": "Weka tena nenosiri lako jipya",
  "Remembered it?": "Umekumbuka?",
  "Request correction of inaccurate information.": "Kuomba marekebisho ya taarifa zisizo sahihi.",
  "Request deletion of your personal information.": "Kuomba kufutwa kwa taarifa zako za kibinafsi.",
  "Respond to your inquiries and messages.": "Kujibu maswali na ujumbe wako.",
  "Search listings...": "Tafuta matangazo...",
  "Skip to main content": "Ruka hadi maudhui makuu",
  "Select a subject": "Chagua mada",
  "Send Message": "Tuma Ujumbe",
  "Send you newsletters and updates you have subscribed to.": "Kukutumia jarida na taarifa mpya ulizojisajili.",
  "Sign Up": "Jisajili",
  "SMTP email isn't configured on this server, so here is your personal reset link (valid 60 minutes):": "Barua pepe ya SMTP haijawekwa kwenye seva hii, kwa hivyo hii ndiyo kiungo chako cha kibinafsi cha kuweka upya nenosiri (inatumika kwa dakika 60):",
  "Subject": "Mada",
  "Submit false, misleading, or defamatory information through our forms or other means.": "Kuwasilisha taarifa za uongo, za kupotosha, au za kukashiftu kupitia fomu zetu au njia nyingine.",
  "Subscribe on YouTube": "Jisajili kwenye YouTube",
  "Subscribe to newsletter": "Jisajili kwenye jarida",
  "Subscribe to our newsletter for the latest updates on climate-smart agriculture.": "Jisajili kwa jarida letu kwa habari mpya za kilimo bora cha hali ya hewa.",
  "Supply Chain": "Msururu wa Ugavi",
  "Sustainable Future": "Maisha Endelevu ya Baadaye",
  "Sustainable Supply Chains": "Misururu Endelevu ya Ugavi",
  "Sustainably": "Kwa Uendelevu",
  "Switch language": "Badilisha lugha",
  "Technical data:": "Data ya kiufundi:",
  "Tell us about your inquiry...": "Tuambie kuhusu swali lako...",
  "Terms of Service": "Masharti ya Huduma",
  "Testimonials": "Shuhuda",
  "Thank you! Your message has been sent successfully. We'll get back to you soon.": "Asante! Ujumbe wako umetumwa kwa mafanikio. Tutawasiliana nawe hivi karibuni.",
  "The website and its content are provided on an \"as is\" and \"as available\" basis without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the website will be uninterrupted, secure, or error-free, or that the content is accurate, complete, or current.": "Tovuti na maudhui yake hutolewa kwa msingi wa \"jinsi yalivyo\" na \"inavyopatikana\" bila dhamana ya aina yoyote, iwe ya moja kwa moja au ya kidhahiri, ikijumuisha, lakini haikuwekewa kikomo, dhamana ya kufaa kwa biashara, kufaa kwa madhumuni fulani, au kutokiukwa. Hatuthibitishi kwamba tovuti haiwezi kukatika, ni salama, au haina makosa, au kwamba maudhui ni sahihi, kamili, au ya sasa.",
  "These rights are recognised under, among others, Kenya's Data Protection Act, 2019. To exercise any of these rights, please contact us using the details below.": "Haki hizi zinatambuliwa chini ya, miongoni mwa zingine, Sheria ya Ulinzi wa Data ya Kenya, 2019. Ili kutumia haki hizo, tafadhali wasiliana nasi kupitia maelezo hapa chini.",
  "These Terms of Service (\"Terms\") govern your access to and use of the KCNP Agro website (": "Masharti haya ya Huduma (\"Masharti\") yanasimamia ufikiaji wako na matumizi yako ya tovuti ya KCNP Agro (",
  "These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any disputes arising out of or relating to these Terms or your use of the website shall be subject to the exclusive jurisdiction of the courts of Kenya.": "Masharti haya yatasimamiwa na kufasiriwa kwa kufuata sheria za Jamhuri ya Kenya. Migogoro yoyote inayotokana na au kuhusiana na Masharti haya au matumizi yako ya tovuti itahukumiwa na mahakama za Kenya pekee.",
  "To the maximum extent permitted by law, KCNP Agro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising out of or in connection with your use of the website, even if we have been advised of the possibility of such damages.": "Kwa kiwango kikubwa kinachoruhusiwa na sheria, KCNP Agro haitawajibika kwa uharibifu wowote usio wa moja kwa moja, badala, maalum, unaofuata, au wa adhabu, au upotevu wa faida au data, unaotokana na au kuhusiana na matumizi yako ya tovuti, hata kama tulifahamishwa juu ya uwezekano wa uharibifu kama huo.",
  "Toggle mobile menu": "Fungua menyu ya simu",
  "Trade & Market Access": "Biashara na Ufikiaji wa Soko",
  "Trade Facilitation": "Urahisishaji wa Biashara",
  "Trade Hub": "Kituo cha Biashara",
  "Trader": "Mfanyabiashara",
  "Traders on Platform": "Wafanyabiashara kwenye Jukwaa",
  "Training programs and educational workshops that empower farming communities with knowledge, tools, and sustainable business practices.": "Programu za mafunzo na semina za elimu zinazowapa jamii za wakulima maarifa, zana, na mazoea endelevu ya biashara.",
  "View Marketplace": "Tazama Soko",
  "Voices of": "Sauti za",
  "we may automatically collect basic technical information, such as your IP address, browser type, and pages visited, to help us operate and improve the website.": "tunaweza kukusanya taarifa za kiufundi kiotomatiki, kama vile anwani yako ya IP, aina ya kivinjari, na kurasa ulizotembelea, ili kutusaidia kuendesha na kuboresha tovuti.",
  "We collect information you voluntarily provide to us through our website:": "Tunakusanya taarifa unazotupa kwa hiari kupitia tovuti yetu:",
  "We conduct in-depth agro-ecological assessments and market analyses to identify the most impactful intervention points.": "Tunafanya tathmini za kina za kilimo na uchambuzi wa soko ili kutambua maeneo yenye athari kubwa ya kuingilia.",
  "We deploy climate-smart solutions and provide hands-on training programs tailored to local farming communities and their unique challenges.": "Tunatumia suluhu bora za hali ya hewa na kutoa programu za mafunzo zinazolingana na jamii za wakulima na changamoto zao za kipekee.",
  "We do not sell, trade, or rent your personal information to third parties. We may only share your information to the extent required by law, to protect our rights and safety, or with service providers who help us operate our website and are bound by confidentiality obligations.": "Hatuzii, hatufanyii biashara, wala hatukopeshi taarifa zako za kibinafsi kwa wahusika wengine. Tunaweza kushiriki taarifa zako tu kwa kiwango kinachotakiwa na sheria, kulinda haki zetu na usalama, au na watoa huduma wanaotusaidia kuendesha tovuti yetu na wanaofungwa na wajibu wa usiri.",
  "Welcome,": "Karibu,",
  "We link farmers to fair trade markets, measure outcomes, and scale successful models across regions for maximum sustainable impact.": "Tunawaunganisha wakulima na masoko ya biashara ya haki, kupima matokeo, na kupanua mifano iliyofanikiwa kote kwa athari endelevu.",
  "We may update or modify these Terms at any time. Any changes will be effective immediately upon posting on this page. Your continued use of the website following any changes constitutes your acceptance of the revised Terms.": "Tunaweza kusasisha au kubadilisha Masharti haya wakati wowote. Mabadiliko yoyote yataanza kutumika mara tu yatakapochapishwa kwenye ukurasa huu. Kuendelea kwako kutumia tovuti baada ya mabadiliko kunaashiria kukubali kwako Masharti mapya.",
  "We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date. We encourage you to review this Policy periodically to stay informed about how we protect your information.": "Tunaweza kusasisha Sera hii ya Faragha mara kwa mara. Mabadiliko yoyote yatachapishwa kwenye ukurasa huu na tarehe mpya. Tunakuhimiza uipitie Sera hii mara kwa mara ili ujue jinsi tunavyolinda taarifa zako.",
  "We process your personal information based on your consent (for example, when you submit a contact form or subscribe to our newsletter) and on our legitimate interest in operating and improving our services. You may withdraw your consent at any time by contacting us using the details below.": "Tunachakata taarifa zako za kibinafsi kwa msingi wa idhini yako (kwa mfano, unapotuma fomu ya mawasiliano au kujisajili kwenye jarida letu) na kwa maslahi yetu halali katika kuendesha na kuboresha huduma zetu. Unaweza kuondoa idhini yako wakati wowote kwa kuwasiliana nasi kupitia maelezo hapa chini.",
  "We reserve the right to restrict, suspend, or terminate your access to the website at our sole discretion, without notice, if we believe you have violated these Terms.": "Tunahifadhi haki ya kuweka kikomo, kusimamisha, au kukomesha ufikiaji wako kwa tovuti kwa hiari yetu, bila taarifa, ikiwa tunaamini umevunja Masharti haya.",
  "We retain your personal information only for as long as necessary to fulfil the purposes described in this Policy, unless a longer retention period is required or permitted by law. You may request deletion of your information at any time.": "Tunahifadhi taarifa zako za kibinafsi tu kwa muda muhimu wa kutimiza madhumuni yaliyoelezwa katika Sera hii, isipokuwa sheria inataka au inaruhusu muda mrefu zaidi. Unaweza kuomba kufutwa kwa taarifa zako wakati wowote.",
  "We use the information we collect to:": "Tunatumia taarifa tunazokusanya kwa:",
  "What We Do": "Tunachokifanya",
  "When you submit information through our contact form or subscribe to our newsletter, you grant us the right to use that information to respond to you and provide our services, in accordance with our": "Unapotuma taarifa kupitia fomu yetu ya mawasiliano au kujisajili kwenye jarida letu, unatupa haki ya kutumia taarifa hizo kukujibu na kukupa huduma zetu, kulingana na",
  "Whether you're a farmer, policymaker, researcher, or organization, we'd love to explore how we can collaborate for sustainable impact.": "Iwe wewe ni mkulima, mtoa sera, mtafiti, au shirika, tungependa kuchunguza jinsi tunavyoweza kushirikiana kwa athari endelevu.",
  "You agree to use the website only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit the use and enjoyment of the website by any third party. You must not:": "Unakubali kutumia tovuti tu kwa madhumuni halali na kwa njia isiyokiuka haki za, isiyozuia, au isiyokwamiza matumizi ya tovuti na mtu mwingine yeyote. Hupaswi:",
  "You have full access. Manage marketplace content from the API and keep the knowledge base fresh.": "Una ufikiaji kamili. Simamia maudhui ya soko kupitia API na uwe na msingi mpya wa maarifa.",
  "Your email": "Barua pepe yako",
  "your email address.": "anwani yako ya barua pepe.",
  "Your organization (optional)": "Taasisi yako (hiari)",
  "you@example.com": "wewe@mfano.com",
  "Account created! Redirecting you to login...": "Akaunti imeundwa! Tunakuelekeza kwenye kuingia...",
  "Copied!": "Imenakiliwa!",
  "Create Account": "Unda Akaunti",
  "Creating account...": "Inaunda akaunti...",
  "Logging in...": "Inaingia...",
  "Login successful! Taking you to your dashboard...": "Umefanikiwa kuingia! Tunakupeleka kwenye dashibodi yako...",
  "Message must be at least 10 characters.": "Ujumbe lazima uwe na angalau herufi 10.",
  "Network error. Please check your connection and try again.": "Hitilafu ya mtandao. Tafadhali angalia muunganisho wako na ujaribu tena.",
  "Network error. Please try again.": "Hitilafu ya mtandao. Tafadhali jaribu tena.",
  "Passwords do not match.": "Manenosiri hayafanani.",
  "Password must be at least 6 characters.": "Nenosiri lazima liwe na angalau herufi 6.",
  "Please enter a valid email address.": "Tafadhali ingiza anwani sahihi ya barua pepe.",
  "Please enter your email address.": "Tafadhali ingiza anwani yako ya barua pepe.",
  "Please enter your full name.": "Tafadhali ingiza jina lako kamili.",
  "Please enter your message.": "Tafadhali ingiza ujumbe wako.",
  "Please select a subject.": "Tafadhali chagua mada.",
  "Reset Password": "Weka Upya Nenosiri",
  "Resetting...": "Inaweka upya...",
  "Send Reset Link": "Tuma Kiungo cha Kuweka Upya",
  "Sending...": "Inatuma...",
  "Thank you for subscribing!": "Asante kwa kujisajili!",
  "Login failed. Please try again.": "Imeshindikana kuingia. Tafadhali jaribu tena.",
  "Login timed out. Please try again.": "Muda wa kuingia umeisha. Tafadhali jaribu tena.",
  "Browse produce and products from farmers, then reach out to buy.": "Vinjari mazao na bidhaa za wakulima, kisha wasiliana kwa kununua.",
  "Click to read more...": "Bonyeza kusoma zaidi...",
  "Failed to load listings:": "Imeshindikana kupakia matangazo:",
  "Full platform overview and management access.": "Muhtasari kamili wa jukwaa na ufikiaji wa usimamizi.",
  "If that email is registered, a reset link has been sent.": "Ikiwa barua pepe hiyo imesajiliwa, kiungo cha kuweka upya kimetumwa.",
  "Manage your listings, post produce, and reach traders directly.": "Simamia matangazo yako, chapisha mazao, na fikia wafanyabiashara moja kwa moja.",
  "Registration failed. Please try again.": "Imeshindikana kujisajili. Tafadhali jaribu tena.",
  "Request timed out. Please try again.": "Muda umeisha. Tafadhali jaribu tena.",
  "Something went wrong. Please try again.": "Kuna hitilafu imetokea. Tafadhali jaribu tena.",
  "Subscription failed. Please try again.": "Usajili umeharibika. Tafadhali jaribu tena.",
  "Failed to delete. Please try again.": "Imeshindikana kufuta. Tafadhali jaribu tena.",
  "Failed to submit.": "Imeshindikana kuwasilisha.",
  "Network error or request timed out.": "Hitilafu ya mtandao au muda umeisha.",
  "Thank you for subscribing! You'll receive our latest updates.": "Asante kwa kujisajili! Utapokea taarifa zinazoendelea.",
  "Failed to send message. Please try again.": "Imeshindikana kutuma ujumbe. Tafadhali jaribu tena.",
  "Your password has been reset.": "Nenosiri lako limewekwa upya.",
  "Failed to reset password. Please try again.": "Imeshindikana kuweka upya nenosiri. Tafadhali jaribu tena.",
  "Market Insights": "Uchambuzi wa Soko",
  "Supply & Demand Analysis": "Uchambuzi wa Ugavi na Mahitaji",
  "Automatic analysis of what buyers are looking at and where selling opportunities are strongest, based on live marketplace activity.": "Uchambuzi wa kiotomatiki wa kile wanunuzi wanachokitafuta na mahali ambapo fursa za kuuza zina nguvu zaidi, kulingana na shughuli za moja kwa moja za soko.",
  "Active Listings": "Matao Halali",
  "Views (30 days)": "Waliotazama (Siku 30)",
  "Interested (30 days)": "Wanaopenda (Siku 30)",
  "Top Opportunity": "Fursa Kubwa Zaidi",
  "Category": "Kategoria",
  "Listings": "Matao",
  "Avg Price": "Bei ya Wastani",
  "Views": "Waliotazama",
  "Interest": "Wanaopenda",
  "Balance": "Usawa",
  "Supply": "Ugavi",
  "Demand": "Mahitaji",
  "Top Opportunities": "Fursa Kubwa",
  "Demand by Category": "Mahitaji kwa Kategoria",
  "Market Segments": "Makundi ya Soko",
  "Analyzing the market...": "Inachambua soko...",
  "Could not load market insights. Please try again.": "Imeshindikana kupakia uchambuzi wa soko. Tafadhali jaribu tena.",
  "No listings yet — once farmers post listings, supply and demand analysis will appear here.": "Bado hakuna matao — mara tu wakulima watakapochapisha matangazo, uchambuzi wa ugavi na mahitaji utaonekana hapa.",
  "Not enough buyer activity yet. As farmers promote their listings and buyers click \"I'm interested\", the analysis gets smarter.": "Bado hakuna shughuli za kutosha za wanunuzi. Wakulima wanapotangaza na wanunuzi kubofya \"Nina nia\", uchambuzi unaboreka.",
  "No standout opportunities right now.": "Hakuna fursa dhahiri kwa sasa.",
  "Post a listing to start the analysis": "Chapisha tangazo ili kuanza uchambuzi",
  "Refresh": "Boresha",
  "High demand · Low supply": "Mahitaji makubwa · Ugavi mdogo",
  "Balanced": "Sawa",
  "High supply · Low demand": "Ugavi mwingi · Mahitaji machache",
  "Collecting data": "Inakusanya data",
  "Strong buyer interest here — consider posting a new listing or raising prices.": "Kuna hamu kubwa ya wanunuzi hapa — zingatia kuchapisha tangazo jipya au kuongeza bei.",
  "Supply matches demand — expect steady prices.": "Ugavi unalingana na mahitaji — tarajia bei thabiti.",
  "Many listings with low interest — prices may soften. Differentiate your listing with quality and good photos.": "Matao mengi yenye mahitaji machache — bei zinaweza kushuka. Boresha tangazo lako kwa ubora na picha nzuri.",
  "Not enough buyer activity yet — keep prices fair and encourage buyers to click \"I'm interested\".": "Bado hakuna shughuli za kutosha za wanunuzi — weka bei zenye usawa na uwahimize wanunuzi kubofya \"Nina nia\".",
  "I'm interested": "Nina nia",
  "views": "watazamaji",
  "interested": "wenye nia",
  "listings": "matao",
  "Supply and demand analysis from live listing activity.": "Uchambuzi wa ugavi na mahitaji kutokana na shughuli za matangazo.",
  "Top opportunity:": "Fursa kubwa:",
  "Posting hasn't started yet.": "Bado hakuna matangazo yamechapishwa.",
  "Open Market Insights": "Fungua Uchambuzi wa Soko",
  "If that email is registered, a password reset link has been sent.": "Ikiwa anwani hii ya barua pepe imesajiliwa, kiungo cha kuweka upya nenosiri kimetumwa.",
  "Password reset link generated. SMTP is not configured, so the link is shown below.": "Kiungo cha kuweka upya nenosiri kimeundwa. SMTP haijasanidiwa, kwa hivyo kiungo kinaonyeshwa hapa chini.",
  "Password reset link generated. Email delivery failed, so the link is shown below.": "Kiungo cha kuweka upya nenosiri kimeundwa. Uwasilishaji wa barua pepe umeshindikana, kwa hivyo kiungo kinaonyeshwa hapa chini.",
  "This reset link is invalid or has expired. Please request a new one.": "Kiungo hiki cha upya nenosiri si sahihi au kimeisha. Tafadhali omba kipya.",
  "Your password has been reset successfully. You can now log in with your new password.": "Nenosiri lako limewekwa upya kwa mafanikio. Sasa unaweza kuingia kwa kutumia nenosiri lako jipya.",
  "Failed to reset your password. Please try again.": "Imeshindikana kuweka upya nenosiri lako. Tafadhali jaribu tena."
};

    var PHRASE_REV = {};
    (function () {
        for (var k in PHRASES) {
            if (Object.prototype.hasOwnProperty.call(PHRASES, k)) {
                PHRASE_REV[PHRASES[k]] = k;
            }
        }
    })();

    // Browser tab titles per language.
    var PAGE_TITLES = {
        sw: {
            'Login | KCNP Agro': 'Ingia | KCNP Agro',
            'Register | KCNP Agro': 'Jisajili | KCNP Agro',
            'Forgot Password | KCNP Agro': 'Nenosiri la Kusahau | KCNP Agro',
            'Reset Password | KCNP Agro': 'Weka Upya Nenosiri | KCNP Agro',
            'Marketplace | KCNP Agro': 'Soko | KCNP Agro',
            'Education | KCNP Agro': 'Elimu | KCNP Agro',
            'Market Insights | KCNP Agro': 'Uchambuzi wa Soko | KCNP Agro',
            'Dashboard | KCNP Agro': 'Dashibodi | KCNP Agro',
            'Privacy Policy | KCNP Agro': 'Sera ya Faragha | KCNP Agro',
            'Terms of Service | KCNP Agro': 'Masharti ya Huduma | KCNP Agro',
            'KCNP Agro | Climate Smart Agriculture & Trade': 'KCNP Agro | Kilimo Bora na Biashara'
        },
        en: {
            'Ingia | KCNP Agro': 'Login | KCNP Agro',
            'Jisajili | KCNP Agro': 'Register | KCNP Agro',
            'Nenosiri la Kusahau | KCNP Agro': 'Forgot Password | KCNP Agro',
            'Weka Upya Nenosiri | KCNP Agro': 'Reset Password | KCNP Agro',
            'Soko | KCNP Agro': 'Marketplace | KCNP Agro',
            'Elimu | KCNP Agro': 'Education | KCNP Agro',
            'Uchambuzi wa Soko | KCNP Agro': 'Market Insights | KCNP Agro',
            'Dashibodi | KCNP Agro': 'Dashboard | KCNP Agro',
            'Sera ya Faragha | KCNP Agro': 'Privacy Policy | KCNP Agro',
            'Masharti ya Huduma | KCNP Agro': 'Terms of Service | KCNP Agro',
            'KCNP Agro | Kilimo Bora na Biashara': 'KCNP Agro | Climate Smart Agriculture & Trade'
        }
    };

    // Translate any string through the phrase dictionary (used by inline scripts).
    function trPhrase(text) {
        if (!text) return text;
        var dict = currentLang() === 'sw' ? PHRASES : PHRASE_REV;
        return dict[text] !== undefined ? dict[text] : text;
    }

    // Walk the page and translate every static piece of text, placeholder,
    // title and aria-label that we have a phrase for, handling data-i18n
    // elements (already translated) and script/style content.
    function translatePage() {
        if (!document.body) return;
        var lang = currentLang();
        if (lang !== 'sw' && lang !== 'en') return;
        var dict = lang === 'sw' ? PHRASES : PHRASE_REV;

        if (PAGE_TITLES[lang] && PAGE_TITLES[lang][document.title]) {
            document.title = PAGE_TITLES[lang][document.title];
        }

        var nodes = document.createTreeWalker(document.body, 4, null, false);
        var list = [];
        var cur;
        while ((cur = nodes.nextNode())) list.push(cur);
        list.forEach(function (node) {
            var text = node.nodeValue || '';
            if (!text) return;
            var parent = node.parentElement;
            if (!parent || !parent.closest) return;
            if (parent.closest('[data-i18n],[data-i18n-placeholder],[data-i18n-title],script,style,noscript,code,pre')) return;
            var phrase = text.replace(/\s+/g, ' ').trim();
            if (!phrase || dict[phrase] === undefined) return;
            var lead = text.match(/^\s*/)[0];
            var trail = text.match(/\s*$/)[0];
            node.nodeValue = lead + dict[phrase] + trail;
        });

        ['placeholder', 'title', 'aria-label'].forEach(function (attr) {
            document.querySelectorAll('[' + attr + ']').forEach(function (el) {
                if (attr === 'placeholder' && el.hasAttribute && el.hasAttribute('data-i18n-placeholder')) return;
                if (attr === 'title' && el.closest && el.closest('[data-i18n-title]')) return;
                var val = el.getAttribute(attr);
                if (!val) return;
                var key = val.replace(/\s+/g, ' ').trim();
                if (dict[key] !== undefined) el.setAttribute(attr, dict[key]);
            });
        });
    }

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

        // Translate static content that is not tagged with data-i18n.
        translatePage();

        // Let pages that load dynamic content re-render in the new language
        try {
            var evt = new Event('kcnp:lang', { bubbles: true });
            document.dispatchEvent(evt);
        } catch (e) {}

        // Re-translate once dynamic content has re-rendered (if any).
        setTimeout(function () {
            try { translatePage(); } catch (e) {}
        }, 0);
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
    var TOUR_STEPS = 8;

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

    function nextTour() { setTourStep(tourStep + 1); }

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
        nextTour: nextTour,
        trPhrase: trPhrase
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
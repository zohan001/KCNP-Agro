/**
 * ============================================
 * Seed Data
 * ============================================
 * Content used to populate the knowledge base and
 * quizzes. Every lesson has one quiz, and every
 * article/quiz also carries a Kiswahili version
 * (titleSw/summarySw/contentSw and *Sw fields on
 * questions) so illiterate or non-English readers
 * can listen to content read aloud in Swahili.
 *
 * Exports:
 *  - SEED_USERS, SEED_ARTICLES, SEED_QUIZZES
 *
 * Running directly (npm run seed) seeds a fresh
 * database. The exported objects are also used by
 * scripts/update-content.js to safely update an
 * existing database without wiping user data.
 * ============================================
 */

const SEED_USERS = [
    { name: 'KCNP Admin', email: 'admin@kcnpagro.org', password: 'adminpass123', role: 'admin' },
    { name: 'Demo Farmer', email: 'farmer@example.com', password: 'farmer123', role: 'farmer' },
    { name: 'Demo Trader', email: 'trader@example.com', password: 'trader123', role: 'trader' }
];

const SEED_ARTICLES = [
    {
        title: 'Getting Started with Climate-Smart Agriculture',
        titleSw: 'Kuanza na Kilimo Bora kwa Mazingira',
        category: 'climate-smart-farming',
        summary: 'An introduction to the three pillars of climate-smart agriculture: productivity, adaptation, and mitigation, with practical first steps for smallholder farmers.',
        summarySw: 'Utangulizi wa nguzo tatu za kilimo bora kwa mazingira: uzalishaji, kukabiliana na mabadiliko, na kupunguza gesi chafu, pamoja na hatua za kwanza kwa mkulima mdogo.',
        content: '<p>Climate-Smart Agriculture (CSA) is an approach endorsed by the Food and Agriculture Organization that helps farmers transform their systems under a changing climate. It rests on three interconnected pillars: (1) sustainably increasing productivity and farm incomes, (2) adapting and building resilience to climate shocks such as drought and floods, and (3) reducing greenhouse gas emissions where possible.</p><p>For a smallholder in Kenya, the three pillars translate into practical choices:</p><ul><li>Productivity: use improved, drought-tolerant seed varieties and apply fertiliser at the right rate, time and place.</li><li>Adaptation: diversify crops and livestock, plant early-maturing varieties, and conserve moisture with mulching and zai pits.</li><li>Mitigation: add organic matter to soil to store carbon, practise agroforestry, and avoid burning crop residues.</li></ul><p>Start small. Pick one field, adopt two or three practices for a season, and track yields and costs. Most CSA measures pay for themselves within two seasons and reduce risk in bad years.</p>',
        contentSw: '<p>Kilimo Bora kwa Mazingira (CSA) ni njia inayopendekezwa na Shirika la Chakula na Kilimo (FAO) inayowasaidia wakulima kubadilisha mfumo wa kilimo chao wakati wa mabadiliko ya tabianchi. Inaegemea nguzo tatu zinazohusiana: (1) kuongeza uzalishaji na mapato ya shamba kwa njia endelevu, (2) kukabiliana na ugumu wa tabianchi kama ukame na mafuriko, na (3) kupunguza gesi chafu inapowezekana.</p><p>Kwa mkulima mdogo hapa Kenya, nguzo hizo tatu zinahitaji maamuzi ya vitendo:</p><ul><li>Uzalishaji: tumia mbegu bora zinazostahimili ukame na utie mbolea kwa kiwango, wakati na mahali sahihi.</li><li>Kukabiliana: weka mazao na mifugo mbalimbali, panda aina zinazoiva haraka, na uhifadhi unyevu kwa kufunika udongo na mashimo ya zai.</li><li>Kupunguza gesi chafu: ongeza vitu vya kikaboni kwenye udongo ili kuhifadhi carbon, tumia kilimo cha miti, na usichome mabaki ya mazao.</li></ul><p>Anza kidogo. Chagua shamba moja, utumie mazoea mawili au matatu kwa msimu, na urekodi mavuno na gharama. Mazoea mengi ya CSA hujilipa ndani ya misimu miwili na kupunguza hatari katika miaka ya mvua haba.</p>',
        tags: ['introduction', 'basics', 'resilience'],
        published: true
    },
    {
        title: 'Soil Health: The Foundation of Productive Farms',
        titleSw: 'Afya ya Udongo: Msingi wa Mashamba Yenye Mavuno',
        category: 'soil-health',
        summary: 'How to build living, water-retentive soil through composting, cover cropping, minimum tillage and regular testing.',
        summarySw: 'Jinsi ya kujenga udongo wenye uhai unaoshikilia maji, kupitia mboji, mimea ya kufunika, kilimo cha kiwango cha chini na kupima udongo mara kwa mara.',
        content: '<p>Healthy soil is a living ecosystem of bacteria, fungi, earthworms and root networks. Soils high in organic matter hold up to 20 times their weight in water, resist erosion, and release nutrients steadily to crops.</p><p>Five practices rebuild soil health on small farms:</p><ul><li>Compost: turn crop residues and manure into stable organic fertiliser instead of burning them.</li><li>Cover crops and green manures such as lablab, mucuna or dolichos fix nitrogen and protect the surface.</li><li>Minimum tillage: disturb the top few centimetres only, preserving soil structure and moisture.</li><li>Crop rotation: alternate cereals with legumes to break pest cycles and balance nutrients.</li><li>Mulching: keep the soil covered with residue to reduce evaporation and erosion.</li></ul><p>Test your soil every two years through KALRO county offices or certified labs to learn its pH and nutrient levels. In the coastal belt, liming may be needed to correct acidic soils. Healthy soil stores carbon too, which makes it a climate solution as much as a production input.</p>',
        contentSw: '<p>Udongo wenye afya ni mfumo hai wa bakteria, fungi, minyoo na mizizi mingi. Udongo wenye vitu vingi vya kikaboni hushikilia maji hadi mara 20 ya uzito wake, hupinga mmomonyoko, na hutoa virutubisho kwa mazao taratibu.</p><p>Mazoea matano hurejesha afya ya udongo:</p><ul><li>Mboji: geuza mabaki ya mazao na samadi kuwa samadi bora ya kikaboni badala ya kuichoma.</li><li>Mimea ya kufunika na samadi ya kijani kama lablab, mucuna au mbazzi huongeza nitrojeni na kulinda uso wa udongo.</li><li>Kilimo cha kiwango cha chini: fukua sentimita chache tu za juu, kulinda muundo na unyevu wa udongo.</li><li>Mzunguko wa mazao: badilisha nafaka na kunde ili kuvunja mizunguko ya wadudu na kusawazisha virutubisho.</li><li>Kufunika udongo: weka mabaki ili kupunguza uvukizi na mmomonyoko.</li></ul><p>Pima udongo wako kila baada ya miaka miwili kupitia ofisi za KALRO katika kaunti au maabara zilizoidhinishwa ili kujua pH na virutubisho. Katika eneo la pwani, udongo wenye asidi unaweza kuhitaji kuongezewa chokaa. Udongo wenye afya huhifadhi carbon pia, kwa hiyo ni suluhisho la tabianchi na pia rasilimali ya uzalishaji.</p>',
        tags: ['soil', 'compost', 'rotation', 'cover-crops'],
        published: true
    },
    {
        title: 'Water Conservation Techniques for Dry Regions',
        titleSw: 'Uhifadhi wa Maji kwa Maeneo Makavu',
        category: 'water-management',
        summary: 'Rainwater harvesting, drip irrigation, zai pits and mulching techniques that help farmers survive erratic rainfall and drought.',
        summarySw: 'Uvunaji wa maji ya mvua, umwagiliaji wa matone, mashimo ya zai na mbinu za kufunika udongo zitakazowasaidia wakulima kustahimili mvua zisizotabirika na ukame.',
        content: '<p>Water is the single biggest constraint along Kenya\u2019s dry land, coastal and ASAL areas. Farmers can stretch every drop by combining the techniques below.</p><ul><li>Rainwater harvesting: collect roof run-off in tanks or earth dams. A 100 m\u00b2 roof can capture about 90,000 litres of water each year in coastal rainfall.</li><li>Contour bunds and swales: dig ridges that follow the land\u2019s contour so run-off slows, spreads and sinks into the soil.</li><li>Zai pits: plant in small basins filled with manure that concentrate water and nutrients at the root zone.</li><li>Drip irrigation: deliver water directly to plant roots through low-cost drip kits. It cuts water use by 40\u201360% compared with surface irrigation.</li><li>Mulching and shading: cover the soil with dry grass or residue to cut evaporation and keep roots cool.</li></ul><p>Time irrigation for early morning or evening to reduce losses, and consider soil-moisture indicators so you only water when the crop actually needs it. Water-stressed crops that then receive rain often recover well when moisture is managed carefully.</p>',
        contentSw: '<p>Maji ndiyo changamoto kubwa zaidi katika maeneo makavu ya Kenya, pwani na maeneo ya ASAL. Wakulima wanaweza kuokoa kila tone kwa kuchanganya mbinu zifuatazo.</p><ul><li>Uvunaji wa maji ya mvua: kusanya maji ya paa kwenye matanki au mabwawa. Paa la mita 100 za mraba linaweza kukusanya takriban lita 90,000 za maji kila mwaka kwenye mvua za pwani.</li><li>Matuta ya mipaka na swales: chimba tuta linalofuata mwendo wa ardhi ili maji ya juu yapunguze mwendo, yasambae na kuingia udongoni.</li><li>Mashimo ya zai: panda kwenye mashimo madogo yaliyojazwa samadi ambayo hukusanya maji na virutubisho kwenye eneo la mizizi.</li><li>Umwagiliaji wa matone: peleka maji moja kwa moja kwenye mizizi kwa vifaa vya bei nafuu. Hupunguza matumizi ya maji kwa asilimia 40 hadi 60 ikilinganishwa na umwagiliaji wa kawaida.</li><li>Kufunika na kuvulia: funika udongo na majani makavu kupunguza uvukizi na kuweka mizizi baridi.</li></ul><p>Umwagilie asubuhi na mapema au jioni ili kupunguza upotevu, na uangalie ishara za unyevu wa udongo ili umwagilie wakati mazao yanahitaji tu. Mazao yaliyokosa maji yakipata mvua baadaye hurudi vizuri mara nyingi ikiwa unyevu unasimamiwa kwa makini.</p>',
        tags: ['water', 'drought', 'irrigation', 'hoarding'],
        published: true
    },
    {
        title: 'Cropping Strategies for a Changing Climate',
        titleSw: 'Mikakati ya Mazao kwa Mabadiliko ya Tabianchi',
        category: 'crop-diversification',
        summary: 'How intercropping, early-maturing varieties and diversified field planning reduce risk and stabilise incomes.',
        summarySw: 'Jinsi kuweka mazao mbalimbali, aina zinazoiva haraka na upangaji wa shamba unavyopunguza hatari na kuimarisha mapato.',
        content: '<p>Relying on a single crop leaves a household vulnerable to one bad season. Diversification spreads the risk of price collapse, disease outbreaks and erratic rainfall.</p><p>Three strategies work well for Kenyan smallholders:</p><ul><li>Intercrop cereals with legumes: maize with beans or cowpeas boosts total yield per hectare, adds nitrogen to the soil, and provides a protein source for the household.</li><li>Plant early-maturing and drought-tolerant varieties: certified Katumani and KDV maize, cassava, sweet potato and sorghum perform better when rains are short.</li><li>Plan a staggered crop calendar: split a plot into blocks planted at two-week intervals so a dry spell never wipes out the whole field.</li></ul><p>Keep a written farm journal noting planting dates, rainfall, and harvest weights each season. The journal becomes your best planning tool, showing which varieties and rotations earn the most for your land.</p>',
        contentSw: '<p>Kutegemea zao moja hufanya familia ipate hasara kwa msimu mmoja mbaya. Kuweka mazao mbalimbali kunagawanya hatari ya kushuka kwa bei, milipuko ya magonjwa na mvua isiyotabirika.</p><p>Mikakati mitatu inafanya kazi vizuri kwa wakulima wa Kenya:</p><ul><li>Panda nafaka na kunde pamoja: mahindi pamoja na maharage au mbaazi huongeza mavuno kwa hekari, huongeza nitrojeni udongoni, na hutoa protini kwa familia.</li><li>Panda aina zinazoiva haraka na kustahimili ukame: mahindi yaliyoidhinishwa ya Katumani na KDV, muhogo, viazi vitamu na mtama hufanya vizuri wakati mvua ni fupi.</li><li>Panga kalenda ya kupanda kwa vipindi: gawa shamba katika vipande vinavyopandwa kila baada ya wiki mbili ili ukame usiiangamize shamba lote kwa wakati mmoja.</li></ul><p>Weka shajara ya shamba ukirekodi tarehe za kupanda, mvua na uzito wa mavuno kila msimu. Shajara hiyo inakuwa chombo chako bora cha kupanga, kikionyesha mazao na mzunguko gani unaleta mapato mengi kwa ardhi yako.</p>',
        tags: ['crop-diversification', 'intercropping', 'maize', 'sorghum'],
        published: true
    },
    {
        title: 'Carbon Credits: Turning Soil into Income',
        titleSw: 'Kadi za Carbon: Kugeuza Udongo kuwa Mapato',
        category: 'carbon-credits',
        summary: 'How regenerative practices such as agroforestry and conservation agriculture can earn farmers verified carbon income.',
        summarySw: 'Jinsi mazoea kama kilimo cha miti na kilimo endelevu vinavyoweza kuwapa wakulima mapato halali ya carbon.',
        content: '<p>Carbon credit programmes pay farmers for practices that remove or avoid carbon dioxide emissions. Regenerative agriculture \u2014 agroforestry, conservation tillage, cover cropping and improved manure management \u2014 can all qualify.</p><p>The typical journey:</p><ul><li>Project registration: a programme developer registers the farm or farmer group with a standard such as Verra or Gold Standard.</li><li>Baseline and plan: a baseline of current emissions is measured and a practice plan agreed.</li><li>Implementation and monitoring: the farmer adopts the practices and keeps seasonal records, often using a mobile app.</li><li>Verification and sale: an independent auditor verifies the sequestered carbon, which is then sold as offsets.</li></ul><p>While verification needs careful record-keeping, the extra income stream is attractive: maize producers practising agroforestry in Mt. Kenya and Rift Valley projects have earned meaningful top-ups on top of crop sales. Ask your county agricultural officer about registered carbon projects near you.</p>',
        contentSw: '<p>Mipango ya kadi za carbon huwalipa wakulima wanaofanya mazoea yanayotoa au kuzuia utoaji wa carbon dioksidi. Kilimo cha kurejesha udongo \u2014 kilimo cha miti, kilimo cha kiwango cha chini, mimea ya kufunika na usimamizi bora wa samadi \u2014 vyote vinaweza kustahili.</p><p>Hatua za kawaida:</p><ul><li>Usajili wa mradi: mtengenezaji wa mpango anasajili shamba au kikundi cha wakulima na kiwango kama Verra au Gold Standard.</li><li>Kipimo cha hali ya sasa na mpango: kipimo cha utoaji wa sasa kinafanyika na mpango wa mazoea unakubaliwa.</li><li>Utekelezaji na ufuatiliaji: mkulima anafuata mazoea na kuweka rekodi za msimu, mara nyingi kupitia simu.</li><li>Uthibitishaji na uuzaji: mkaguzi huru anathibitisha carbon iliyohifadhiwa, kisha inauzwa kama fidia ya makali ya kaboni.</li></ul><p>Ingawa uthibitishaji unahitaji utunzaji makini wa rekodi, mapato ya ziada yanavutia: wakulima wa mahindi wanaofanya kilimo cha miti katika miradi ya Mlima Kenya na Bonde la Ufa wamepata mapato ya ziada kwa kuongezea mauzo ya mazao. Uliza afisa wa kilimo wa kaunti yako kuhusu miradi iliyosajiliwa ya carbon karibu nawe.</p>',
        tags: ['carbon', 'income', 'agroforestry', 'verification'],
        published: true
    },
    {
        title: 'From Farm to Market: Post-Harvest Success',
        titleSw: 'Kutoka Shambani Mpaka Sokoni: Mafanikio Baada ya Mavuno',
        category: 'market-access',
        summary: 'Grading, storage, aggregation and digital platforms that help farmers earn more and waste less after harvest.',
        summarySw: 'Upangaji, uhifadhi, kuchanganya na majukwaa ya kidijitali yanayowasaidia wakulima kupata mapato zaidi na kupoteza kidogo baada ya mavuno.',
        content: '<p>Smallholders often lose 20\u201340% of harvest value to poor handling, storage and informal sales. Better post-harvest management turns more of the crop into cash.</p><p>Steps that raise farm-gate value:</p><ul><li>Grade and sort: separate produce by size and quality. Buyers pay a premium for uniform, clean lots.</li><li>Dry and store properly: use hermetic bags (e.g. Purdue Improved Crop Storage) to stop weevils and aflatoxin in maize and beans.</li><li>Aggregate with neighbours: sell as a group to reach larger buyers such as millers, hotels and exporters, negotiating better prices than alone.</li><li>Use digital channels: list surplus produce on marketplaces like this platform so traders can find you directly, skipping exploitative middlemen.</li><li>Watch timing: understand seasonal price patterns and, where possible, store to sell a few weeks after peak harvest when prices rise.</li></ul><p>Keep simple records of what you sell and at what price. This data reveals your most profitable crops and customers.</p>',
        contentSw: '<p>Wakulima wadogo mara nyingi hupoteza asilimia 20 hadi 40 ya thamani ya mavuno kwa usafirishaji, uhifadhi na mauzo yasiyo rasmi. Usimamizi bora baada ya mavuno hugeuza sehemu kubwa ya mazao kuwa fedha.</p><p>Hatua zinazoongeza thamani shambani:</p><ul><li>Panga na chagua: tenga mazao kwa ukubwa na ubora. Wanunuzi hulipa ziada kwa mazao yenye ubora sawa na safi.</li><li>Kausha na hifadhi vizuri: tumia mifuko ya hermetic (kama Purdue Improved Crop Storage) kuzuia wadudu na sumu ya aflatoxin kwenye mahindi na maharage.</li><li>Changanya na majirani: uzeni kama kikundi ili kufikia wanunuzi wakubwa kama viwanda vya kusaga, hoteli na waagizaji, na mazungumzo ya bei bora kuliko ukishiriki peke yako.</li><li>Tumia njia za kidijitali: orodhesha mazao yaliyobaki kwenye majukwaa kama hili ili wafanyabiashara wakufikie moja kwa moja, bila madalali wanaonyonya.</li><li>Angalia muda: elewa mabadiliko ya bei za msimu na, inapowezekana, hifadhi uze wiki chache baada ya mavuno mengi wakati bei zinapanda.</li></ul><p>Weka rekodi rahisi za unachouza na bei. Takwimu hizi zinaonyesha mazao na wanunuzi wanaoleta mapato mengi.</p>',
        tags: ['market', 'post-harvest', 'grading', 'storage'],
        published: true
    },
    {
        title: 'Climate Policy and Support for Kenyan Farmers',
        titleSw: 'Sera za Tabianchi na Msaada kwa Wakulima wa Kenya',
        category: 'policy',
        summary: 'National strategies, county programmes and financing available to Kenyan farmers adopting climate-smart practices.',
        summarySw: 'Mikakati ya kitaifa, mipango ya kaunti na fedha zinazopatikana kwa wakulima wa Kenya wanaotumia mazoea bora kwa mazingira.',
        content: '<p>Kenya has a supportive policy environment for climate-smart agriculture. The National Climate Change Action Plan and the Kenya Climate-Smart Agriculture Strategy orient public investment toward resilient farming, while the Climate Change Act provides a legal framework for adaptation and emission reduction.</p><p>At county level, agriculture departments run farmer field schools, distribute vouchers for improved seed and fertiliser, and pilot weather-indexed insurance. Under the e-voucher system, eligible smallholders buy subsidised seed and fertiliser through mobile payment schemes. The Agricultural Finance Corporation, commercial banks and SACCOs offer loans for irrigation equipment, greenhouses and dairy with climate-mitigation goals.</p><p>Your new KCNP education hub summarises these and links you to apply. Practically: register with your county\u2019s agriculture office, join a registered farmer group to access group credit and insurance, and keep your land title or an official lease document, which is often needed for credit applications.</p>',
        contentSw: '<p>Kenya ina mazingira mazuri ya sera kwa kilimo bora kwa mazingira. Mpango wa Kitaifa wa Mabadiliko ya Tabianchi na Mkakati wa Kilimo Bora kwa Mazingira wa Kenya huelekeza uwekezaji wa umma kwenye kilimo endelevu, huku Sheria ya Mabadiliko ya Tabianchi ikitoa mfumo wa kisheria wa kukabiliana na tabianchi na kupunguza gesi chafu.</p><p>Katika ngazi ya kaunti, idara za kilimo huendesha shule za shambani kwa wakulima, kusambaza vocha za mbegu na mbolea bora, na kuendesha majaribio ya bima zinazotegemea hali ya hewa. Kupitia mfumo wa e-voucher, wakulima wanaostahili hununua mbegu na mbolea kwa bei nafuu kupitia malipo ya simu. Shirika la Fedha la Kilimo (AFC), benki na SACCO hutoa mikopo kwa vifaa vya umwagiliaji, greenhouses na mifugo yenye malengo ya kupunguza madhara ya tabianchi.</p><p>Kituo chako kipya cha elimu cha KCNP kinafupisha habari hizi na kukuunganisha na maombi. Kiutendaji: jiandikishe na ofisi ya kilimo ya kaunti yako, jiunge na kikundi kilichosajiliwa cha wakulima ili kupata mikopo na bima ya kikundi, na uweke tayari hati ya ardhi au mkataba rasmi, ambao mara nyingi unahitajika kwa maombi ya mikopo.</p>',
        tags: ['policy', 'financing', 'county', 'insurance'],
        published: true
    },
    {
        title: 'Manure, Livestock and the Circular Farm',
        titleSw: 'Samadi, Mifugo na Shamba la Mzunguko',
        category: 'general',
        summary: 'Integrating livestock and crops so that manure builds soil, feeds biogas and turns farm waste into assets.',
        summarySw: 'Kuunganisha mifugo na mazao ili samadi ijenge udongo, iwashe biogas na kugeuza taka za shamba kuwa rasilimali.',
        content: '<p>A mixed farm is a circular farm: what one enterprise wastes, another uses. Livestock convert forage into manure, and well-managed manure becomes the engine of soil fertility.</p><p>Best practice in manure management:</p><ul><li>Compost manure before applying: raw manure loses nitrogen and can burn crops; composted manure feeds soil microbes safely.</li><li>Store under cover: pile manure on a hard surface with a roof or sheet so nutrients and soil are not washed away by rain.</li><li>Time application: spread before planting and top-dress at the crop\u2019s peak growth stage, matching supply to crop demand.</li><li>Feed a biogas digester: cow dung runs a simple digester that produces cooking gas, reduces wood fuel demand and cuts deforestation; the slurry is an excellent organic fertiliser.</li></ul><p>Zero-grazing systems on small plots also reduce overgrazing, capture emissions, and keep animals healthy and productive. A single dairy cow on zero-grazing provides manure for roughly an acre of intensively managed crops.</p>',
        contentSw: '<p>Shamba mchanganyiko ni shamba la mzunguko: kile shughuli moja inachotupa, nyingine inakitumia. Mifugo hubadilisha malisho kuwa samadi, na samadi inayosimamiwa vizuri huwa injini ya rutuba ya udongo.</p><p>Mbinu bora za usimamizi wa samadi:</p><ul><li>Tengeneza mboji kabla ya kutumia: samadi mbichi hupoteza nitrojeni na inaweza kuchoma mazao; samadi ya mboji inalisha vijidudu vya udongo kwa usalama.</li><li>Hifadhi mahali pa kufunikwa: weka samadi kwenye uso mgumu wenye paa au turuba ili virutubisho na udongo visiwekuwa na mvua.</li><li>Panga muda wa kutumia: eneza kabla ya kupanda na upandie kiwango cha juu wakati mazao yakikua, ulinganishe upatikanaji na mahitaji ya mazao.</li><li>Washa mfumo wa biogas: kinyesi cha ng\u2019ombe kinawasha mfumo rahisi unaozalisha gesi ya kupikia, kupunguza matumizi ya kuni na kukata miti; maji ya samadi yanayobaki ni mbolea bora ya kikaboni.</li></ul><p>Mifumo ya kufuga bila malisho huru kwenye mashamba madogo pia hupunguza kuzidiwa kwa malisho, hushika gesi chafu, na kuweka wanyama wenye afya na tija. Ng\u2019ombe mmoja wa maziwa katika mfumo huo hutoa samadi ya kutosha kwa takriban ekari moja ya mazao yanayosimamiwa kwa nguvu.</p>',
        tags: ['livestock', 'manure', 'biogas', 'circular'],
        published: true
    }
];

const SEED_QUIZZES = [
    {
        title: 'Climate Smart Basics',
        titleSw: 'Misingi ya Kilimo Bora kwa Mazingira',
        description: 'Test your understanding of climate-smart agriculture fundamentals and the three pillars.',
        descriptionSw: 'Jaribu uelewa wako wa misingi ya kilimo bora kwa mazingira na nguzo zake tatu.',
        category: 'climate-basics',
        published: true,
        questions: [
            {
                question: 'What are the three pillars of Climate-Smart Agriculture?',
                questionSw: 'Ni zipi nguzo tatu za Kilimo Bora kwa Mazingira?',
                options: ['Profit, speed and scale', 'Productivity, adaptation and mitigation', 'Irrigation, chemicals and mechanisation', 'Seeds, fertiliser and credit'],
                optionsSw: ['Faida, kasi na saizi', 'Uzalishaji, kukabiliana na mabadiliko na kupunguza gesi chafu', 'Umwagiliaji, kemikali na mashine', 'Mbegu, mbolea na mikopo'],
                correctIndex: 1,
                explanation: 'CSA sustainably increases productivity, adapts to climate change, and mitigates greenhouse gas emissions.',
                explanationSw: 'CSA huongeza uzalishaji kwa njia endelevu, hukabiliana na mabadiliko ya tabianchi, na hupunguza gesi chafu.'
            },
            {
                question: 'Which practice most directly improves soil health?',
                questionSw: 'Ni mazoea yapi yanaboresha afya ya udongo moja kwa moja?',
                options: ['Burning crop residue', 'Continuous monoculture of maize', 'Composting and crop rotation', 'Increasing pesticide use only'],
                optionsSw: ['Kuchoma mabaki ya mazao', 'Kulima mahindi tu msimu baada ya msimu', 'Mboji na mzunguko wa mazao', 'Kuongeza dawa tu'],
                correctIndex: 2,
                explanation: 'Composting and rotation add organic matter and break pest and disease cycles.',
                explanationSw: 'Mboji na mzunguko huongeza vitu vya kikaboni na kuvunja mizunguko ya wadudu na magonjwa.'
            },
            {
                question: 'Which irrigation method is most water-efficient for small plots?',
                questionSw: 'Ni njia gani ya umwagiliaji inayotumia maji kidogo zaidi kwa mashamba madogo?',
                options: ['Flood irrigation', 'Drip irrigation', 'Sprinklers run at midday', 'Relying on rain only'],
                optionsSw: ['Kumwaga maji shambani', 'Umwagiliaji wa matone', 'Kumwagia jua kali', 'Kutegemea mvua tu'],
                correctIndex: 1,
                explanation: 'Drip irrigation delivers water directly to the roots and can cut water use by 40-60%.',
                explanationSw: 'Umwagiliaji wa matone hupeleka maji moja kwa moja kwenye mizizi na hupunguza matumizi ya maji kwa 40-60%.'
            },
            {
                question: 'What is a key benefit of agroforestry for carbon credits?',
                questionSw: 'Ni faida gani kuu ya kilimo cha miti kwa kadi za carbon?',
                options: ['It increases soil erosion', 'It captures carbon and diversifies farmer income', 'It requires more synthetic fertiliser', 'It reduces biodiversity'],
                optionsSw: ['Inaongeza mmomonyoko wa udongo', 'Inahifadhi carbon na kuongeza mapato mbalimbali ya mkulima', 'Inahitaji mbolea nyingi ya viwandani', 'Inapunguza viumbe hai'],
                correctIndex: 1,
                explanation: 'Trees capture carbon in wood and soil while providing fruit, timber and shade income.',
                explanationSw: 'Miti huhifadhi carbon kwenye mbao na udongo huku ikitoa mapato ya matunda, mbao na kivuli.'
            },
            {
                question: 'Why should farmers keep a written farm journal?',
                questionSw: 'Kwa nini wakulima wanapaswa kuweka shajara ya shamba?',
                options: ['It makes plots look neat', 'It is required by law', 'It records planting, rainfall and harvests to guide future planning', 'It replaces the need to test soil'],
                optionsSw: ['Kufanya mashamba yaonekane', 'Inahitajika na sheria', 'Inarekodi kupanda, mvua na mavuno ili kuongoza mipango ya mbelé', 'Inachukua nafasi ya kupima udongo'],
                correctIndex: 2,
                explanation: 'Seasonal records reveal which varieties and rotations earn the most on your land.',
                explanationSw: 'Rekodi za msimu zinaonyesha mazao na mzunguko gani unaleta mapato mengi kwenye ardhi yako.'
            }
        ]
    },
    {
        title: 'Soil and Water Stewardship',
        titleSw: 'Usimamizi wa Udongo na Maji',
        description: 'Five questions on building healthy soil and conserving water through practical techniques.',
        descriptionSw: 'Maswali matano kuhusu kujenga udongo wenye afya na kuhifadhi maji kwa mbinu za vitendo.',
        category: 'soil-management',
        published: true,
        questions: [
            {
                question: 'Which soil-management practice stores the most carbon in the long term?',
                questionSw: 'Ni mazoea yapi ya usimamizi wa udongo yanahifadhi carbon zaidi kwa muda mrefu?',
                options: ['Deep ploughing every season', 'Adding organic matter through compost and cover crops', 'Burning residues to clear the field', 'Applying only inorganic fertiliser'],
                optionsSw: ['Kulima kwa kina kila msimu', 'Kuongeza vitu vya kikaboni kupitia mboji na mimea ya kufunika', 'Kuchoma mabaki kusafisha shamba', 'Kutumia mbolea ya viwandani tu'],
                correctIndex: 1,
                explanation: 'Organic matter builds stable soil carbon, improving water retention and fertility simultaneously.',
                explanationSw: 'Vitu vya kikaboni hujenga carbon ya udongo imara, kuboresha uhifadhi wa maji na rutuba kwa pamoja.'
            },
            {
                question: 'What are zai pits used for?',
                questionSw: 'Mashimo ya zai hutumiwa kwa nini?',
                options: ['Storing harvested grain', 'Concentrating water and nutrients at the root zone of plants', 'Raising fish', 'Channeling irrigation pipes'],
                optionsSw: ['Kuhifadhi nafaka zilizovunwa', 'Kukusanya maji na virutubisho kwenye eneo la mizizi ya mimea', 'Kufuga samaki', 'Kusonga mabomba ya umwagiliaji'],
                correctIndex: 1,
                explanation: 'Zai pits are planting basins filled with organic matter that catch and hold water during rainfall.',
                explanationSw: 'Mashimo ya zai ni mashimo ya kupandia yaliyojazwa vitu vya kikaboni vinavyoshika na kushikilia maji wakati wa mvua.'
            },
            {
                question: 'How much can drip irrigation reduce water use compared with surface irrigation?',
                questionSw: 'Umwagiliaji wa matone hupunguza matumizi ya maji kwa kiasi gani ikilinganishwa na umwagiliaji wa kawaida?',
                options: ['About 5-10%', '20-30%', '40-60%', 'Nothing; it uses more water'],
                optionsSw: ['Karibu 5-10%', '20-30%', '40-60%', 'Hakuna; unatumia maji zaidi'],
                correctIndex: 2,
                explanation: 'Directly wetting the root zone cuts evaporation and run-off losses dramatically.',
                explanationSw: 'Kumwagia eneo la mizizi moja kwa moja hupunguza uvukizi na upotevu kwa kiasi kikubwa.'
            },
            {
                question: 'What is the best time of day to irrigate to minimise loss?',
                questionSw: 'Ni wakati gani bora wa siku wa kumwagilia ili kupunguza upotevu?',
                options: ['Noon', 'Mid-afternoon', 'Early morning or evening', 'Anytime, it makes no difference'],
                optionsSw: ['Adhuhuri', 'Mwisho wa mchana', 'Asubuhi na mapema au jioni', 'Wakati wowote, hakuna tofauti'],
                correctIndex: 2,
                explanation: 'Cooler times reduce evaporation before water reaches the roots.',
                explanationSw: 'Wakati wa baridi hupunguza uvukizi kabla maji kufika kwenye mizizi.'
            },
            {
                question: 'Why should soil pH be tested periodically?',
                questionSw: 'Kwa nini pH ya udongo ipimwe mara kwa mara?',
                options: ['Because pH never changes', 'To learn nutrient availability and decide whether liming is needed', 'To prove ownership of the land', 'To measure rainfall'],
                optionsSw: ['Kwa sababu pH haibadiliki', 'Ili kujua upatikanaji wa virutubisho na kuamua kama chokaa inahitajika', 'Kuthibitisha umiliki wa ardhi', 'Kupima mvua'],
                correctIndex: 1,
                explanation: 'Extremes of pH lock up nutrients; testing tells you what to amend, such as lime on acidic coastal soils.',
                explanationSw: 'pH kali hufunga virutubisho; kupima kunakuambia unachopaswa kuongeza, kama chokaa kwenye udongo wenye asidi wa pwani.'
            }
        ]
    },
    {
        title: 'Carbon, Markets and Farm Profit',
        titleSw: 'Carbon, Soko na Faida ya Shamba',
        description: 'Four questions on carbon income, post-harvest handling and getting better prices.',
        descriptionSw: 'Maswali manne kuhusu mapato ya carbon, usimamizi baada ya mavuno na kupata bei bora.',
        category: 'carbon-footprint',
        published: true,
        questions: [
            {
                question: 'Which bodies set the standards for verifying carbon credits?',
                questionSw: 'Ni mashirika yapi yanaweka viwango vya uthibitishaji wa kadi za carbon?',
                options: ['KRA and county governments', 'Verra, Gold Standard and similar standards bodies', 'Seed companies', 'Local SACCOs'],
                optionsSw: ['KRA na serikali za kaunti', 'Verra, Gold Standard na mashirika kama hayo', 'Kampuni za mbegu', 'SACCO za eneo'],
                correctIndex: 1,
                explanation: 'Independent standards such as Verra and Gold Standard certify that credits are real and verified.',
                explanationSw: 'Viwango huru kama Verra na Gold Standard vinathibitisha kuwa kadi ni halisi na zimepangwa.'
            },
            {
                question: 'What is the best way to reduce maize losses after harvest?',
                questionSw: 'Ni njia gani bora ya kupunguza upotevu wa mahindi baada ya mavuno?',
                options: ['Stack sacks in the field', 'Dry fully and store in hermetic bags', 'Keep grain in open woven bags', 'Store while still wet and green'],
                optionsSw: ['Kuweka magunia shambani', 'Kukausha vizuri na kuhifadhi kwenye mifuko ya hermetic', 'Kuweka nafaka kwenye magunia ya wazi', 'Kuhifadhi nafaka ikiva na unyevu na bado mbichi'],
                correctIndex: 1,
                explanation: 'Hermetic bags cut oxygen so weevils die and aflatoxin cannot grow, preserving quality for better prices.',
                explanationSw: 'Mifuko ya hermetic hukata oksijeni, wadudu wanakufa na aflatoxin haikui, kubakiza ubora kwa bei bora.'
            },
            {
                question: 'Why does selling as a farmer group usually earn higher prices?',
                questionSw: 'Kwa nini kuuza kama kikundi cha wakulima kawaida hupata bei bora?',
                options: ['Groups always get subsidies', 'Larger, uniform volumes attract bigger buyers and stronger negotiation', 'Groups pay lower taxes', 'There is no difference'],
                optionsSw: ['Vikundi hupata ruzuku kila wakati', 'Kiasi kikubwa chenye ubora sawa huvutia wanunuzi wakubwa na mazungumzo imara', 'Vikundi hulipa kodi ndogo', 'Hakuna tofauti'],
                correctIndex: 1,
                explanation: 'Aggregation gives buyers the consistent volume and quality they need, so they pay premium prices.',
                explanationSw: 'Kuchanganya kunawapa wanunuzi kiasi na ubora wanachohitaji, kwa hiyo hulipa bei ya juu.'
            },
            {
                question: 'What is a practical way to raise farm-gate value before sale?',
                questionSw: 'Ni njia gani ya vitendo ya kuongeza thamani ya mavuno kabla ya kuuza?',
                options: ['Mix all sizes together in one sack', 'Grade and sort produce into uniform, clean lots', 'Sell immediately at any price', 'Add stones to increase weight'],
                optionsSw: ['Kuchanganya ukubwa wote kwenye gunia moja', 'Kupanga na kuchagua mazao kwa kundi lenye ubora sawa na safi', 'Kuuza mara moja kwa bei yoyote', 'Kuongeza mawe kuongeza uzito'],
                correctIndex: 1,
                explanation: 'Uniform, clean lots command higher prices because buyers spend less on sorting and waste.',
                explanationSw: 'Kundi lenye ubora sawa hupata bei bora kwa sababu wanunuzi hutumia kidogo kupanga na kuharibu.'
            }
        ]
    },
    {
        title: 'Water Conservation Skills',
        titleSw: 'Ujuzi wa Uhifadhi wa Maji',
        description: 'Five questions on rainwater harvesting, drip irrigation and techniques that hold moisture in the soil.',
        descriptionSw: 'Maswali matano kuhusu uvunaji wa maji ya mvua, umwagiliaji wa matone na mbinu za kuhifadhi unyevu udongoni.',
        category: 'water-conservation',
        published: true,
        questions: [
            {
                question: 'Which irrigation method is most water-efficient for small plots?',
                questionSw: 'Ni njia gani ya umwagiliaji inayotumia maji kidogo zaidi kwa mashamba madogo?',
                options: ['Flooding the whole field', 'Drip irrigation', 'Watering at noon with sprinklers', 'Waiting only for rain'],
                optionsSw: ['Kumwaga maji shambani lote', 'Umwagiliaji wa matone', 'Kumwagia jua kali na manyunyuzi', 'Kusubiri mvua tu'],
                correctIndex: 1,
                explanation: 'Drip irrigation sends water straight to the roots and can cut water use by 40-60%.',
                explanationSw: 'Umwagiliaji wa matone hupeleka maji kwenye mizizi moja kwa moja na unaweza kupunguza matumizi ya maji kwa 40-60%.'
            },
            {
                question: 'How much water can a roof of about 100 square metres collect in one year near the coast?',
                questionSw: 'Paa la takriban mita 100 za mraba linaweza kukusanya maji kiasi gani kwa mwaka karibu na pwani?',
                options: ['About 90 litres', 'About 900 litres', 'About 90,000 litres', 'It cannot collect water'],
                optionsSw: ['Takriban lita 90', 'Takriban lita 900', 'Takriban lita 90,000', 'Haliwezi kukusanya maji'],
                correctIndex: 2,
                explanation: 'A 100 m² roof can capture roughly 90,000 litres each year in coastal rainfall.',
                explanationSw: 'Paa la mita 100 za mraba linaweza kukusanya takriban lita 90,000 kila mwaka kwenye mvua za pwani.'
            },
            {
                question: 'What is the main purpose of contour bunds and swales?',
                questionSw: 'Ni nini kusudi kuu la matuta ya mipaka (contour bunds) na swales?',
                options: ['To make the field look neat', 'To slow runoff so water sinks into the soil', 'To block rivers', 'To store harvested grain'],
                optionsSw: ['Kufanya shamba lionekane zuri', 'Kupunguza mwendo wa maji ya juu ili yaingie udongoni', 'Kuziba mito', 'Kuhifadhi nafaka zilizovunwa'],
                correctIndex: 1,
                explanation: 'They follow the land\u2019s contour so runoff slows, spreads and sinks into the soil.',
                explanationSw: 'Yanafuata mwendo wa ardhi ili maji ya juu yapungue, yasambae na kuingia udongoni.'
            },
            {
                question: 'Where do zai pits concentrate water and nutrients?',
                questionSw: 'Mashimo ya zai hukusanya maji na virutubisho wapi?',
                options: ['At the base of the leaves', 'At the root zone of the plant', 'On top of the soil surface', 'Inside the storage shed'],
                optionsSw: ['Chini ya majani', 'Kwenye eneo la mizizi ya mmea', 'Juu ya uso wa udongo', 'Ndani ya ghala la kuhifadhia'],
                correctIndex: 1,
                explanation: 'Zai pits are planting basins filled with manure that catch water at the roots.',
                explanationSw: 'Mashimo ya zai ni mashimo ya kupandia yaliyojazwa samadi yanayoshika maji kwenye mizizi.'
            },
            {
                question: 'When is the best time to irrigate to reduce water loss?',
                questionSw: 'Ni wakati gani bora wa kumwagilia ili kupunguza upotevu wa maji?',
                options: ['Noon', 'Mid-afternoon', 'Early morning or evening', 'Whenever it is raining'],
                optionsSw: ['Adhuhuri', 'Mwisho wa mchana', 'Asubuhi na mapema au jioni', 'Wakati wowote mvua inanyesha'],
                correctIndex: 2,
                explanation: 'Cooler times reduce evaporation before water reaches the roots.',
                explanationSw: 'Wakati wa baridi hupunguza uvukizi kabla maji kufika kwenye mizizi.'
            }
        ]
    },
    {
        title: 'Diversified Cropping',
        titleSw: 'Kilimo cha Mazao Mbalimbali',
        description: 'Four questions on intercropping, early-maturing varieties and staggered field planning.',
        descriptionSw: 'Maswali manne kuhusu mchanganyiko wa mazao, aina zinazoiva haraka na upangaji wa shamba kwa vipindi.',
        category: 'crop-planning',
        published: true,
        questions: [
            {
                question: 'Why is intercropping maize with beans recommended?',
                questionSw: 'Kwa nini kupanda mahindi pamoja na maharage kunapendekezwa?',
                options: ['It looks good on the farm', 'It boosts total yield, adds nitrogen and provides protein', 'It doubles work for no benefit', 'It makes the soil acidic'],
                optionsSw: ['Inafanya shamba lionekane zuri', 'Inaongeza mavuno yote, nitrojeni na protini kwa familia', 'Inazidisha kazi pasipo faida', 'Inafanya udongo kuwa na asidi'],
                correctIndex: 1,
                explanation: 'Cereals and legumes complement each other, improving yield, soil nutrients and food for the family.',
                explanationSw: 'Nafaka na kunde zinasailiana, kuboresha mavuno, virutubisho vya udongo na chakula kwa familia.'
            },
            {
                question: 'Which type of maize survives short rains best?',
                questionSw: 'Ni aina gani ya mahindi inayostahimili mvua fupi vyema?',
                options: ['Certified Katumani maize', 'Long-maturing maize', 'River-irrigated maize', 'Sweet maize only'],
                optionsSw: ['Mahindi yaliyoidhinishwa ya Katumani', 'Mahindi ya muda mrefu', 'Mahindi ya umwagiliaji', 'Mahindi matamu tu'],
                correctIndex: 0,
                explanation: 'Early-maturing, drought-tolerant varieties like Katumani and KDV perform better when rains are short.',
                explanationSw: 'Aina zinazoiva haraka na kustahimili ukame kama Katumani na KDV hufanya vizuri zaidi wakati mvua ni fupi.'
            },
            {
                question: 'What is a staggered crop calendar?',
                questionSw: 'Kalenda ya kupanda kwa vipindi ni nini?',
                options: ['Planting everything on the same day', 'Splitting a plot into blocks planted at two-week intervals', 'Planting only at night', 'Removing all crops after rain'],
                optionsSw: ['Kupanda kila kitu siku moja', 'Kugawa shamba katika vipande vinavyopandwa kila baada ya wiki mbili', 'Kupanda usiku tu', 'Kuondoa mazao yote baada ya mvua'],
                correctIndex: 1,
                explanation: 'Staggered planting means a dry spell never wipes out the whole field at once.',
                explanationSw: 'Kupanda kwa vipindi kumaanisha ukame hauwezi kuharibu shamba lote kwa wakati mmoja.'
            },
            {
                question: 'What is a key benefit of rotating cereals with legumes?',
                questionSw: 'Faida kuu ya mzunguko wa nafaka na kunde ni ipi?',
                options: ['It breaks pest cycles and balances nutrients', 'It makes the soil too acidic', 'It increases pesticide needs', 'It only works on large farms'],
                optionsSw: ['Inavunja mizunguko ya wadudu na kusawazisha virutubisho', 'Inafanya udongo kuwa na asidi nyingi', 'Inaongeza hitaji la dawa', 'Inafanya kazi kwa mashamba makubwa tu'],
                correctIndex: 0,
                explanation: 'Rotation interrupts the life-cycle of pests and restores nitrogen to the soil.',
                explanationSw: 'Mzunguko huzuia wadudu kukamilisha mzunguko wao na kurudisha nitrojeni udongoni.'
            }
        ]
    },
    {
        title: 'Post-Harvest and Market Access',
        titleSw: 'Mavuno na Ufikiaji wa Soko',
        description: 'Four questions on storing grain, sorting produce and selling for better prices.',
        descriptionSw: 'Maswali manne kuhusu kuhifadhi nafaka, kupanga mazao na kuuza kwa bei bora.',
        category: 'general',
        published: true,
        questions: [
            {
                question: 'How much of a smallholder\u2019s harvest value can be lost after harvest?',
                questionSw: 'Kiasi gani cha thamani ya mavuno ya mkulima mdogo kinaweza kupotea baada ya mavuno?',
                options: ['About 1-5%', 'About 20-40% or more', 'Almost nothing', 'More than 100% always'],
                optionsSw: ['Takriban 1-5%', 'Takriban 20-40% au zaidi', 'Karibu hakuna', 'Zaidi ya 100% daima'],
                correctIndex: 1,
                explanation: 'Poor handling, storage and informal sales can wipe out 20-40% of the harvest value.',
                explanationSw: 'Usafirishaji, uhifadhi na mauzo yasiyo rasmi yanaweza kupoteza asilimia 20-40 ya thamani ya mavuno.'
            },
            {
                question: 'Why store maize in hermetic bags?',
                questionSw: 'Kwa nini hifadhi mahindi kwenye mifuko ya hermetic?',
                options: ['To make the grain heavier', 'To stop weevils and aflatoxin', 'To make it ripen faster', 'Only for export boxes'],
                optionsSw: ['Ili nafaka iwe nzito', 'Ili kuzuia wadudu na aflatoxin', 'Ili iive haraka', 'Ni kwa sanduku za kuagiza nje tu'],
                correctIndex: 1,
                explanation: 'Hermetic bags cut oxygen, so weevils die and aflatoxin cannot grow, preserving quality.',
                explanationSw: 'Mifuko ya hermetic hukata oksijeni, wadudu wanakufa na aflatoxin haikui, kubakiza ubora.'
            },
            {
                question: 'Why do farmer groups usually earn higher prices?',
                questionSw: 'Kwa nini vikundi vya wakulima kawaida hupata bei bora?',
                options: ['Groups always get subsidies', 'Larger uniform volumes attract bigger buyers', 'Groups pay lower taxes', 'There is no difference'],
                optionsSw: ['Vikundi hupata ruzuku kila wakati', 'Kiasi kikubwa chenye ubora sawa huvutia wanunuzi wakubwa', 'Vikundi hulipa kodi ndogo', 'Hakuna tofauti'],
                correctIndex: 1,
                explanation: 'Aggregation gives buyers the consistent volume and quality they need, so they pay a premium.',
                explanationSw: 'Kuchanganya kunawapa wanunuzi kiasi na ubora wanachohitaji, kwa hiyo hulipa bei ya ziada.'
            },
            {
                question: 'What is a practical way to raise farm-gate value before selling?',
                questionSw: 'Ni njia gani ya vitendo ya kuongeza thamani ya mavuno kabla ya kuuza?',
                options: ['Mix all sizes together in one sack', 'Grade and sort produce into uniform clean lots', 'Sell immediately at any price', 'Add stones to increase weight'],
                optionsSw: ['Kuchanganya ukubwa wote kwenye gunia moja', 'Kupanga na kuchagua mazao kwa kundi lenye ubora sawa na safi', 'Kuuza mara moja kwa bei yoyote', 'Kuongeza mawe kuongeza uzito'],
                correctIndex: 1,
                explanation: 'Uniform clean lots command higher prices because buyers waste less on sorting.',
                explanationSw: 'Kundi lenye ubora sawa na safi hupata bei bora kwa sababu wanunuzi hupoteza kidogo katika kupanga.'
            }
        ]
    },
    {
        title: 'Climate Policy and Farm Support',
        titleSw: 'Sera za Tabianchi na Msaada kwa Wakulima',
        description: 'Four questions on national strategies, county programmes and financing for farmers.',
        descriptionSw: 'Maswali manne kuhusu mikakati ya kitaifa, mipango ya kaunti na mikopo kwa wakulima.',
        category: 'general',
        published: true,
        questions: [
            {
                question: 'Which document guides Kenya\u2019s climate-smart agriculture investment?',
                questionSw: 'Ni hati ipi inayoongoza uwekezaji wa kilimo bora kwa mazingira nchini Kenya?',
                options: ['The Kenya Climate-Smart Agriculture Strategy', 'A land registry', 'A seed catalogue', 'A local market fee list'],
                optionsSw: ['Mkakati wa Kilimo Bora kwa Mazingira wa Kenya', 'Rejesta ya ardhi', 'Katalogi ya mbegu', 'Orodha ya ada za soko'],
                correctIndex: 0,
                explanation: 'The national strategy and climate action plans steer public investment toward resilient farming.',
                explanationSw: 'Mkakati wa kitaifa na mipango ya tabianchi huelekeza uwekezaji wa umma kwenye kilimo endelevu.'
            },
            {
                question: 'What can county agriculture offices offer farmers?',
                questionSw: 'Ofisi za kilimo za kaunti zinaweza kuwapa wakulima nini?',
                options: ['Farmer field schools and input vouchers', 'Only irrigation maps', 'Factory jobs', 'None of these'],
                optionsSw: ['Shule za shambani na vocha za pembejeo', 'Ramani za umwagiliaji tu', 'Kazi za kiwandani', 'Hakuna hata mojawapo'],
                correctIndex: 0,
                explanation: 'Counties run farmer field schools and e-voucher programmes for subsidised seeds and fertiliser.',
                explanationSw: 'Kaunti zinaendesha shule za shambani na mipango ya e-voucher ya mbegu na mbolea kwa bei nafuu.'
            },
            {
                question: 'How does weather-indexed insurance pay farmers?',
                questionSw: 'Bima inayotegemea hali ya hewa hulipa wakulima vipi?',
                options: ['Only after on-site inspections', 'Automatically when rainfall stays outside set thresholds', 'As compensation for any loss', 'It pays teachers instead'],
                optionsSw: ['Baada ya ukaguzi wa shambani tu', 'Moja kwa moja wakati mvua iko nje ya viwango vilivyowekwa', 'Kama fidia ya hasara yoyote', 'Inalipa walimu badala yake'],
                correctIndex: 1,
                explanation: 'Payouts trigger automatically from weather records, so claims are fast and fair.',
                explanationSw: 'Malipo hufuata rekodi za hali ya hewa moja kwa moja, kwa hiyo huduma ni za haraka na za haki.'
            },
            {
                question: 'Which document is usually needed to apply for an agricultural loan?',
                questionSw: 'Ni hati ipi kawaida inahitajika kuomba mkopo wa kilimo?',
                options: ['A land title or an official lease', 'Only a national ID', 'A smartphone number', 'A birth certificate'],
                optionsSw: ['Hati ya ardhi au mkataba rasmi', 'Kadi ya taifa tu', 'Nambari ya simu', 'Cheti cha kuzaliwa'],
                correctIndex: 0,
                explanation: 'Credit institutions commonly require proof of land ownership or an official lease as collateral.',
                explanationSw: 'Taasisi za mikopo kawaida zinahitaji uthibitisho wa umiliki wa ardhi au mkataba rasmi kama dhamana.'
            }
        ]
    },
    {
        title: 'Livestock, Manure and the Circular Farm',
        titleSw: 'Mifugo, Samadi na Shamba la Mzunguko',
        description: 'Five questions on composted manure, biogas and zero-grazing systems that build soil.',
        descriptionSw: 'Maswali matano kuhusu mboji ya samadi, biogas na mifumo ya kufuga bila malisho huru inayojenga udongo.',
        category: 'sustainability',
        published: true,
        questions: [
            {
                question: 'Why is manure composted before applying to crops?',
                questionSw: 'Kwa nini samadi hutengenezwa mboji kabla ya kutumiwa shambani?',
                options: ['Raw manure loses nitrogen and can burn crops', 'It makes the field smell better', 'It is lighter to carry raw', 'Composting kills earthworms'],
                optionsSw: ['Samadi mbichi hupoteza nitrojeni na inaweza kuchoma mazao', 'Inafanya shamba kunukia vizuri', 'Ni rahisi kubeba ikiwa mbichi', 'Mboji huua minyoo'],
                correctIndex: 0,
                explanation: 'Composting stabilises nutrients and feeds soil microbes safely.',
                explanationSw: 'Mboji husaidia virutubisho vitolewe kwa utulivu na kulisha vijidudu vya udongo kwa usalama.'
            },
            {
                question: 'What does a biogas digester produce from cow dung?',
                questionSw: 'Mfumo wa biogas huzalisha nini kutoka kinyesi cha ng\u2019ombe?',
                options: ['Cooking gas and fertiliser slurry', 'Battery acid', 'Animal feed only', 'Toxic waste'],
                optionsSw: ['Gesi ya kupikia na maji ya samadi yenye rutuba', 'Asidi ya betri', 'Chakula cha mifugo pekee', 'Taka zenye sumu'],
                correctIndex: 0,
                explanation: 'Dung produces gas for cooking, and the leftover slurry is an excellent organic fertiliser.',
                explanationSw: 'Kinyesi huzalisha gesi ya kupikia, na maji ya samadi yanayobaki ni mbolea bora ya kikaboni.'
            },
            {
                question: 'Why should manure be stored under cover?',
                questionSw: 'Kwa nini samadi ihifadhiwe mahali pa kufunikwa?',
                options: ['So nutrients are not washed away by rain', 'To keep it warm', 'To make it float', 'To attract soil animals'],
                optionsSw: ['Ili virutubisho visiwekuwa na mvua', 'Ili iwe na joto', 'Ili ielee juu', 'Ili kuvutia wanyama wa udongo'],
                correctIndex: 0,
                explanation: 'Covered storage stops rainwater from washing nutrients away.',
                explanationSw: 'Kuhifadhi mahali pa kufunikwa kunazuia mvua kuvusha virutubisho.'
            },
            {
                question: 'What does zero-grazing mainly involve?',
                questionSw: 'Kufuga bila malisho huru kunahusisha nini hasa?',
                options: ['Letting animals roam everywhere', 'Keeping animals on the plot and feeding them there', 'Selling animals early', 'Grazing on neighbouring land'],
                optionsSw: ['Kuruhusu wanyama wazurura popote', 'Kuwaweka wanyama kwenye shamba na kuwalisha hapo', 'Kuuza wanyama mapema', 'Kulisha kwenye shamba la jirani'],
                correctIndex: 1,
                explanation: 'Zero-grazing reduces overgrazing and lets farmers collect manure for crops.',
                explanationSw: 'Kufuga bila malisho huru hupunguza mmomonyoko wa malisho na kuwapa wakulima nafasi ya kukusanya samadi kwa mazao.'
            },
            {
                question: 'One dairy cow on zero-grazing can provide manure for roughly:',
                questionSw: 'Ng\u2019ombe mmoja wa maziwa katika kufuga bila malisho huru anaweza kutoa samadi ya kutosha kwa:',
                options: ['About an acre of intensively managed crops', 'A whole river valley', 'A greenhouse floor', 'Nothing at all'],
                optionsSw: ['Karibu ekari moja ya mazao yanayosimamiwa kwa nguvu', 'Bonde lote la mto', 'Sakafu ya greenhouse', 'Hakuna kitu kabisa'],
                correctIndex: 0,
                explanation: 'A single dairy cow on zero-grazing yields enough manure for about an acre of crops.',
                explanationSw: 'Ng\u2019ombe mmoja wa maziwa katika mfumo huo hutoa samadi ya kutosha kwa takriban ekari moja ya mazao.'
            }
        ]
    }
];

// ---------------------------------------------------------------------------
// Demo listings for the marketplace (farmers post / traders buy)
// ---------------------------------------------------------------------------
const SEED_PRODUCTS = [
    {
        title: 'Drought-Tolerant Maize Seeds (Katumani)',
        description: 'Certified Katumani maize seeds ideal for low-rainfall regions. High-yield and drought tolerant.',
        category: 'seeds',
        price: 550,
        unit: 'kg',
        location: 'Mombasa, Kenya',
        contactEmail: 'farmer@example.com',
        contactPhone: '+254 700 000 000'
    },
    {
        title: 'Organic Cow Manure (Bag)',
        description: 'Well-decomposed manure ready for planting. Improves soil fertility and water retention.',
        category: 'fertilizer',
        price: 800,
        unit: 'bag',
        location: 'Kilifi, Kenya',
        contactEmail: 'farmer@example.com',
        contactPhone: '+254 700 000 000'
    },
    {
        title: 'Fresh Green Bananas (Dodo)',
        description: 'Farm-fresh green bananas harvested weekly. Wholesale prices for traders.',
        category: 'produce',
        price: 100,
        unit: 'bunch',
        location: 'Voi, Kenya',
        contactEmail: 'farmer@example.com',
        contactPhone: '+254 712 345 678'
    },
    {
        title: 'Panga and Garden Hoe Set',
        description: 'Sturdy locally-made tools for smallholder farmers. Sold as a set of two.',
        category: 'tools',
        price: 450,
        unit: 'set',
        location: 'Mombasa, Kenya',
        contactEmail: 'farmer@example.com',
        contactPhone: '+254 712 345 678'
    },
    {
        title: 'Tropical Fruit Tree Seedlings',
        description: 'Grafted mango, avocado and passion fruit seedlings ready for planting this season.',
        category: 'services',
        price: 300,
        unit: 'piece',
        location: 'Kwale, Kenya',
        contactEmail: 'farmer@example.com',
        contactPhone: '+254 728 456 789'
    }
];

// ---------------------------------------------------------------------------
// Run as a script: npm run seed (only seeds fresh collections)
// ---------------------------------------------------------------------------
if (require.main === module) {
    (async () => {
        try {
            require('dotenv').config();
            const { connectDB, initializeDatabase, closeDatabase } = require('../server/db/database');
            const User = require('../server/models/User');
            const Article = require('../server/models/Article');
            const Quiz = require('../server/models/Quiz');
            const Product = require('../server/models/Product');

            await connectDB();
            await initializeDatabase();
            console.log('\n=== Seeding database ===');

            for (const u of SEED_USERS) {
                const existing = await User.findOne({ email: u.email });
                if (!existing) {
                    if (u.role === 'farmer' && u.email === 'farmer@example.com') {
                        u.membership = {
                            plan: 'grower',
                            status: 'active',
                            expiresAt: new Date(Date.now() + 13 * 30 * 24 * 60 * 60 * 1000)
                        };
                    }
                    await User.create(u);
                    console.log(`[User] Created ${u.name} (${u.role})`);
                }
            }

            const articleCount = await Article.countDocuments();
            if (articleCount === 0) {
                await Article.create(SEED_ARTICLES);
                console.log(`[Article] Created ${SEED_ARTICLES.length} articles`);
            }

            const quizCount = await Quiz.countDocuments();
            if (quizCount === 0) {
                await Quiz.create(SEED_QUIZZES);
                console.log(`[Quiz] Created ${SEED_QUIZZES.length} quizzes`);
            }

            const productCount = await Product.countDocuments();
            if (productCount === 0) {
                await Product.create(SEED_PRODUCTS);
                console.log(`[Product] Created ${SEED_PRODUCTS.length} sample listings`);
            }

            console.log('\n=== Seeding complete ===');
            console.log('Demo accounts:');
            console.log('Admin  - admin@kcnpagro.org / adminpass123');
            console.log('Farmer - farmer@example.com / farmer123');
            console.log('Trader - trader@example.com / trader123');

            await closeDatabase();
            process.exit(0);
        } catch (err) {
            console.error('[Seed] FAILED:', err.message);
            try { await closeDatabase(); } catch (e) {}
            process.exit(1);
        }
    })();
}

module.exports = { SEED_USERS, SEED_ARTICLES, SEED_QUIZZES, SEED_PRODUCTS };
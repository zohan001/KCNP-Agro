/**
 * ============================================
 * Seed Script
 * ============================================
 * Populates the database with starter content:
 * - An admin user and a demo farmer/trader user
 * - Sample knowledge base articles
 * - A self-assessment quiz
 * - A sample marketplace listing
 *
 * Usage: npm run seed
 * ============================================
 */

require('dotenv').config();
const { connectDB, initializeDatabase, closeDatabase } = require('../server/db/database');
const User = require('../server/models/User');
const Article = require('../server/models/Article');
const Quiz = require('../server/models/Quiz');
const Product = require('../server/models/Product');

(async () => {
    try {
        await connectDB();
        await initializeDatabase();
        console.log('\n=== Seeding database ===');

        // 1. Users
        const users = [
            { name: 'KCNP Admin', email: 'admin@kcnpagro.org', password: 'adminpass123', role: 'admin' },
            { name: 'Demo Farmer', email: 'farmer@example.com', password: 'farmer123', role: 'farmer' },
            { name: 'Demo Trader', email: 'trader@example.com', password: 'trader123', role: 'trader' }
        ];
        for (const u of users) {
            const existing = await User.findOne({ email: u.email });
            if (!existing) {
                await User.create(u);
                console.log(`[User] Created ${u.name} (${u.role})`);
            }
        }

        // 2. Articles
        const articleCount = await Article.countDocuments();
        if (articleCount === 0) {
            await Article.create([
                {
                    title: 'Getting Started with Climate-Smart Agriculture',
                    category: 'climate-smart-farming',
                    summary: 'An introduction to the three pillars of climate-smart agriculture: productivity, adaptation, and mitigation, with practical first steps for smallholder farmers.',
                    content: '<p>Climate-Smart Agriculture (CSA) is an approach endorsed by the Food and Agriculture Organization that helps farmers transform their systems under a changing climate. It rests on three interconnected pillars: (1) sustainably increasing productivity and farm incomes, (2) adapting and building resilience to climate shocks such as drought and floods, and (3) reducing greenhouse gas emissions where possible.</p><p>For a smallholder in Kenya, the three pillars translate into practical choices:</p><ul><li>Productivity: use improved, drought-tolerant seed varieties and apply fertiliser at the right rate, time and place.</li><li>Adaptation: diversify crops and livestock, plant early-maturing varieties, and conserve moisture with mulching and zai pits.</li><li>Mitigation: add organic matter to soil to store carbon, practise agroforestry, and avoid burning crop residues.</li></ul><p>Start small. Pick one field, adopt two or three practices for a season, and track yields and costs. Most CSA measures pay for themselves within two seasons and reduce risk in bad years.</p>',
                    tags: ['introduction', 'basics', 'resilience'],
                    published: true
                },
                {
                    title: 'Soil Health: The Foundation of Productive Farms',
                    category: 'soil-health',
                    summary: 'How to build living, water-retentive soil through composting, cover cropping, minimum tillage and regular testing.',
                    content: '<p>Healthy soil is a living ecosystem of bacteria, fungi, earthworms and root networks. Soils high in organic matter hold up to 20 times their weight in water, resist erosion, and release nutrients steadily to crops.</p><p>Five practices rebuild soil health on small farms:</p><ul><li>Compost: turn crop residues and manure into stable organic fertiliser instead of burning them.</li><li>Cover crops and green manures such as lablab, mucuna or dolichos fix nitrogen and protect the surface.</li><li>Minimum tillage: disturb the top few centimetres only, preserving soil structure and moisture.</li><li>Crop rotation: alternate cereals with legumes to break pest cycles and balance nutrients.</li><li>Mulching: keep the soil covered with residue to reduce evaporation and erosion.</li></ul><p>Test your soil every two years through KALRO county offices or certified labs to learn its pH and nutrient levels. In the coastal belt, liming may be needed to correct acidic soils. Healthy soil stores carbon too, which makes it a climate solution as much as a production input.</p>',
                    tags: ['soil', 'compost', 'rotation', 'cover-crops'],
                    published: true
                },
                {
                    title: 'Water Conservation Techniques for Dry Regions',
                    category: 'water-management',
                    summary: 'Rainwater harvesting, drip irrigation, zai pits and mulching techniques that help farmers survive erratic rainfall and drought.',
                    content: '<p>Water is the single biggest constraint along Kenya\u2019s dry land, coastal and ASAL areas. Farmers can stretch every drop by combining the techniques below.</p><ul><li>Rainwater harvesting: collect roof run-off in tanks or earth dams. A 100 m\u00b2 roof can capture about 90,000 litres of water each year in coastal rainfall.</li><li>Contour bunds and swales: dig ridges that follow the land\u2019s contour so run-off slows, spreads and sinks into the soil.</li><li>Zai pits: plant in small basins filled with manure that concentrate water and nutrients at the root zone.</li><li>Drip irrigation: deliver water directly to plant roots through low-cost drip kits. It cuts water use by 40\u201360% compared with surface irrigation.</li><li>Mulching and shading: cover the soil with dry grass or residue to cut evaporation and keep roots cool.</li></ul><p>Time irrigation for early morning or evening to reduce losses, and consider soil-moisture indicators so you only water when the crop actually needs it. Water-stressed crops that then receive rain often recover well when moisture is managed carefully.</p>',
                    tags: ['water', 'drought', 'irrigation', 'hoarding'],
                    published: true
                },
                {
                    title: 'Cropping Strategies for a Changing Climate',
                    category: 'crop-diversification',
                    summary: 'How intercropping, early-maturing varieties and diversified field planning reduce risk and stabilise incomes.',
                    content: '<p>Relying on a single crop leaves a household vulnerable to one bad season. Diversification spreads the risk of price collapse, disease outbreaks and erratic rainfall.</p><p>Three strategies work well for Kenyan smallholders:</p><ul><li>Intercrop cereals with legumes: maize with beans or cowpeas boosts total yield per hectare, adds nitrogen to the soil, and provides a protein source for the household.</li><li>Plant early-maturing and drought-tolerant varieties: certified Katumani and KDV maize, cassava, sweet potato and sorghum perform better when rains are short.</li><li>Plan a staggered crop calendar: split a plot into blocks planted at two-week intervals so a dry spell never wipes out the whole field.</li></ul><p>Keep a written farm journal noting planting dates, rainfall, and harvest weights each season. The journal becomes your best planning tool, showing which varieties and rotations earn the most for your land.</p>',
                    tags: ['crop-diversification', 'intercropping', 'maize', 'sorghum'],
                    published: true
                },
                {
                    title: 'Carbon Credits: Turning Soil into Income',
                    category: 'carbon-credits',
                    summary: 'How regenerative practices such as agroforestry and conservation agriculture can earn farmers verified carbon income.',
                    content: '<p>Carbon credit programmes pay farmers for practices that remove or avoid carbon dioxide emissions. Regenerative agriculture \u2014 agroforestry, conservation tillage, cover cropping and improved manure management \u2014 can all qualify.</p><p>The typical journey:</p><ul><li>Project registration: a programme developer registers the farm or farmer group with a standard such as Verra or Gold Standard.</li><li>Baseline and plan: a baseline of current emissions is measured and a practice plan agreed.</li><li>Implementation and monitoring: the farmer adopts the practices and keeps seasonal records, often using a mobile app.</li><li>Verification and sale: an independent auditor verifies the sequestered carbon, which is then sold as offsets.</li></ul><p>While verification needs careful record-keeping, the extra income stream is attractive: maize producers practising agroforestry in Mt. Kenya and Rift Valley projects have earned meaningful top-ups on top of crop sales. Ask your county agricultural officer about registered carbon projects near you.</p>',
                    tags: ['carbon', 'income', 'agroforestry', 'verification'],
                    published: true
                },
                {
                    title: 'From Farm to Market: Post-Harvest Success',
                    category: 'market-access',
                    summary: 'Grading, storage, aggregation and digital platforms that help farmers earn more and waste less after harvest.',
                    content: '<p>Smallholders often lose 20\u201340% of harvest value to poor handling, storage and informal sales. Better post-harvest management turns more of the crop into cash.</p><p>Steps that raise farm-gate value:</p><ul><li>Grade and sort: separate produce by size and quality. Buyers pay a premium for uniform, clean lots.</li><li>Dry and store properly: use hermetic bags (e.g. Purdue Improved Crop Storage) to stop weevils and aflatoxin in maize and beans.</li><li>Aggregate with neighbours: sell as a group to reach larger buyers such as millers, hotels and exporters, negotiating better prices than alone.</li><li>Use digital channels: list surplus produce on marketplaces like this platform so traders can find you directly, skipping exploitative middlemen.</li><li>Watch timing: understand seasonal price patterns and, where possible, store to sell a few weeks after peak harvest when prices rise.</li></ul><p>Keep simple records of what you sell and at what price. This data reveals your most profitable crops and customers.</p>',
                    tags: ['market', 'post-harvest', 'grading', 'storage'],
                    published: true
                },
                {
                    title: 'Climate Policy and Support for Kenyan Farmers',
                    category: 'policy',
                    summary: 'National strategies, county programmes and financing available to Kenyan farmers adopting climate-smart practices.',
                    content: '<p>Kenya has a supportive policy environment for climate-smart agriculture. The National Climate Change Action Plan and the Kenya Climate-Smart Agriculture Strategy orient public investment toward resilient farming, while the Climate Change Act provides a legal framework for adaptation and emission reduction.</p><p>At county level, agriculture departments run farmer field schools, distribute vouchers for improved seed and fertiliser, and pilot weather-indexed insurance. Under the e-voucher system, eligible smallholders buy subsidised seed and fertiliser through mobile payment schemes. The Agricultural Finance Corporation, commercial banks and SACCOs offer loans for irrigation equipment, greenhouses and dairy with climate-mitigation goals.</p><p>Your new KCNP education hub summarises these and links you to apply. Practically: register with your county\u2019s agriculture office, join a registered farmer group to access group credit and insurance, and keep your land title or an official lease document, which is often needed for credit applications.</p>',
                    tags: ['policy', 'financing', 'county', 'insurance'],
                    published: true
                },
                {
                    title: 'Manure, Livestock and the Circular Farm',
                    category: 'general',
                    summary: 'Integrating livestock and crops so that manure builds soil, feeds biogas and turns farm waste into assets.',
                    content: '<p>A mixed farm is a circular farm: what one enterprise wastes, another uses. Livestock convert forage into manure, and well-managed manure becomes the engine of soil fertility.</p><p>Best practice in manure management:</p><ul><li>Compost manure before applying: raw manure loses nitrogen and can burn crops; composted manure feeds soil microbes safely.</li><li>Store under cover: pile manure on a hard surface with a roof or sheet so nutrients and soil are not washed away by rain.</li><li>Time application: spread before planting and top-dress at the crop\u2019s peak growth stage, matching supply to crop demand.</li><li>Feed a biogas digester: cow dung runs a simple digester that produces cooking gas, reduces wood fuel demand and cuts deforestation; the slurry is an excellent organic fertiliser.</li></ul><p>Zero-grazing systems on small plots also reduce overgrazing, capture emissions, and keep animals healthy and productive. A single dairy cow on zero-grazing provides manure for roughly an acre of intensively managed crops.</p>',
                    tags: ['livestock', 'manure', 'biogas', 'circular'],
                    published: true
                }
            ]);
            console.log('[Article] Created 8 articles');
        }

        // 3. Quizzes
        const quizCount = await Quiz.countDocuments();
        if (quizCount === 0) {
            await Quiz.create([
                {
                    title: 'Climate Smart Basics',
                    description: 'Test your understanding of climate-smart agriculture fundamentals and the three pillars.',
                    category: 'climate-basics',
                    published: true,
                    questions: [
                        {
                            question: 'What are the three pillars of Climate-Smart Agriculture?',
                            options: [
                                'Profit, speed and scale',
                                'Productivity, adaptation and mitigation',
                                'Irrigation, chemicals and mechanisation',
                                'Seeds, fertiliser and credit'
                            ],
                            correctIndex: 1,
                            explanation: 'CSA sustainably increases productivity, adapts to climate change, and mitigates greenhouse gas emissions.'
                        },
                        {
                            question: 'Which practice most directly improves soil health?',
                            options: ['Burning crop residue', 'Continuous monoculture of maize', 'Composting and crop rotation', 'Increasing pesticide use only'],
                            correctIndex: 2,
                            explanation: 'Composting and rotation add organic matter and break pest and disease cycles.'
                        },
                        {
                            question: 'Which irrigation method is most water-efficient for small plots?',
                            options: ['Flood irrigation', 'Drip irrigation', 'Sprinklers run at midday', 'Relying on rain only'],
                            correctIndex: 1,
                            explanation: 'Drip irrigation delivers water directly to the roots and can cut water use by 40-60%.'
                        },
                        {
                            question: 'What is a key benefit of agroforestry for carbon credits?',
                            options: [
                                'It increases soil erosion',
                                'It captures carbon and diversifies farmer income',
                                'It requires more synthetic fertiliser',
                                'It reduces biodiversity'
                            ],
                            correctIndex: 1,
                            explanation: 'Trees capture carbon in wood and soil while providing fruit, timber and shade income.'
                        },
                        {
                            question: 'Why should farmers keep a written farm journal?',
                            options: [
                                'It makes plots look neat',
                                'It is required by law',
                                'It records planting, rainfall and harvests to guide future planning',
                                'It replaces the need to test soil'
                            ],
                            correctIndex: 2,
                            explanation: 'Seasonal records reveal which varieties and rotations earn the most on your land.'
                        }
                    ]
                },
                {
                    title: 'Soil and Water Stewardship',
                    description: 'Five questions on building healthy soil and conserving water through practical techniques.',
                    category: 'soil-management',
                    published: true,
                    questions: [
                        {
                            question: 'Which soil-management practice stores the most carbon in the long term?',
                            options: [
                                'Deep ploughing every season',
                                'Adding organic matter through compost and cover crops',
                                'Burning residues to clear the field',
                                'Applying only inorganic fertiliser'
                            ],
                            correctIndex: 1,
                            explanation: 'Organic matter builds stable soil carbon, improving water retention and fertility simultaneously.'
                        },
                        {
                            question: 'What are zai pits used for?',
                            options: [
                                'Storing harvested grain',
                                'Concentrating water and nutrients at the root zone of plants',
                                'Raising fish',
                                'Channeling irrigation pipes'
                            ],
                            correctIndex: 1,
                            explanation: 'Zai pits are planting basins filled with organic matter that catch and hold water during rainfall.'
                        },
                        {
                            question: 'How much can drip irrigation reduce water use compared with surface irrigation?',
                            options: ['About 5-10%', '20-30%', '40-60%', 'Nothing; it uses more water'],
                            correctIndex: 2,
                            explanation: 'Directly wetting the root zone cuts evaporation and run-off losses dramatically.'
                        },
                        {
                            question: 'What is the best time of day to irrigate to minimise loss?',
                            options: ['Noon', 'Mid-afternoon', 'Early morning or evening', 'Anytime, it makes no difference'],
                            correctIndex: 2,
                            explanation: 'Cooler times reduce evaporation before water reaches the roots.'
                        },
                        {
                            question: 'Why should soil pH be tested periodically?',
                            options: [
                                'Because pH never changes',
                                'To learn nutrient availability and decide whether liming is needed',
                                'To prove ownership of the land',
                                'To measure rainfall'
                            ],
                            correctIndex: 1,
                            explanation: 'Extremes of pH lock up nutrients; testing tells you what to amend, such as lime on acidic coastal soils.'
                        }
                    ]
                },
                {
                    title: 'Carbon, Markets and Farm Profit',
                    description: 'Four questions on carbon income, post-harvest handling and getting better prices.',
                    category: 'carbon-footprint',
                    published: true,
                    questions: [
                        {
                            question: 'Which bodies set the standards for verifying carbon credits?',
                            options: [
                                'KRA and county governments',
                                'Verra, Gold Standard and similar standards bodies',
                                'Seed companies',
                                'Local SACCOs'
                            ],
                            correctIndex: 1,
                            explanation: 'Independent standards such as Verra and Gold Standard certify that credits are real and verified.'
                        },
                        {
                            question: 'What is the best way to reduce maize losses after harvest?',
                            options: [
                                'Stack sacks in the field',
                                'Dry fully and store in hermetic bags',
                                'Keep grain in open woven bags',
                                'Store while still wet and green'
                            ],
                            correctIndex: 1,
                            explanation: 'Hermetic bags cut oxygen so weevils die and aflatoxin cannot grow, preserving quality for better prices.'
                        },
                        {
                            question: 'Why does selling as a farmer group usually earn higher prices?',
                            options: [
                                'Groups always get subsidies',
                                'Larger, uniform volumes attract bigger buyers and stronger negotiation',
                                'Groups pay lower taxes',
                                'There is no difference'
                            ],
                            correctIndex: 1,
                            explanation: 'Aggregation gives buyers the consistent volume and quality they need, so they pay premium prices.'
                        },
                        {
                            question: 'What is a practical way to raise farm-gate value before sale?',
                            options: [
                                'Mix all sizes together in one sack',
                                'Grade and sort produce into uniform, clean lots',
                                'Sell immediately at any price',
                                'Add stones to increase weight'
                            ],
                            correctIndex: 1,
                            explanation: 'Uniform, clean lots command higher prices because buyers spend less on sorting and waste.'
                        }
                    ]
                }
            ]);
            console.log('[Quiz] Created 3 quizzes');
        }

        // 4. Sample product listing
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            await Product.create({
                title: 'Drought-Tolerant Maize Seeds (Katumani)',
                description: 'Quality certified Katumani maize seeds ideal for low-rainfall regions. High-yield and drought tolerant.',
                category: 'seeds',
                price: 12,
                unit: 'kg',
                location: 'Mombasa, Kenya',
                contactEmail: 'farmer@example.com',
                contactPhone: '+254 700 000 000'
            });
            console.log('[Product] Created sample listing');
        }

        console.log('\n=== Seeding complete ===\n');
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
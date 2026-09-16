/**
 * Idempotent prod seed script for KCNP Agro.
 *
 * Usage:
 *   node scripts/seed-demo.js --dry-run   # print what would be created
 *   node scripts/seed-demo.js --apply     # create / update the prod DB
 *   node scripts/seed-demo.js --clean     # remove all seeded demo data
 *
 * Run with the prod MONGO_URI exported (sourced from render-env-vars.txt).
 * Never prints the connection string.
 */

const mongoose = require('mongoose');

const MODE = process.argv.includes('--clean')
    ? 'clean'
    : process.argv.includes('--apply')
        ? 'apply'
        : 'dry-run';

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set. Source render-env-vars.txt first.');
    process.exit(1);
}

const User = require('../server/models/User');
const Product = require('../server/models/Product');
const Subscription = require('../server/models/Subscription');
const Testimonial = require('../server/models/Testimonial');
const Article = require('../server/models/Article');
const Quiz = require('../server/models/Quiz');

const DEMO_PASSWORD = 'seed2024!';

const FARMER_NAMES = [
    { first: 'Mwanahamisi', last: 'Charo' },
    { first: 'Kazungu', last: 'Mwero' },
    { first: 'Charo', last: 'Katana' },
    { first: 'Mwero', last: 'Dzombo' },
    { first: 'Rehema', last: 'Kadzo' },
    { first: 'Hamisi', last: 'Fundi' },
    { first: 'Maimuna', last: 'Mwakio' },
    { first: 'Zawadi', last: 'Ngala' },
    { first: 'Juma', last: 'Ali' },
    { first: 'Amina', last: 'Safari' },
    { first: 'Mbaraka', last: 'Fumo' },
    { first: 'Chizi', last: 'Kazungu' },
    { first: 'Festo', last: 'Mwijo' },
    { first: 'Kadzo', last: 'Mwanjuma' },
    { first: 'Mwinyi', last: 'Shee' },
    { first: 'Hassan', last: 'Bwana' },
    { first: 'Fatma', last: 'Abdalla' },
    { first: 'Omar', last: 'Kidigo' },
    { first: 'Saida', last: 'Chiragu' },
    { first: 'Rashid', last: 'Mwacharo' },
    { first: 'Mariam', last: 'Baya' },
    { first: 'Ibrahim', last: 'Mwakumba' },
    { first: 'Nuru', last: 'Juma' },
    { first: 'Khamis', last: 'Mwagandi' },
    { first: 'Asha', last: 'Bunduki' },
    { first: 'Tsuma', last: 'Mwanyekwa' },
];

const TRADER_NAMES = [
    { first: 'Abubakar', last: 'Shariff' },
    { first: 'Said', last: 'Mwangi' },
    { first: 'Hassan', last: 'Ali' },
    { first: 'Mohamed', last: 'Ismail' },
    { first: 'Amina', last: 'Bakari' },
    { first: 'Salim', last: 'Rajab' },
    { first: 'Zainab', last: 'Abdalla' },
    { first: 'Hamad', last: 'Mwinyi' },
    { first: 'Fatma', last: 'Omar' },
];

const LOCATIONS = [
    'Mombasa', 'Kilifi', 'Kwale', 'Malindi', 'Voi', 'Lamu',
    'Tana River', 'Ukunda', 'Mariakani', 'Mtwapa', 'Kaloleni',
    'Rabai', 'Shimoni', 'Takaungu', 'Lunga Lunga', 'Msambweni',
    'Watamu', 'Gede', 'Witu', 'Ngurukanidhi',
];

const LISTINGS = [
    { title: 'Fresh Sukuma Wiki', category: 'produce', price: 30, unit: 'bunch', desc: 'Fresh leafy kale harvested this morning from my shamba. Ideal for hotels and restaurants across the coast.' },
    { title: 'Ripe Apple Mangoes', category: 'produce', price: 40, unit: 'kg', desc: 'Sweet, ripe Kilifi apple mangoes ready for bulk purchase. Seasonal supply available from December to March.' },
    { title: 'Green Grams (Ndengu)', category: 'produce', price: 180, unit: 'kg', desc: 'High-quality dried green grams sourced directly from Taita Taveta. Clean, sorted, and ready for market.' },
    { title: 'Dried Maize Grade 2', category: 'produce', price: 90, unit: 'kg', desc: 'Sun-dried maize suitable for milling. Bulk orders welcome from millers and traders.' },
    { title: 'Cowpeas (Kunde)', category: 'produce', price: 150, unit: 'kg', desc: 'Fresh and dried cowpeas available. High demand crop ideal for both local and upcountry traders.' },
    { title: 'Fresh Coconut (Madafu)', category: 'produce', price: 50, unit: 'piece', desc: 'Young coconuts for drinking, harvested from mature palms along the Kwale coast.' },
    { title: 'Roma Tomatoes', category: 'produce', price: 60, unit: 'kg', desc: 'Fresh Roma tomatoes perfect for salads, cooking, and juice. Sold in 50kg bags or smaller quantities.' },
    { title: 'Kisukari Bananas', category: 'produce', price: 45, unit: 'kg', desc: 'Sweet Kisukari variety bananas, hand-picked and packed. Available year-round from Kilifi farms.' },
    { title: 'Passion Fruit (Maracujá)', category: 'produce', price: 120, unit: 'kg', desc: 'Juicy purple passion fruits from highland farms, delivered fresh to Mombasa markets.' },
    { title: 'Watermelons', category: 'produce', price: 150, unit: 'piece', desc: 'Large, sweet watermelons ideal for wholesale. Minimum order 10 pieces. Delivery available.' },
    { title: 'Fresh Cassava (Mbichi)', category: 'produce', price: 25, unit: 'kg', desc: 'Freshly harvested cassava roots. Sweet variety, perfect for boiling, frying, or industrial processing.' },
    { title: 'Sweet Potatoes', category: 'produce', price: 45, unit: 'kg', desc: 'Orange-fleshed and white sweet potatoes from Kwale farms. Rich in vitamins and fibre.' },
    { title: 'Hass Avocados', category: 'produce', price: 90, unit: 'kg', desc: 'Premium Hass avocados for domestic and export markets. Consistent quality and size.' },
    { title: 'Raw Honey (1kg)', category: 'produce', price: 600, unit: 'jar', desc: 'Unfiltered, raw honey harvested from traditional log hives in Taita Taveta forests.' },
    { title: 'Fresh Milk', category: 'produce', price: 70, unit: 'litre', desc: 'Pasteurised fresh milk from my dairy herd. Hygienic packaging, daily supply possible.' },
    { title: 'Dried Cassava (Makopa)', category: 'produce', price: 120, unit: 'kg', desc: 'Sun-dried cassava chips ready for grinding. Long shelf life, suitable for animal feed or human consumption.' },
    { title: 'Habanero Chillies', category: 'produce', price: 400, unit: 'kg', desc: 'Fiery habanero chillies for restaurants, hotels, and chilli sauce manufacturers. Carefully packed.' },
    { title: 'Limes', category: 'produce', price: 60, unit: 'kg', desc: 'Fresh limes for cooking, drinks, and juice bars. Bright green and full of flavour.' },
    { title: 'Boran Goats (Fattened)', category: 'livestock', price: 8500, unit: 'head', desc: 'Well-fattened Boran goats, 6-8 months old. Ready for the raskia market or direct sale.' },
    { title: 'Improved Kienyeji Chickens', category: 'livestock', price: 450, unit: 'bird', desc: 'Free-range improved Kienyeji chickens, 4-5 months old. Good layers and excellent for meat.' },
    { title: 'Dairy Cow – Upgraded Boran', category: 'livestock', price: 48000, unit: 'head', desc: 'Upgraded Boran dairy cow yielding 15-20 litres per day. In-calf and fully vaccinated.' },
    { title: 'Hybrid Maize Seed (DH04)', category: 'seeds', price: 420, unit: '2kg pack', desc: 'Certified DH04 hybrid maize seed, drought tolerant and high yielding. Ideal for coastal lowlands.' },
    { title: 'Cowpea Seed (K80)', category: 'seeds', price: 280, unit: 'kg', desc: 'Certified K80 cowpea seed. Early maturing and disease resistant. Perfect for short rains.' },
    { title: 'Drought-Tolerant Sorghum Seed', category: 'seeds', price: 260, unit: 'kg', desc: 'Climate-resilient sorghum varieties selected for arid and semi-arid areas of the coast.' },
    { title: 'Onion Seedlings (Trays)', category: 'seeds', price: 350, unit: 'tray', desc: 'Nursery-raised red onion seedlings, 3-4 weeks old. Transplant-ready for immediate field planting.' },
    { title: 'Tomato Seed (Roma VF)', category: 'seeds', price: 650, unit: '10g pack', desc: 'Certified Roma VF tomato seeds, disease resistant and high yielding. Ideal for greenhouse or open field.' },
    { title: 'Compost Manure (50kg bag)', category: 'fertilizer', price: 250, unit: 'bag', desc: 'Well-composted organic manure from verified sources. Improves soil structure and moisture retention.' },
    { title: 'KALRO-Recommended NPK', category: 'fertilizer', price: 180, unit: '5kg bag', desc: 'Blended fertiliser recommended by KALRO for coastal soils. Cost-effective and nutrient-balanced.' },
    { title: 'Drip Irrigation Kit (1/4 acre)', category: 'equipment', price: 6800, unit: 'kit', desc: 'Complete drip irrigation system for 1/4 acre. Saves up to 60% water compared to flood irrigation.' },
    { title: 'Solar-Powered Water Pump', category: 'equipment', price: 24000, unit: 'unit', desc: 'Solar submersible pump for boreholes and shallow wells. No electricity bills, low maintenance.' },
    { title: 'Hand Hoe (Jembe)', category: 'tools', price: 350, unit: 'piece', desc: 'Heavy-duty forged steel jembe. Built to last through multiple seasons of hard farming.' },
    { title: 'Powered Knapsack Sprayer', category: 'tools', price: 3500, unit: 'unit', desc: 'Battery-powered 16L knapsack sprayer. Consistent pressure, ideal for pesticides and foliar feeds.' },
    { title: 'Tractor Hire Service', category: 'services', price: 2500, unit: 'per acre', desc: 'Professional ploughing, harrowing, and ridging services using a 50HP tractor. Mombasa and Kilifi counties.' },
    { title: 'Crop Spraying Service', category: 'services', price: 700, unit: 'per acre', desc: 'Licensed crop spraying service with certified pesticides. Ground and aerial options available.' },
];

const TESTIMONIALS = [
    { userRef: 'farmer0', name: 'Mwanahamisi Charo', role: 'farmer', message: 'KCNP Agro helped me find a trader for my mangoes within two days. I used to sell at the local market for less, now my whole harvest is pre-booked before the season even starts.', rating: 5, featured: true },
    { userRef: 'farmer1', name: 'Kazungu Mwero', role: 'farmer', message: 'The education articles on soil health changed how I farm. My maize survived this dry season while neighbours lost half their crop. I tell every farmer in my village to join.', rating: 5, featured: true },
    { userRef: 'trader0', name: 'Abubakar Shariff', role: 'trader', message: 'I source produce through the marketplace without travelling to the farms. The listings are always fresh and the farmers are reliable. My restaurant supply chain has never been this smooth.', rating: 5, featured: true },
    { userRef: 'farmer4', name: 'Rehema Kadzo', role: 'farmer', message: 'Affordable subscription and the platform paid for itself after my first sale. The admin responds fast when you need help. I upgraded to the 6-month grower plan happily.', rating: 4, featured: false },
    { userRef: 'trader1', name: 'Said Mwangi', role: 'trader', message: 'As a trader in Mombasa, this is the easiest way to find quality green grams and cowpeas from farmers upcountry. Prices are fair and transparent.', rating: 4, featured: false },
    { userRef: 'farmer9', name: 'Amina Safari', role: 'farmer', message: 'I love the Swahili version of the lessons. I can listen to the quizzes and learn in my own language. The platform was made for people like me.', rating: 5, featured: false },
];

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function main() {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected (mode: ${MODE})`);

    if (MODE === 'clean') {
        const seededEmails = [
            ...FARMER_NAMES.map(n => `${n.first.toLowerCase()}.${n.last.toLowerCase()}@kcnpagro.co.ke`),
            ...TRADER_NAMES.map(n => `${n.first.toLowerCase()}.${n.last.toLowerCase()}@kcnpagro.co.ke`),
        ];
        const users = await User.find({ email: { $in: seededEmails } }).select('_id');
        const ids = users.map(u => u._id);
        const prodDel = await Product.deleteMany({ seller: { $in: ids } });
        const subDel = await Subscription.deleteMany({ user: { $in: ids } });
        const testDel = await Testimonial.deleteMany({ user: { $in: ids } });
        const userDel = await User.deleteMany({ _id: { $in: ids } });
        console.log(`Cleaned: ${userDel.deletedCount} users, ${prodDel.deletedCount} listings, ${subDel.deletedCount} subs, ${testDel.deletedCount} testimonials`);
        await conn.disconnect();
        return;
    }

    // --- Users ---
    const allNames = [
        ...FARMER_NAMES.map((n, i) => ({ ...n, role: 'farmer', idx: i })),
        ...TRADER_NAMES.map((n, i) => ({ ...n, role: 'trader', idx: i })),
    ];

    const existingUsers = await User.find({
        email: { $in: allNames.map(n => `${n.first.toLowerCase()}.${n.last.toLowerCase()}@kcnpagro.co.ke`) }
    }).select('email _id');
    const existingMap = new Map(existingUsers.map(u => [u.email, u._id]));

    const createdFarmers = [];
    const createdTraders = [];

    for (const n of allNames) {
        const email = `${n.first.toLowerCase()}.${n.last.toLowerCase()}@kcnpagro.co.ke`;
        if (existingMap.has(email)) {
            const u = { _id: existingMap.get(email), email, ...n };
            (n.role === 'farmer' ? createdFarmers : createdTraders).push(u);
            continue;
        }
        if (MODE === 'dry-run') {
            console.log(`  [user] Would create: ${n.first} ${n.last} (${n.role})`);
            const u = { _id: null, email, ...n };
            (n.role === 'farmer' ? createdFarmers : createdTraders).push(u);
            continue;
        }
        const user = await User.create({
            name: `${n.first} ${n.last}`,
            email,
            password: DEMO_PASSWORD,
            role: n.role,
            isActive: true,
        });
        const u = { _id: user._id, email, ...n };
        (n.role === 'farmer' ? createdFarmers : createdTraders).push(u);
        console.log(`  [user] Created: ${n.first} ${n.last} (${n.role})`);
    }

    // --- Listings ---
    const farmerIds = createdFarmers.map(f => f._id);
    if (MODE === 'apply') {
        await Product.deleteMany({ seller: { $in: farmerIds } });
    }
    const productDocs = [];
    for (let i = 0; i < LISTINGS.length; i++) {
        const l = LISTINGS[i];
        const f = createdFarmers[i % createdFarmers.length];
        const loc = LOCATIONS[i % LOCATIONS.length];
        const createdAt = daysAgo(90 - i * 2);
        productDocs.push({
            title: l.title,
            description: l.desc,
            category: l.category,
            price: l.price,
            unit: l.unit,
            location: loc,
            contactEmail: f.email,
            contactPhone: `07${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
            seller: f._id,
            active: true,
            createdAt,
            updatedAt: createdAt,
        });
    }

    if (MODE === 'dry-run') {
        console.log(`  [listings] Would create: ${productDocs.length} across ${createdFarmers.length} farmers`);
    } else if (MODE === 'apply' && productDocs.length > 0) {
        await Product.insertMany(productDocs);
        console.log(`  [listings] Created: ${productDocs.length}`);
    }

    // --- Subscriptions ---
    const plans = ['grower', 'starter', 'pro'];
    const planMonths = { grower: 6, starter: 1, pro: 12 };
    const planAmounts = { grower: 3000, starter: 800, pro: 5000 };
    const subFarmerIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const subDocs = [];
    const membershipUpdates = [];

    for (const idx of subFarmerIndices) {
        const f = createdFarmers[idx];
        if (!f) continue;
        const plan = plans[idx % plans.length];
        const months = planMonths[plan];
        const paidAt = daysAgo(120 - idx * 8);
        const expiresAt = new Date(paidAt.getTime() + months * 30 * 24 * 3600 * 1000);
        subDocs.push({
            user: f._id,
            plan,
            amount: planAmounts[plan],
            periodMonths: months,
            mpesaPhone: `07${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
            status: 'active',
            paidAt,
            expiresAt,
            createdAt: paidAt,
            updatedAt: paidAt,
        });
        membershipUpdates.push({
            userId: f._id,
            membership: { plan, status: 'active', expiresAt },
        });
    }

    if (MODE === 'apply' && subDocs.length > 0) {
        await Subscription.deleteMany({ user: { $in: farmerIds } });
        await Subscription.insertMany(subDocs);
        for (const m of membershipUpdates) {
            await User.findByIdAndUpdate(m.userId, { membership: m.membership });
        }
        console.log(`  [subs] Created: ${subDocs.length} active subscriptions`);
    } else if (MODE === 'dry-run') {
        console.log(`  [subs] Would create: ${subDocs.length} active subscriptions`);
    }

    // --- Testimonials ---
    const userMap = {};
    for (const f of createdFarmers) userMap[`farmer${f.idx || createdFarmers.indexOf(f)}`] = f;
    for (const t of createdTraders) userMap[`trader${t.idx || createdTraders.indexOf(t)}`] = t;

    if (MODE === 'apply') {
        const userIds = [...createdFarmers, ...createdTraders].map(u => u._id);
        await Testimonial.deleteMany({ user: { $in: userIds } });
    }

    const testimonialDocs = [];
    for (const t of TESTIMONIALS) {
        const u = userMap[t.userRef];
        if (!u) continue;
        const createdAt = daysAgo(Math.floor(Math.random() * 60));
        testimonialDocs.push({
            user: u._id,
            name: t.name,
            role: t.role,
            message: t.message,
            rating: t.rating,
            status: 'approved',
            featured: t.featured,
            createdAt,
            updatedAt: createdAt,
        });
    }

    if (MODE === 'dry-run') {
        console.log(`  [testimonials] Would create: ${testimonialDocs.length}`);
    } else if (MODE === 'apply' && testimonialDocs.length > 0) {
        await Testimonial.insertMany(testimonialDocs);
        console.log(`  [testimonials] Created: ${testimonialDocs.length}`);
    }

    // --- Summary ---
    const [farmers, traders, listings, articles, quizzes] = await Promise.all([
        User.countDocuments({ role: 'farmer', isActive: true }),
        User.countDocuments({ role: 'trader', isActive: true }),
        Product.countDocuments({ active: true }),
        Article.countDocuments({ published: true }),
        Quiz.countDocuments({ published: true }),
    ]);
    const activeSubs = await Subscription.countDocuments({ status: 'active' });
    const approvedTests = await Testimonial.countDocuments({ status: 'approved' });
    const featuredTests = await Testimonial.countDocuments({ status: 'approved', featured: true });

    console.log('\n--- Summary ---');
    console.log(`Farmers:      ${farmers}`);
    console.log(`Traders:      ${traders}`);
    console.log(`Listings:     ${listings}`);
    console.log(`Articles:     ${articles}`);
    console.log(`Quizzes:      ${quizzes}`);
    console.log(`Active Subs:  ${activeSubs}`);
    console.log(`Testimonials: ${approvedTests} (featured: ${featuredTests})`);
    console.log('---------------\n');

    if (MODE === 'apply') {
        console.log('Seed complete. Deploy to Render (git push origin main) and verify at:');
        console.log('  GET /api/stats');
        console.log('  GET /api/testimonials');
    }

    await conn.disconnect();
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});

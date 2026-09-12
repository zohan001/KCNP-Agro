/**
 * ============================================
 * API Integration Test Script
 * ============================================
 * Starts the server, runs endpoint tests against
 * MongoDB, and exits. Self-contained so it can
 * run in a CI/terminal without lingering processes.
 *
 * Usage: node scripts/test-api.js
 * ============================================
 */

require('dotenv').config();
const createApp = require('../server/app');

const request = (path, options = {}) => {
    const http = require('http');
    const data = options.body ? JSON.stringify(options.body) : null;
    const headers = data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {};
    if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: '127.0.0.1',
            port: 3210,
            path,
            method: options.method || 'GET',
            headers
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                let parsed = body;
                try { parsed = JSON.parse(body); } catch (e) {}
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
};

(async () => {
    const { connectDB, initializeDatabase, closeDatabase } = require('../server/db/database');

    console.log('=== Verdant Agro API Integration Tests ===\n');

    try {
        await connectDB();
        await initializeDatabase();

        // Create the Express app from the factory
        const app = createApp();

        // Start server on test port
        const server = app.listen(3210, () => {
            console.log('[Test] Server started on port 3210');
        });

        await new Promise(r => server.on('listening', r));

        // 1. Health check
        let res = await request('/api/health');
        console.log(`[1] Health ${res.status}: ${JSON.stringify(res.body.status)}`);
        console.assert(res.status === 200, 'Health should be 200');

        // 2. Valid contact submission
        res = await request('/api/contact', {
            method: 'POST',
            body: { name: 'John Doe', email: 'john@test.com', organization: 'Green Farms', subject: 'partnership', message: 'I want to partner on climate smart agriculture.' }
        });
        console.log(`[2] Contact (valid) ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Contact should be 201');
        console.assert(res.body.success === true, 'Contact success flag');

        // 3. Invalid contact (bad email)
        res = await request('/api/contact', {
            method: 'POST',
            body: { name: 'Jane', email: 'bad-email', message: 'This message is definitely long enough.' }
        });
        console.log(`[3] Contact (invalid email) ${res.status}: expect validation failure`);
        console.assert(res.status === 400, 'Invalid contact should be 400');

        // 4. Newsletter subscribe
        const subEmail = `sub_${Date.now()}@test.com`;
        res = await request('/api/newsletter', {
            method: 'POST',
            body: { email: subEmail }
        });
        console.log(`[4] Newsletter (new) ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Newsletter subscribe should be 201');

        // 5. Newsletter duplicate
        res = await request('/api/newsletter', {
            method: 'POST',
            body: { email: subEmail }
        });
        console.log(`[5] Newsletter (duplicate) ${res.status}: ${res.body.message}`);
        console.assert(res.status === 200, 'Duplicate should be 200');

        // 6. Get contacts (admin)
        res = await request('/api/contact');
        console.log(`[6] Get contacts ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get contacts should be 200');
        console.assert(res.body.count >= 1, 'Should have at least 1 contact');

        // 7. Get subscribers (admin)
        res = await request('/api/newsletter');
        console.log(`[7] Get subscribers ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get subscribers should be 200');

        // 8. 404
        res = await request('/api/nonexistent');
        console.log(`[8] 404 ${res.status}: ${res.body.message}`);
        console.assert(res.status === 404, 'Unknown route should be 404');

        // 9. Static frontend serving
        res = await request('/');
        console.log(`[9] Static index ${res.status}: content-type=${res.body.contentType || 'n/a'}`);
        console.assert(res.status === 200, 'Static index should be 200');

        // 10. Register a user
        const email = `user_${Date.now()}@test.com`;
        res = await request('/api/auth/register', {
            method: 'POST',
            body: { name: 'Test User', email, password: 'secret123', role: 'trader' }
        });
        console.log(`[10] Register ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Register should be 201');
        console.assert(res.body.data && res.body.data.token, 'Register should return a token');
        console.assert(res.body.data.user.role === 'trader', 'Role should be saved');
        const userToken = res.body.data.token;
        const userId = res.body.data.user._id;

        // 11. Register duplicate
        res = await request('/api/auth/register', {
            method: 'POST',
            body: { name: 'Test User', email, password: 'secret123' }
        });
        console.log(`[11] Register duplicate ${res.status}: expect 400`);
        console.assert(res.status === 400, 'Duplicate register should be 400');

        // 11b. Register with invalid role
        res = await request('/api/auth/register', {
            method: 'POST',
            body: { name: 'Bad Role', email: `bad_${Date.now()}@test.com`, password: 'secret123', role: 'admin' }
        });
        console.log(`[11b] Register invalid role ${res.status}: expect 400`);
        console.assert(res.status === 400, 'Register with admin role should be 400');

        // 12. Login valid
        res = await request('/api/auth/login', {
            method: 'POST',
            body: { email, password: 'secret123' }
        });
        console.log(`[12] Login ${res.status}: ${res.body.message}`);
        console.assert(res.status === 200, 'Login should be 200');
        console.assert(res.body.data && res.body.data.token, 'Login should return a token');

        // 13. Login invalid password
        res = await request('/api/auth/login', {
            method: 'POST',
            body: { email, password: 'wrongpass' }
        });
        console.log(`[13] Login wrong password ${res.status}: expect 401`);
        console.assert(res.status === 401, 'Login with wrong password should be 401');

        // 14. Profile without token
        res = await request('/api/auth/profile');
        console.log(`[14] Profile no token ${res.status}: expect 401`);
        console.assert(res.status === 401, 'Profile without token should be 401');

        // 15. Profile with token
        res = await request('/api/auth/profile', { token: userToken });
        console.log(`[15] Profile with token ${res.status}: name=${res.body.data && res.body.data.user && res.body.data.user.name}`);
        console.assert(res.status === 200, 'Profile with token should be 200');

        // 15b. Register a farmer (farmers are the only ones who can post listings)
        res = await request('/api/auth/register', {
            method: 'POST',
            body: { name: 'Test Farmer', email: `farmer_${Date.now()}@test.com`, password: 'secret123', role: 'farmer' }
        });
        console.log(`[15b] Register farmer ${res.status}: role=${res.body.data && res.body.data.user && res.body.data.user.role}`);
        console.assert(res.status === 201, 'Register farmer should be 201');
        const farmerToken = res.body.data.token;
        const farmerId = res.body.data.user._id;

        // 15c. 16. Create a product listing as a TRADER -> forbidden
        res = await request('/api/products', {
            method: 'POST',
            body: { title: 'Trader Cannot Post', description: 'Traders buy, they do not sell.', category: 'produce', price: 1, unit: 'kg', location: 'Mombasa', contactEmail: 'trader@test.com' },
            token: userToken
        });
        console.log(`[16] Create product as trader ${res.status}: expect 403`);
        console.assert(res.status === 403, 'Trader creating a product should be 403');

        // 16a. Create a product listing as a FARMER
        res = await request('/api/products', {
            method: 'POST',
            body: {
                title: 'Organic Maize Seeds',
                description: 'High-yield drought tolerant maize seeds suitable for climate smart farming.',
                category: 'seeds',
                price: 15,
                unit: 'kg',
                location: 'Mombasa, Kenya',
                contactEmail: 'farmer@test.com',
                contactPhone: '+254700000000'
            },
            token: farmerToken
        });
        console.log(`[16a] Create product as farmer ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Farmer creating a product should be 201');
        console.assert(res.body.data.product.seller, 'Product should record the seller');
        const productId = res.body.data.product._id;

        // 16b. My products (farmer)
        res = await request('/api/products/my', { token: farmerToken });
        console.log(`[16b] My products ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'My products should be 200');
        console.assert(res.body.count === 1, 'My products should include the created listing');
        console.assert(res.body.data[0].seller === farmerId, 'My products seller should match the token user');

        // 16c. Stats
        res = await request('/api/stats');
        console.log(`[16c] Stats ${res.status}: farmers=${res.body.data.farmers} traders=${res.body.data.traders} listings=${res.body.data.listings} articles=${res.body.data.articles}`);
        console.assert(res.status === 200, 'Stats should be 200');
        console.assert(typeof res.body.data.farmers === 'number', 'Stats farmers should be a number');
        console.assert(res.body.data.listings >= 1, 'Stats listings should include created listing');

        // 17. Create product missing required fields (with a farmer token)
        res = await request('/api/products', {
            method: 'POST',
            token: farmerToken,
            body: { title: 'Incomplete' }
        });
        console.log(`[17] Create product invalid ${res.status}: expect 400`);
        console.assert(res.status === 400, 'Invalid product should be 400');

        // 17b. Create product without any token -> 401
        res = await request('/api/products', {
            method: 'POST',
            body: { title: 'No Auth Product', description: 'x'.repeat(20), category: 'produce', price: 5, unit: 'kg', location: 'X', contactEmail: 'x@x.com' }
        });
        console.log(`[17b] Create product no token ${res.status}: expect 401`);
        console.assert(res.status === 401, 'Create product without token should be 401');

        // 18. Get products
        res = await request('/api/products');
        console.log(`[18] Get products ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get products should be 200');
        console.assert(res.body.count >= 1, 'Should be at least 1 product');

        // 19. Get product by id
        res = await request(`/api/products/${productId}`);
        console.log(`[19] Get product ${res.status}: ${res.body.data && res.body.data.product && res.body.data.product.title}`);
        console.assert(res.status === 200, 'Get product should be 200');

        // 19a. Record listing views
        res = await request(`/api/products/${productId}/view`, { method: 'POST', body: {} });
        console.log(`[19a] Record view ${res.status}`);
        console.assert(res.status === 201, 'Record view should be 201');

        // 19b. Record interest clicks
        res = await request(`/api/products/${productId}/interest`, { method: 'POST', body: {} });
        console.log(`[19b] Record interest ${res.status}`);
        console.assert(res.status === 201, 'Record interest should be 201');

        // 19c. Record view on missing product -> 404
        res = await request('/api/products/000000000000000000000000/view', { method: 'POST', body: {} });
        console.log(`[19c] View missing product ${res.status}: expect 404`);
        console.assert(res.status === 404, 'View of missing product should be 404');

        // 19d. Get products includes 30-day demand counts
        res = await request('/api/products');
        console.log(`[19d] Get products ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get products should be 200');
        const enriched = (res.body.data || []).find(p => String(p._id) === productId);
        console.assert(enriched && enriched.views30d === 1, 'Listing should report 1 view in 30 days');
        console.assert(enriched && enriched.interest30d === 1, 'Listing should report 1 interest in 30 days');

        // 19e. Market insights computes supply/demand analysis
        res = await request('/api/market-insights');
        console.log(`[19e] Market insights ${res.status}: listings=${res.body.data && res.body.data.totals && res.body.data.totals.listings} views30d=${res.body.data && res.body.data.totals && res.body.data.totals.views30d}`);
        console.assert(res.status === 200, 'Market insights should be 200');
        console.assert(res.body.data && typeof res.body.data.totals.listings === 'number', 'Insights should include totals');
        console.assert(Array.isArray(res.body.data.segments), 'Insights should include segments');
        console.assert(Array.isArray(res.body.data.categories), 'Insights should include category breakdown');
        console.assert(Array.isArray(res.body.data.opportunities), 'Insights should include opportunities');

        // 19f. Market Insights page serves
        res = await request('/market-insights');
        console.log(`[19f] Market Insights page ${res.status}`);
        console.assert(res.status === 200, 'Market Insights page should be 200');

        // 20. Update product (owner farmer)
        res = await request(`/api/products/${productId}`, {
            method: 'PUT',
            token: farmerToken,
            body: { price: 18 }
        });
        console.log(`[20] Update product ${res.status}: ${res.body.message}`);
        console.assert(res.status === 200, 'Update product should be 200');

        // 21. Delete product
        res = await request(`/api/products/${productId}`, { method: 'DELETE', token: farmerToken });
        console.log(`[21] Delete product ${res.status}: ${res.body.message}`);
        console.assert(res.status === 200, 'Delete product should be 200');

        // 22. Create article requires admin - regular user should be forbidden
        res = await request('/api/articles', {
            method: 'POST',
            token: userToken,
            body: {
                title: 'Test Article',
                content: 'This is a sufficiently long article content for the knowledge base platform to be stored.',
                category: 'soil-health'
            }
        });
        console.log(`[22] Create article as user ${res.status}: expect 403`);
        console.assert(res.status === 403, 'Create article as non-admin should be 403');

        // 23. Seed admin user and create article
        const User = require('../server/models/User');
        const admin = await User.create({
            name: 'Admin User',
            email: `admin_${Date.now()}@test.com`,
            password: 'adminpass123',
            role: 'admin'
        });
        const adminToken = require('jsonwebtoken').sign(
            { id: admin._id, role: admin.role },
            require('../server/config').jwt.secret,
            { expiresIn: '1h' }
        );
        res = await request('/api/articles', {
            method: 'POST',
            token: adminToken,
            body: {
                title: `Soil Health Guide ${Date.now()}`,
                content: 'A comprehensive guide on improving soil health through organic practices, crop rotation, and composting.',
                summary: 'A guide to healthy soils.',
                category: 'soil-health',
                tags: ['soil', 'compost', 'organic'],
                published: true
            }
        });
        console.log(`[23] Create article as admin ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Create article as admin should be 201');
        const articleId = res.body.data.article._id;
        const articleSlug = res.body.data.article.slug;

        // 24. Get articles
        res = await request('/api/articles');
        console.log(`[24] Get articles ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get articles should be 200');
        console.assert(res.body.count >= 1, 'Should be at least 1 article');

        // 25. Get single article (by slug)
        res = await request(`/api/articles/${articleSlug}`);
        console.log(`[25] Get article by slug ${res.status}`);
        console.assert(res.status === 200, 'Get article by slug should be 200');

        // 26. Create quiz as admin
        res = await request('/api/quizzes', {
            method: 'POST',
            token: adminToken,
            body: {
                title: 'Climate Smart Basics',
                description: 'Test your knowledge of climate smart agriculture.',
                category: 'climate-basics',
                published: true,
                questions: [
                    { question: 'What is climate smart agriculture?', options: ['Farming that ignores climate', 'Agriculture that adapts to climate change', 'Indoor farming', 'None'], correctIndex: 1, explanation: 'CSA adapts to and mitigates climate change.' },
                    { question: 'Which practice conserves soil?', options: ['Burning residue', 'Crop rotation', 'Overgrazing', 'Deforestation'], correctIndex: 1, explanation: 'Crop rotation improves soil health.' }
                ]
            }
        });
        console.log(`[26] Create quiz ${res.status}: ${res.body.message}`);
        console.assert(res.status === 201, 'Create quiz should be 201');
        const quizId = res.body.data.quiz._id;

        // 27. Get quizzes
        res = await request('/api/quizzes');
        console.log(`[27] Get quizzes ${res.status}: count=${res.body.count}`);
        console.assert(res.status === 200, 'Get quizzes should be 200');
        console.assert(res.body.count >= 1, 'Should be at least 1 quiz');

        // 28. Get quiz (should not expose correctIndex)
        res = await request(`/api/quizzes/${quizId}`);
        console.log(`[28] Get quiz ${res.status}`);
        console.assert(res.status === 200, 'Get quiz should be 200');
        console.assert(JSON.stringify(res.body.data.quiz).includes('correctIndex') === false, 'correctIndex should be hidden');

        // 29. Submit quiz answers (one correct, one incorrect)
        res = await request(`/api/quizzes/${quizId}/submit`, {
            method: 'POST',
            body: { answers: [1, 0] }
        });
        console.log(`[29] Submit quiz ${res.status}: score=${res.body.data && res.body.data.score}/${res.body.data && res.body.data.total}`);
        console.assert(res.status === 200, 'Submit quiz should be 200');
        console.assert(res.body.data.score === 1, 'Score should be 1');

        // 30. New page URLs serve correctly
        for (const page of ['/marketplace', '/education', '/login', '/register', '/dashboard', '/market-insights']) {
            res = await request(page);
            console.log(`[30] Page ${page} ${res.status}`);
            console.assert(res.status === 200, `${page} should be 200`);
        }

        console.log('\n=== All tests passed ===');

        // Shutdown
        await new Promise(r => server.close(r));
        await closeDatabase();
        process.exit(0);
    } catch (err) {
        console.error('\n[Test] FAILED:', err.message);
        try { await closeDatabase(); } catch (e) {}
        process.exit(1);
    }
})();

/**
 * Traceability — optional batch provenance on a listing, snapshotted into the
 * escrow orders it produces, and served on a public /trace/:code page. Models
 * and side services are stubbed so the suite runs on any CPU.
 */

const mockProduct = { create: jest.fn(), findById: jest.fn(), findOne: jest.fn(), find: jest.fn(), countDocuments: jest.fn() };
const mockOrder = { create: jest.fn(), find: jest.fn() };
const mockReservation = { create: jest.fn(), findOne: jest.fn(), find: jest.fn() };
const mockUser = { findById: jest.fn(), find: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/Order', () => mockOrder);
jest.mock('../server/models/Reservation', () => mockReservation);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/models/ListingEvent', () => ({}));
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));
jest.mock('../server/controllers/marketInsightsController', () => ({ attachEventCounts: jest.fn(() => Promise.resolve()) }));
jest.mock('../server/controllers/paymentController', () => ({ getPlans: jest.fn(() => []) }));
jest.mock('../server/controllers/priceBoardController', () => ({
    classifyCrop: jest.fn(() => ({ key: 'mango', label: 'Mango' }))
}));
jest.mock('../server/services/daraja', () => ({}));
jest.mock('../server/services/paystack', () => ({}));
jest.mock('../server/services/escrow', () => {
    const actual = jest.requireActual('../server/services/escrow');
    return { ...actual, nextActions: jest.fn(() => []) };
});

const productController = require('../server/controllers/productController');
const orderController = require('../server/controllers/orderController');
const reservationController = require('../server/controllers/reservationController');
const traceController = require('../server/controllers/traceController');

const FARMER = {
    _id: 'farmer-1', email: 'farmer@k.test', role: 'farmer',
    identityVerified: true,
    membership: { status: 'active', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
};
const BUYER = { _id: 'buyer-1', email: 'buyer@k.test', role: 'trader' };

function res() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

function query(result) {
    const p = Promise.resolve(result);
    ['populate', 'sort', 'skip', 'limit', 'select', 'lean'].forEach((m) => { p[m] = jest.fn(() => p); });
    return p;
}

const BATCH = { code: 'MNG-8H3K', harvestDate: new Date('2026-09-01'), grade: 'Grade A', origin: 'Kilifi, Kenya', note: '' };
const LISTING = {
    _id: 'prod-1', title: 'Ngowe Mangoes', description: 'Ripe mangoes from Kilifi',
    price: 100, unit: 'kg', seller: 'farmer-1', active: true, image: '', batch: BATCH
};

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockReservation.findOne.mockResolvedValue(null);
    mockOrder.find.mockReturnValue(query([]));
    mockReservation.find.mockReturnValue(query([]));
});

describe('generateBatchCode', () => {
    test('builds a crop-prefixed, unambiguous code', () => {
        const code = productController.generateBatchCode('Mango');
        expect(code).toMatch(/^MAN-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    });

    test('falls back to a KCN prefix when nothing usable is given', () => {
        expect(productController.generateBatchCode('')).toMatch(/^KCN-/);
    });
});

describe('createProduct batch handling', () => {
    test('auto-generates a code when provenance is given without one', async () => {
        mockProduct.create.mockImplementation((doc) => Promise.resolve({ _id: 'prod-1', ...doc }));
        const r = res();
        await productController.createProduct({
            user: FARMER,
            body: {
                title: 'Ngowe Mangoes', description: 'Ripe mangoes', category: 'produce',
                price: 100, unit: 'kg', location: 'Kilifi, Kenya',
                contactEmail: 'farmer@k.test', contactPhone: '+254700000000',
                batch: { harvestDate: '2026-09-01', grade: 'Grade A', origin: 'Kilifi, Kenya' }
            }
        }, r);

        expect(r.statusCode).toBe(201);
        const arg = mockProduct.create.mock.calls[0][0];
        expect(arg.batch.code).toMatch(/^MAN-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    });

    test('keeps and uppercases a farmer-supplied code', async () => {
        mockProduct.create.mockImplementation((doc) => Promise.resolve({ _id: 'prod-1', ...doc }));
        const r = res();
        await productController.createProduct({
            user: FARMER,
            body: {
                title: 'Ngowe Mangoes', description: 'Ripe mangoes', category: 'produce',
                price: 100, unit: 'kg', location: 'Kilifi, Kenya',
                contactEmail: 'farmer@k.test', contactPhone: '+254700000000',
                batch: { code: 'my-lot-7', grade: 'Grade A' }
            }
        }, r);

        expect(r.statusCode).toBe(201);
        expect(mockProduct.create.mock.calls[0][0].batch.code).toBe('MY-LOT-7');
    });

    test('leaves listings without provenance untouched', async () => {
        mockProduct.create.mockImplementation((doc) => Promise.resolve({ _id: 'prod-1', ...doc }));
        const r = res();
        await productController.createProduct({
            user: FARMER,
            body: {
                title: 'Panga', description: 'A machete', category: 'tools',
                price: 500, unit: 'unit', location: 'Mombasa, Kenya',
                contactEmail: 'farmer@k.test', contactPhone: '+254700000000'
            }
        }, r);

        expect(r.statusCode).toBe(201);
        expect(mockProduct.create.mock.calls[0][0].batch).toBeUndefined();
    });
});

describe('order snapshot', () => {
    test('copies the listing batch onto the escrow order', async () => {
        mockProduct.findById.mockResolvedValue(LISTING);
        mockUser.findById.mockReturnValue(query({ isActive: true }));
        mockOrder.create.mockImplementation((doc) => Promise.resolve({
            _id: 'ord-1', currency: 'KES', delivery: {}, escrow: {}, dispute: {},
            createdAt: new Date(), updatedAt: new Date(), ...doc
        }));

        const r = res();
        await orderController.createOrder({ params: { id: 'prod-1' }, user: BUYER, body: { quantity: 5 } }, r);

        expect(r.statusCode).toBe(201);
        const arg = mockOrder.create.mock.calls[0][0];
        expect(arg.item.batch).toEqual({ code: 'MNG-8H3K', harvestDate: BATCH.harvestDate, grade: 'Grade A', origin: 'Kilifi, Kenya' });
    });
});

describe('reservation snapshot', () => {
    test('copies the listing batch onto the reservation item', async () => {
        mockProduct.findById.mockResolvedValue(LISTING);
        mockReservation.create.mockImplementation((doc) => Promise.resolve({
            _id: 'res-1', createdAt: new Date(), updatedAt: new Date(), ...doc
        }));

        const r = res();
        await reservationController.createReservation({ params: { id: 'prod-1' }, user: BUYER, body: { quantity: 10 } }, r);

        expect(r.statusCode).toBe(201);
        const arg = mockReservation.create.mock.calls[0][0];
        expect(arg.item.batch.code).toBe('MNG-8H3K');
    });
});

describe('GET /api/trace/:code', () => {
    test('404s for an unknown code', async () => {
        mockProduct.findOne.mockReturnValue(query(null));
        const r = res();
        await traceController.getTrace({ params: { code: 'NOPE' } }, r);
        expect(r.statusCode).toBe(404);
    });

    test('aggregates provenance and trades without leaking the buyer', async () => {
        mockProduct.findOne.mockReturnValue(query(LISTING));
        mockOrder.find.mockReturnValue(query([
            {
                reference: 'ESC-1', quantity: 5, status: 'released', item: { batch: BATCH },
                timeline: [
                    { at: new Date('2026-09-02T09:00:00Z'), action: 'placed', by: 'buyer-1' },
                    { at: new Date('2026-09-03T09:00:00Z'), action: 'released', by: 'farmer-1' }
                ]
            }
        ]));
        mockReservation.find.mockReturnValue(query([]));
        mockUser.findById.mockReturnValue(query({ name: 'Mary Wanjiru', identityVerified: true, rating: { average: 4.5, count: 8 } }));

        const r = res();
        await traceController.getTrace({ params: { code: 'mng-8h3k' } }, r);

        expect(r.statusCode).toBe(200);
        const { data } = r.body;
        expect(data.batch.code).toBe('MNG-8H3K');
        expect(data.farmer).toEqual({ name: 'Mary Wanjiru', verified: true, rating: { average: 4.5, count: 8 } });
        expect(data.summary.orders).toBe(1);

        const actors = data.events.map((e) => e.actor);
        expect(actors).toContain('Farmer');
        expect(actors).toContain('Buyer');
        expect(data.events[0].action).toBe('listed');
        // No buyer identity anywhere in the payload.
        expect(JSON.stringify(data)).not.toContain('buyer-1');
    });
});

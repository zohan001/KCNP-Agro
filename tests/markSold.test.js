/**
 * Mark-as-sold — the farmer records that produce has gone, and at what price,
 * so a real trade (and the price paid) enters the platform and feeds the
 * Price Board. Models are stubbed so the suite runs on any CPU.
 */

const mockProduct = { findById: jest.fn() };
const mockListingEvent = { deleteMany: jest.fn(() => Promise.resolve({})) };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/ListingEvent', () => mockListingEvent);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));
jest.mock('../server/controllers/marketInsightsController', () => ({ attachEventCounts: jest.fn() }));
jest.mock('../server/controllers/paymentController', () => ({ getPlans: jest.fn(() => []) }));

const productController = require('../server/controllers/productController');

const SELLER = { _id: 'seller-1', email: 'seller@k.test', role: 'farmer' };
const OTHER = { _id: 'other-1', email: 'other@k.test', role: 'farmer' };

function res() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

function productDoc(overrides = {}) {
    return {
        _id: 'p1', title: 'Ngowe Mango', unit: 'kg', seller: 'seller-1', active: true,
        sale: { soldAt: null, soldPrice: null, unit: '', buyer: null, buyerName: '', channel: 'direct', note: '' },
        save: jest.fn(() => Promise.resolve()),
        ...overrides
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
});

describe('markSold', () => {
    test('404s on an unknown listing', async () => {
        mockProduct.findById.mockResolvedValue(null);
        const r = res();
        await productController.markSold({ params: { id: 'p1' }, user: SELLER, body: {} }, r);
        expect(r.statusCode).toBe(404);
    });

    test('refuses to let another farmer close your listing', async () => {
        mockProduct.findById.mockResolvedValue(productDoc());
        const r = res();
        await productController.markSold({ params: { id: 'p1' }, user: OTHER, body: { soldPrice: 80 } }, r);
        expect(r.statusCode).toBe(403);
    });

    test('will not double-sell a listing', async () => {
        mockProduct.findById.mockResolvedValue(productDoc({ sale: { soldAt: new Date(), soldPrice: 70 } }));
        const r = res();
        await productController.markSold({ params: { id: 'p1' }, user: SELLER, body: { soldPrice: 80 } }, r);
        expect(r.statusCode).toBe(409);
        expect(mockProduct.findById).toHaveBeenCalled();
    });

    test('validates a negative price', async () => {
        mockProduct.findById.mockResolvedValue(productDoc());
        const r = res();
        await productController.markSold({ params: { id: 'p1' }, user: SELLER, body: { soldPrice: -5 } }, r);
        expect(r.statusCode).toBe(400);
    });

    test('records the sale, closes the listing and logs it', async () => {
        const doc = productDoc();
        mockProduct.findById.mockResolvedValue(doc);
        const r = res();
        await productController.markSold({
            params: { id: 'p1' }, user: SELLER,
            body: { soldPrice: 85, soldQuantity: 120, channel: 'middleman', buyerName: 'Kongowea broker' }
        }, r);

        expect(r.statusCode).toBe(200);
        expect(doc.active).toBe(false);
        expect(doc.sale.soldAt).toBeInstanceOf(Date);
        expect(doc.sale.soldPrice).toBe(85);
        expect(doc.sale.soldQuantity).toBe(120);
        expect(doc.sale.channel).toBe('middleman');
        expect(doc.save).toHaveBeenCalledTimes(1);
        expect(mockLogAudit).toHaveBeenCalledWith('PRODUCT_SOLD', expect.stringContaining('Ngowe Mango'));
    });

    test('accepts a sale with no price (quantity only)', async () => {
        const doc = productDoc();
        mockProduct.findById.mockResolvedValue(doc);
        const r = res();
        await productController.markSold({ params: { id: 'p1' }, user: SELLER, body: { soldQuantity: 5 } }, r);
        expect(r.statusCode).toBe(200);
        expect(doc.sale.soldPrice).toBeNull();
        expect(doc.sale.channel).toBe('direct');
    });
});

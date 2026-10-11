/**
 * Price Board — the public board that merges asking prices, farmer-recorded
 * sale prices and completed escrow orders, grouped by crop and unit so medians
 * are never computed across mixed units. Models are stubbed so the suite runs
 * on any CPU (MongoDB 5+ needs AVX).
 */

const mockProduct = { find: jest.fn() };
const mockOrder = { find: jest.fn() };

jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/Order', () => mockOrder);

const { getPriceBoard, classifyCrop, median } = require('../server/controllers/priceBoardController');

function findChain(docs) {
    const lean = jest.fn(() => Promise.resolve(docs));
    const limit = jest.fn(() => ({ lean }));
    const select = jest.fn(() => ({ limit }));
    return { select };
}

function res() {
    const r = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
    return r;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockProduct.find.mockReturnValue(findChain([]));
    mockOrder.find.mockReturnValue(findChain([]));
});

describe('classifyCrop', () => {
    test('recognises the coastal basket', () => {
        expect(classifyCrop('Fresh Ngowe Mangoes').key).toBe('mango');
        expect(classifyCrop('Raw cashew nuts, Kilifi').key).toBe('cashew');
        expect(classifyCrop('Coconuts per piece').key).toBe('coconut');
        expect(classifyCrop('Dry maize (mahindi) 90kg bag').key).toBe('maize');
        expect(classifyCrop('Paddy rice (mpunga)').key).toBe('rice');
    });

    test('returns null for non-produce text', () => {
        expect(classifyCrop('Used water pump')).toBeNull();
        expect(classifyCrop('')).toBeNull();
        expect(classifyCrop(null)).toBeNull();
    });

    test('coconut is not mistaken for corn/maize', () => {
        expect(classifyCrop('Coconut').key).toBe('coconut');
    });
});

describe('median', () => {
    test('odd and even counts', () => {
        expect(median([3, 1, 2])).toBe(2);
        expect(median([10, 20, 30, 40])).toBe(25);
        expect(median([])).toBe(0);
    });
});

describe('getPriceBoard', () => {
    test('merges asking, marked-sold and escrow prices per crop+unit', async () => {
        mockProduct.find.mockReturnValue(findChain([
            { title: 'Ngowe Mango', description: 'fresh', price: 80, unit: 'kg', location: 'Mombasa', active: true, sale: {} },
            { title: 'Apple Mango', description: 'ripe', price: 100, unit: 'kg', location: 'Kilifi', active: true, sale: {} },
            { title: 'Old Mango lot', description: '', price: 90, unit: 'kg', location: 'Kwale', active: false, sale: { soldAt: new Date(), soldPrice: 70, unit: 'kg', channel: 'middleman' } }
        ]));
        mockOrder.find.mockReturnValue(findChain([
            { item: { title: 'Mango (Ngowe)', unit: 'kg', unitPrice: 95 }, quantity: 100, createdAt: new Date() }
        ]));

        const r = res();
        await getPriceBoard({ query: {} }, r);

        expect(r.statusCode).toBe(200);
        const row = r.body.data.crops.find(c => c.crop === 'mango' && c.unit === 'kg');
        expect(row).toBeTruthy();
        // Two live listings feed asking; sold comes from the marked-sold lot and
        // the escrow order.
        expect(row.listings).toBe(2);
        expect(row.asking.median).toBe(90);
        expect(row.sold.count).toBe(2);
        expect([70, 95]).toContain(row.sold.last);
        expect(r.body.data.recentSales.length).toBe(2);
    });

    test('drops listings that are not a known crop', async () => {
        mockProduct.find.mockReturnValue(findChain([
            { title: 'Water pump', description: 'irrigation', price: 5000, unit: 'unit', active: true, sale: {} }
        ]));
        const r = res();
        await getPriceBoard({ query: {} }, r);
        expect(r.body.data.crops).toEqual([]);
        expect(r.body.data.recentSales).toEqual([]);
    });

    test('keeps units separate so medians are honest', async () => {
        mockProduct.find.mockReturnValue(findChain([
            { title: 'Cashew', description: '', price: 100, unit: 'kg', active: true, sale: {} },
            { title: 'Cashew', description: '', price: 4000, unit: 'bag', active: true, sale: {} }
        ]));
        const r = res();
        await getPriceBoard({ query: {} }, r);
        const rows = r.body.data.crops.filter(c => c.crop === 'cashew');
        expect(rows.length).toBe(2);
        const kg = rows.find(x => x.unit === 'kg');
        const bag = rows.find(x => x.unit === 'bag');
        expect(kg.asking.median).toBe(100);
        expect(bag.asking.median).toBe(4000);
    });

    test('filters to a single crop on request', async () => {
        mockProduct.find.mockReturnValue(findChain([
            { title: 'Mango', description: '', price: 80, unit: 'kg', active: true, sale: {} },
            { title: 'Maize', description: '', price: 50, unit: 'kg', active: true, sale: {} }
        ]));
        const r = res();
        await getPriceBoard({ query: { crop: 'maize' } }, r);
        expect(r.body.data.crops.length).toBe(1);
        expect(r.body.data.crops[0].crop).toBe('maize');
    });
});

/**
 * Demand Board — a buyer posts what they want, farmers answer, and the buyer
 * accepts one, which opens an escrow order (no listing involved). Models are
 * stubbed so the suite runs on any CPU.
 */

const mockDemand = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(() => Promise.resolve({}))
};
const mockResponse = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(() => Promise.resolve({})),
    aggregate: jest.fn(() => Promise.resolve([]))
};
const mockOrder = { create: jest.fn() };
const mockProduct = { findById: jest.fn(), find: jest.fn() };
const mockUser = { findById: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Demand', () => mockDemand);
jest.mock('../server/models/DemandResponse', () => mockResponse);
jest.mock('../server/models/Order', () => mockOrder);
jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));

const controller = require('../server/controllers/demandController');

const BUYER = { _id: 'buyer-1', email: 'buyer@k.test', role: 'trader' };
const FARMER = { _id: 'farmer-1', email: 'farmer@k.test', role: 'farmer' };

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

function selectChain(doc) {
    const p = Promise.resolve(doc);
    p.select = jest.fn(() => p);
    return p;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockDemand.updateMany.mockReturnValue(Promise.resolve({}));
    mockResponse.updateMany.mockReturnValue(Promise.resolve({}));
    mockResponse.aggregate.mockReturnValue(Promise.resolve([]));
    mockDemand.countDocuments.mockReturnValue(Promise.resolve(0));
});

describe('createDemand', () => {
    test('rejects a missing title', async () => {
        const r = res();
        await controller.createDemand({ body: { quantity: 10 }, user: BUYER }, r);
        expect(r.statusCode).toBe(400);
        expect(mockDemand.create).not.toHaveBeenCalled();
    });

    test('rejects a non-positive quantity', async () => {
        const r = res();
        await controller.createDemand({ body: { title: 'Mango', quantity: 0 }, user: BUYER }, r);
        expect(r.statusCode).toBe(400);
        expect(mockDemand.create).not.toHaveBeenCalled();
    });

    test('classifies the crop and stores a posted demand', async () => {
        mockDemand.create.mockImplementation((doc) => Promise.resolve({ status: 'open', _id: 'd1', createdAt: new Date(), ...doc }));
        const r = res();
        await controller.createDemand({
            body: { title: 'Looking for Ngowe mangoes', quantity: 200, unit: 'kg', targetPrice: 95, location: 'Mombasa' },
            user: BUYER
        }, r);
        expect(r.statusCode).toBe(201);
        expect(r.body.data.demand.cropKey).toBe('mango');
        expect(mockDemand.create).toHaveBeenCalledWith(expect.objectContaining({
            buyer: 'buyer-1', cropKey: 'mango', quantity: 200, targetPrice: 95
        }));
    });

    test('treats a blank target price as unspecified', async () => {
        mockDemand.create.mockImplementation((doc) => Promise.resolve({ status: 'open', _id: 'd1', createdAt: new Date(), ...doc }));
        const r = res();
        await controller.createDemand({ body: { title: 'Cashew nuts', quantity: 50, unit: 'kg', targetPrice: '' }, user: BUYER }, r);
        expect(r.statusCode).toBe(201);
        expect(mockDemand.create).toHaveBeenCalledWith(expect.objectContaining({ targetPrice: null }));
    });
});

describe('createResponse', () => {
    test('rejects a non-positive supply price', async () => {
        const r = res();
        await controller.createResponse({ params: { id: 'd1' }, user: FARMER, body: { supplyPrice: 0, quantity: 10 } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockResponse.create).not.toHaveBeenCalled();
    });

    test('refuses responding to your own demand', async () => {
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'open', buyer: 'farmer-1', unit: 'kg' });
        const r = res();
        await controller.createResponse({ params: { id: 'd1' }, user: FARMER, body: { supplyPrice: 90, quantity: 10 } }, r);
        expect(r.statusCode).toBe(400);
        expect(r.body.message).toMatch(/own demand/i);
        expect(mockResponse.create).not.toHaveBeenCalled();
    });

    test('refuses a demand that is no longer open', async () => {
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'matched', buyer: 'buyer-1' });
        const r = res();
        await controller.createResponse({ params: { id: 'd1' }, user: FARMER, body: { supplyPrice: 90, quantity: 10 } }, r);
        expect(r.statusCode).toBe(404);
    });

    test('records an answer from a farmer', async () => {
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'open', buyer: 'buyer-1', unit: 'kg', title: 'Mangoes' });
        mockResponse.create.mockImplementation((doc) => Promise.resolve({ status: 'pending', _id: 'r1', createdAt: new Date(), ...doc }));
        const r = res();
        await controller.createResponse({ params: { id: 'd1' }, user: FARMER, body: { supplyPrice: 88, quantity: 150, message: 'Can deliver' } }, r);
        expect(r.statusCode).toBe(201);
        expect(mockResponse.create).toHaveBeenCalledWith(expect.objectContaining({
            demand: 'd1', farmer: 'farmer-1', supplyPrice: 88, quantity: 150
        }));
    });

    test('refuses a duplicate answer from the same farmer', async () => {
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'open', buyer: 'buyer-1', unit: 'kg' });
        const dup = new Error('duplicate'); dup.code = 11000;
        mockResponse.create.mockRejectedValue(dup);
        const r = res();
        await controller.createResponse({ params: { id: 'd1' }, user: FARMER, body: { supplyPrice: 88, quantity: 10 } }, r);
        expect(r.statusCode).toBe(409);
    });
});

describe('acceptResponse', () => {
    test('refuses when the viewer is not the buyer', async () => {
        mockResponse.findById.mockResolvedValue({ _id: 'r1', status: 'pending', demand: 'd1', farmer: 'farmer-1' });
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'open', buyer: 'someone-else' });
        const r = res();
        await controller.acceptResponse({ params: { id: 'r1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(403);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });

    test('refuses when the demand is already matched', async () => {
        mockResponse.findById.mockResolvedValue({ _id: 'r1', status: 'pending', demand: 'd1', farmer: 'farmer-1' });
        mockDemand.findById.mockResolvedValue({ _id: 'd1', status: 'matched', buyer: 'buyer-1' });
        const r = res();
        await controller.acceptResponse({ params: { id: 'r1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(409);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });

    test('accepts an answer and opens an escrow order with no product', async () => {
        const response = {
            _id: 'r1', status: 'pending', demand: 'd1', farmer: 'farmer-1',
            supplyPrice: 85, quantity: 120, unit: 'kg',
            save: jest.fn(() => Promise.resolve())
        };
        const demand = {
            _id: 'd1', status: 'open', buyer: 'buyer-1', title: 'Ngowe Mangoes',
            quantity: 200, unit: 'kg',
            save: jest.fn(() => Promise.resolve())
        };
        mockResponse.findById.mockResolvedValue(response);
        mockDemand.findById.mockResolvedValue(demand);
        mockUser.findById.mockReturnValue(selectChain({ _id: 'farmer-1', isActive: true, name: 'Mary' }));
        mockOrder.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'ord1', reference: doc.reference }));

        const r = res();
        await controller.acceptResponse({ params: { id: 'r1' }, user: BUYER }, r);

        expect(r.statusCode).toBe(200);
        expect(response.status).toBe('accepted');
        expect(response.order).toBe('ord1');
        expect(demand.status).toBe('matched');
        expect(demand.order).toBe('ord1');
        expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
            product: null, demand: 'd1', buyer: 'buyer-1', seller: 'farmer-1', status: 'awaiting_payment',
            item: expect.objectContaining({ unitPrice: 85 })
        }));
        expect(mockResponse.updateMany).toHaveBeenCalled();
    });
});

describe('closeDemand', () => {
    test('closes the owner\'s own demand and declines pending answers', async () => {
        const demand = { _id: 'd1', status: 'open', buyer: 'buyer-1', save: jest.fn(() => Promise.resolve()) };
        mockDemand.findOne.mockResolvedValue(demand);
        const r = res();
        await controller.closeDemand({ params: { id: 'd1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(200);
        expect(demand.status).toBe('closed');
        expect(mockResponse.updateMany).toHaveBeenCalled();
    });

    test('will not close a demand you do not own', async () => {
        mockDemand.findOne.mockResolvedValue(null);
        const r = res();
        await controller.closeDemand({ params: { id: 'd1' }, user: FARMER }, r);
        expect(r.statusCode).toBe(404);
    });
});

describe('listDemands', () => {
    test('filters by crop and returns a public list with answer counts', async () => {
        const d = { _id: 'd1', cropKey: 'mango', cropLabel: 'Mango', title: 'Mangoes', quantity: 100, unit: 'kg', status: 'open', buyer: 'buyer-1', createdAt: new Date() };
        mockDemand.find.mockReturnValue(query([d]));
        mockDemand.countDocuments.mockResolvedValue(1);
        mockResponse.aggregate.mockResolvedValue([{ _id: 'd1', n: 3 }]);

        const r = res();
        await controller.listDemands({ query: { crop: 'Mango' } }, r);

        expect(r.statusCode).toBe(200);
        expect(mockDemand.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'open', cropKey: 'mango' }));
        expect(r.body.data[0].responseCount).toBe(3);
    });
});

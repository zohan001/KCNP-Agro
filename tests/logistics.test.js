/**
 * Transport & Collection Registry — anyone signed in can register a service,
 * the public browses the directory, and admins verify trusted partners.
 * Models are stubbed so the suite runs on any CPU.
 */

const mockProvider = {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
};
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/LogisticsProvider', () => {
    const model = mockProvider;
    model.PROVIDER_TYPES = ['collection_point', 'transporter', 'cold_storage'];
    model.SERVICES = ['bulking', 'grading', 'sorting', 'weighing', 'storage', 'cold_chain', 'haulage', 'packaging', 'credit'];
    model.FEE_MODELS = ['negotiable', 'free', 'per_load', 'per_km', 'per_kg', 'commission'];
    return model;
});
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));

const controller = require('../server/controllers/logisticsController');

const OWNER = { _id: 'user-1', email: 'owner@k.test', role: 'farmer' };
const OTHER = { _id: 'user-2', email: 'other@k.test', role: 'farmer' };
const ADMIN = { _id: 'admin-1', email: 'admin@k.test', role: 'admin' };

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

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockProvider.countDocuments.mockReturnValue(Promise.resolve(0));
});

describe('createProvider', () => {
    test('rejects a missing name', async () => {
        const r = res();
        await controller.createProvider({ body: { type: 'transporter' }, user: OWNER }, r);
        expect(r.statusCode).toBe(400);
        expect(mockProvider.create).not.toHaveBeenCalled();
    });

    test('rejects an invalid type', async () => {
        const r = res();
        await controller.createProvider({ body: { name: 'My Truck', type: 'spaceship' }, user: OWNER }, r);
        expect(r.statusCode).toBe(400);
        expect(mockProvider.create).not.toHaveBeenCalled();
    });

    test('registers a transporter and normalises crops and services', async () => {
        mockProvider.create.mockImplementation((doc) => Promise.resolve({ _id: 'p1', active: true, ...doc }));
        const r = res();
        await controller.createProvider({
            body: {
                name: 'Coast Haulage',
                type: 'transporter',
                cropsHandled: ['Ngowe mangoes', 'coconuts', 'unobtainium'],
                services: ['haulage', 'cold_chain', 'nonsense'],
                feeModel: 'per_km'
            },
            user: OWNER
        }, r);

        expect(r.statusCode).toBe(201);
        expect(mockProvider.create).toHaveBeenCalledWith(expect.objectContaining({
            owner: 'user-1',
            type: 'transporter',
            name: 'Coast Haulage',
            cropsHandled: ['mango', 'coconut'],
            services: ['haulage', 'cold_chain'],
            feeModel: 'per_km'
        }));
        expect(mockLogAudit).toHaveBeenCalled();
    });

    test('falls back to a negotiable fee model and null capacity', async () => {
        mockProvider.create.mockImplementation((doc) => Promise.resolve({ _id: 'p1', active: true, ...doc }));
        const r = res();
        await controller.createProvider({ body: { name: 'Village Depot', type: 'collection_point', capacity: '' }, user: OWNER }, r);
        expect(r.statusCode).toBe(201);
        expect(mockProvider.create).toHaveBeenCalledWith(expect.objectContaining({ feeModel: 'negotiable', capacity: null }));
    });
});

describe('listProviders', () => {
    test('filters by type and crop and hides contact details from the public', async () => {
        const p = {
            _id: 'p1', type: 'transporter', name: 'Coast Haulage', location: 'Kilifi',
            cropsHandled: ['mango'], services: ['haulage'], owner: { _id: 'user-1', name: 'Owner' },
            contactPhone: '0700000000', contactEmail: 'owner@k.test', active: true, createdAt: new Date()
        };
        mockProvider.find.mockReturnValue(query([p]));
        mockProvider.countDocuments.mockResolvedValue(1);

        const r = res();
        await controller.listProviders({ query: { type: 'transporter', crop: 'mango' } }, r);

        expect(r.statusCode).toBe(200);
        expect(mockProvider.find).toHaveBeenCalledWith(expect.objectContaining({ active: true, type: 'transporter', cropsHandled: 'mango' }));
        expect(r.body.data[0].contactPhone).toBe('');
        expect(r.body.data[0].contactEmail).toBe('');
    });
});

describe('updateProvider', () => {
    test('refuses edits from someone who does not own the service', async () => {
        mockProvider.findById.mockResolvedValue({ _id: 'p1', owner: 'user-1', active: true });
        const r = res();
        await controller.updateProvider({ params: { id: 'p1' }, user: OTHER, body: { name: 'Hacked' } }, r);
        expect(r.statusCode).toBe(403);
    });

    test('lets the owner update fields', async () => {
        const provider = { _id: 'p1', owner: 'user-1', active: true, name: 'Old', save: jest.fn(() => Promise.resolve()) };
        mockProvider.findById.mockResolvedValue(provider);
        const r = res();
        await controller.updateProvider({ params: { id: 'p1' }, user: OWNER, body: { name: 'New Depot', location: 'Kwale' } }, r);
        expect(r.statusCode).toBe(200);
        expect(provider.name).toBe('New Depot');
        expect(provider.location).toBe('Kwale');
        expect(provider.save).toHaveBeenCalled();
    });
});

describe('deleteProvider', () => {
    test('soft-deletes for the owner', async () => {
        const provider = { _id: 'p1', owner: 'user-1', active: true, save: jest.fn(() => Promise.resolve()) };
        mockProvider.findById.mockResolvedValue(provider);
        const r = res();
        await controller.deleteProvider({ params: { id: 'p1' }, user: OWNER }, r);
        expect(r.statusCode).toBe(200);
        expect(provider.active).toBe(false);
    });

    test('hides an already-removed service', async () => {
        mockProvider.findById.mockResolvedValue({ _id: 'p1', owner: 'user-1', active: false });
        const r = res();
        await controller.deleteProvider({ params: { id: 'p1' }, user: OWNER }, r);
        expect(r.statusCode).toBe(404);
    });
});

describe('verifyProvider', () => {
    test('an admin marks a partner verified', async () => {
        const provider = { _id: 'p1', name: 'Coast Haulage', verified: false, save: jest.fn(() => Promise.resolve()) };
        mockProvider.findById.mockResolvedValue(provider);
        const r = res();
        await controller.verifyProvider({ params: { id: 'p1' }, user: ADMIN, body: {} }, r);
        expect(r.statusCode).toBe(200);
        expect(provider.verified).toBe(true);
        expect(provider.verifiedBy).toBe('admin-1');
    });

    test('an admin can withdraw verification', async () => {
        const provider = { _id: 'p1', name: 'Coast Haulage', verified: true, save: jest.fn(() => Promise.resolve()) };
        mockProvider.findById.mockResolvedValue(provider);
        const r = res();
        await controller.verifyProvider({ params: { id: 'p1' }, user: ADMIN, body: { verified: false } }, r);
        expect(provider.verified).toBe(false);
        expect(provider.verifiedAt).toBeNull();
    });
});

describe('helpers', () => {
    test('normaliseCrops keeps known crops and drops the rest', () => {
        expect(controller.normaliseCrops(['mango', 'Rice', 'bananas', 'gibberish'])).toEqual(['mango', 'rice', 'banana']);
    });
});

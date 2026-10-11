/**
 * Offers — a trader names a price, the farmer compares bids and accepts one,
 * which opens an escrow order at the agreed price. Models are stubbed so the
 * suite runs on any CPU.
 */

const mockOffer = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(() => Promise.resolve({}))
};
const mockProduct = { findById: jest.fn() };
const mockOrder = { create: jest.fn() };
const mockUser = { findById: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Offer', () => mockOffer);
jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/Order', () => mockOrder);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));
jest.mock('../server/services/notifications', () => ({ notifyAdmins: jest.fn(() => Promise.resolve()) }));

const controller = require('../server/controllers/offerController');

const BUYER = { _id: 'buyer-1', email: 'buyer@k.test', role: 'trader' };
const SELLER = { _id: 'seller-1', email: 'seller@k.test', role: 'farmer' };

function res() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

function selectChain(doc) {
    const p = Promise.resolve(doc);
    p.select = jest.fn(() => p);
    return p;
}

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockOffer.updateMany.mockReturnValue(Promise.resolve({}));
});

describe('createOffer', () => {
    test('rejects a non-positive price', async () => {
        const r = res();
        await controller.createOffer(
            { params: { id: 'p1' }, user: BUYER, body: { offerPrice: 0, quantity: 10 } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockOffer.create).not.toHaveBeenCalled();
    });

    test('refuses an offer on your own listing', async () => {
        mockProduct.findById.mockResolvedValue({ _id: 'p1', active: true, seller: 'seller-1', title: 'Mango', unit: 'kg' });
        const r = res();
        await controller.createOffer(
            { params: { id: 'p1' }, user: SELLER, body: { offerPrice: 80, quantity: 10 } }, r);
        expect(r.statusCode).toBe(400);
        expect(r.body.message).toMatch(/own listing/i);
        expect(mockOffer.create).not.toHaveBeenCalled();
    });

    test('refuses a listing that is no longer available', async () => {
        mockProduct.findById.mockResolvedValue({ _id: 'p1', active: false, seller: 'seller-1' });
        const r = res();
        await controller.createOffer(
            { params: { id: 'p1' }, user: BUYER, body: { offerPrice: 80, quantity: 10 } }, r);
        expect(r.statusCode).toBe(404);
    });

    test('records a valid offer', async () => {
        mockProduct.findById.mockResolvedValue({ _id: 'p1', active: true, seller: 'seller-1', title: 'Ngowe Mango', unit: 'kg' });
        mockOffer.create.mockImplementation((doc) => Promise.resolve({ status: 'pending', _id: 'o1', createdAt: new Date(), ...doc }));

        const r = res();
        await controller.createOffer(
            { params: { id: 'p1' }, user: BUYER, body: { offerPrice: 80.5, quantity: 120, message: 'Can collect' } }, r);

        expect(r.statusCode).toBe(201);
        expect(r.body.data.offer.status).toBe('pending');
        expect(mockOffer.create).toHaveBeenCalledWith(expect.objectContaining({
            seller: 'seller-1', buyer: 'buyer-1', offerPrice: 80.5, quantity: 120
        }));
    });
});

describe('acceptOffer', () => {
    test('will not accept an offer that is not pending', async () => {
        mockOffer.findOne.mockResolvedValue({ _id: 'o1', status: 'declined' });
        const r = res();
        await controller.acceptOffer({ params: { id: 'o1' }, user: SELLER }, r);
        expect(r.statusCode).toBe(409);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });

    test('accepts a bid, opens an escrow order at the agreed price and declines rivals', async () => {
        const offer = {
            _id: 'o1', status: 'pending', product: 'p1', buyer: 'buyer-1', seller: 'seller-1',
            offerPrice: 80, quantity: 100, unit: 'kg',
            save: jest.fn(() => Promise.resolve())
        };
        mockOffer.findOne.mockResolvedValue(offer);
        mockProduct.findById.mockResolvedValue({ _id: 'p1', active: true, title: 'Ngowe Mango', unit: 'kg', stock: null, image: '' });
        mockUser.findById.mockReturnValue(selectChain({ _id: 'buyer-1', isActive: true, name: 'Buyer' }));
        mockOrder.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'ord1', reference: doc.reference }));

        const r = res();
        await controller.acceptOffer({ params: { id: 'o1' }, user: SELLER }, r);

        expect(r.statusCode).toBe(200);
        expect(offer.status).toBe('accepted');
        expect(offer.order).toBe('ord1');
        expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
            buyer: 'buyer-1', seller: 'seller-1', status: 'awaiting_payment',
            item: expect.objectContaining({ unitPrice: 80 })
        }));
        expect(mockOffer.updateMany).toHaveBeenCalled();
    });

    test('rejects accepting when stock has since run out', async () => {
        const offer = { _id: 'o1', status: 'pending', product: 'p1', buyer: 'buyer-1', offerPrice: 80, quantity: 100 };
        mockOffer.findOne.mockResolvedValue(offer);
        mockProduct.findById.mockResolvedValue({ _id: 'p1', active: true, title: 'Mango', unit: 'kg', stock: 4 });
        const r = res();
        await controller.acceptOffer({ params: { id: 'o1' }, user: SELLER }, r);
        expect(r.statusCode).toBe(400);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });
});

describe('declineOffer / withdrawOffer', () => {
    function pendingOffer() {
        return {
            _id: 'o1', status: 'pending', product: 'p1',
            buyer: 'buyer-1', seller: 'seller-1', item: { title: 'Mango', unit: 'kg' },
            offerPrice: 80, quantity: 10, unit: 'kg',
            save: jest.fn(() => Promise.resolve())
        };
    }

    test('declines a pending offer', async () => {
        const offer = pendingOffer();
        mockOffer.findOne.mockResolvedValue(offer);
        const r = res();
        await controller.declineOffer({ params: { id: 'o1' }, user: SELLER }, r);
        expect(r.statusCode).toBe(200);
        expect(offer.status).toBe('declined');
    });

    test('a buyer withdraws their own bid', async () => {
        const offer = pendingOffer();
        mockOffer.findOne.mockResolvedValue(offer);
        const r = res();
        await controller.withdrawOffer({ params: { id: 'o1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(200);
        expect(offer.status).toBe('withdrawn');
    });
});

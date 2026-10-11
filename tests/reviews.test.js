/**
 * Reviews — reputation only from completed trades. A review is accepted when
 * tied to a released escrow order or a listing marked sold to a registered
 * buyer. Models are stubbed so the suite runs on any CPU.
 */

const mockReview = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn()
};
const mockOrder = { findById: jest.fn() };
const mockProduct = { findById: jest.fn() };
const mockUser = { findByIdAndUpdate: jest.fn(), findById: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Review', () => mockReview);
jest.mock('../server/models/Order', () => mockOrder);
jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));

const controller = require('../server/controllers/reviewController');

const BUYER = { _id: 'buyer-1', email: 'buyer@k.test' };
const SELLER = { _id: 'seller-1', email: 'seller@k.test' };

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
    mockUser.findByIdAndUpdate.mockReturnValue(selectChain({ _id: 'seller-1', name: 'Seller', rating: { average: 4.5, count: 2 } }));
    mockReview.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'r1', createdAt: new Date() }));
    mockReview.findOne.mockResolvedValue(null);
});

describe('createReview', () => {
    test('rejects an out-of-range rating', async () => {
        const r = res();
        await controller.createReview({ user: BUYER, body: { orderId: 'o1', rating: 9 } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockReview.create).not.toHaveBeenCalled();
    });

    test('refuses a trade that is not completed', async () => {
        mockOrder.findById.mockResolvedValue({ _id: 'o1', status: 'dispatched', buyer: 'buyer-1', seller: 'seller-1' });
        const r = res();
        await controller.createReview({ user: BUYER, body: { orderId: 'o1', rating: 5 } }, r);
        expect(r.statusCode).toBe(409);
        expect(mockReview.create).not.toHaveBeenCalled();
    });

    test('refuses a reviewer who was not part of the trade', async () => {
        mockOrder.findById.mockResolvedValue({ _id: 'o1', status: 'released', buyer: 'buyer-1', seller: 'seller-1' });
        const r = res();
        await controller.createReview({ user: { _id: 'stranger', email: 'x@y.z' }, body: { orderId: 'o1', rating: 5 } }, r);
        expect(r.statusCode).toBe(403);
        expect(mockReview.create).not.toHaveBeenCalled();
    });

    test('lets the buyer review the farmer and updates the score', async () => {
        mockOrder.findById.mockResolvedValue({ _id: 'o1', status: 'released', buyer: 'buyer-1', seller: 'seller-1', product: 'p1' });
        const r = res();
        await controller.createReview({ user: BUYER, body: { orderId: 'o1', rating: 5, comment: 'Fast delivery' } }, r);

        expect(r.statusCode).toBe(201);
        expect(mockReview.create).toHaveBeenCalledWith(expect.objectContaining({
            order: 'o1', author: 'buyer-1', subject: 'seller-1', authorRole: 'buyer', context: 'escrow', rating: 5
        }));
        expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith('seller-1', expect.any(Array), { new: true });
    });

    test('will not let the same person review the same order twice', async () => {
        mockOrder.findById.mockResolvedValue({ _id: 'o1', status: 'released', buyer: 'buyer-1', seller: 'seller-1' });
        mockReview.findOne.mockResolvedValue({ _id: 'existing' });
        const r = res();
        await controller.createReview({ user: BUYER, body: { orderId: 'o1', rating: 4 } }, r);
        expect(r.statusCode).toBe(409);
        expect(mockReview.create).not.toHaveBeenCalled();
    });

    test('listing review needs a sale to a registered buyer', async () => {
        mockProduct.findById.mockResolvedValue({ _id: 'p1', seller: 'seller-1', sale: { soldAt: null, buyer: null } });
        const r = res();
        await controller.createReview({ user: SELLER, body: { productId: 'p1', rating: 5 } }, r);
        expect(r.statusCode).toBe(409);
    });

    test('lets the farmer review a registered buyer after marking sold', async () => {
        mockProduct.findById.mockResolvedValue({
            _id: 'p1', seller: 'seller-1', sale: { soldAt: new Date(), buyer: 'buyer-1' }
        });
        const r = res();
        await controller.createReview({ user: SELLER, body: { productId: 'p1', rating: 4 } }, r);
        expect(r.statusCode).toBe(201);
        expect(mockReview.create).toHaveBeenCalledWith(expect.objectContaining({
            context: 'listing', author: 'seller-1', subject: 'buyer-1', authorRole: 'seller'
        }));
    });
});

describe('listReviewsForUser', () => {
    test('returns the summary and reviews for a profile', async () => {
        mockUser.findById.mockReturnValue(selectChain({ _id: 'seller-1', name: 'Seller', role: 'farmer', rating: { average: 4.5, count: 2 } }));
        const query = {
            populate: jest.fn(() => query),
            sort: jest.fn(() => query),
            limit: jest.fn(() => Promise.resolve([{
                _id: 'r1', rating: 5, comment: 'Great', authorRole: 'buyer', context: 'escrow',
                author: { _id: 'buyer-1', name: 'Buyer' }, createdAt: new Date()
            }]))
        };
        mockReview.find.mockReturnValue(query);

        const r = res();
        await controller.listReviewsForUser({ params: { id: 'seller-1' } }, r);
        expect(r.statusCode).toBe(200);
        expect(r.body.data.summary.average).toBe(4.5);
        expect(r.body.data.reviews[0].rating).toBe(5);
    });
});

/**
 * Harvest Reservations — a buyer reserves a listing's next harvest and pays a
 * deposit into escrow, the farmer delivers, the balance is paid through
 * escrow. Models are stubbed so the suite runs on any CPU.
 */

const mockReservation = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn()
};
const mockProduct = { findById: jest.fn() };
const mockOrder = { create: jest.fn(), find: jest.fn() };
const mockUser = { findById: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());

jest.mock('../server/models/Reservation', () => mockReservation);
jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/models/Order', () => mockOrder);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));

const controller = require('../server/controllers/reservationController');

const BUYER = { _id: 'buyer-1', email: 'buyer@k.test', role: 'trader' };
const FARMER = { _id: 'farmer-1', email: 'farmer@k.test', role: 'farmer' };
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

const LISTING = {
    _id: 'prod-1', title: 'Ngowe Mangoes', description: 'Ripe mangoes from Kilifi',
    price: 100, unit: 'kg', seller: 'farmer-1', active: true, image: ''
};

function reservationDoc(overrides = {}) {
    return {
        _id: 'res-1', status: 'proposed', buyer: 'buyer-1', seller: 'farmer-1',
        listing: 'prod-1', quantity: 50, depositPercent: 20,
        depositAmount: 1000, balanceAmount: 4000, totalValue: 5000,
        item: { title: 'Ngowe Mangoes', unit: 'kg', unitPrice: 100, image: '' },
        timeline: [],
        record: jest.fn(function (action, opts) { this.timeline.push({ action, ...(opts || {}) }); return this; }),
        save: jest.fn(() => Promise.resolve()),
        ...overrides
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockReservation.findOne.mockResolvedValue(null);
    mockOrder.find.mockReturnValue(query([]));
});

describe('createReservation', () => {
    test('rejects a non-positive quantity', async () => {
        const r = res();
        await controller.createReservation({ params: { id: 'prod-1' }, user: BUYER, body: { quantity: 0 } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockReservation.create).not.toHaveBeenCalled();
    });

    test('refuses reserving your own listing', async () => {
        mockProduct.findById.mockResolvedValue(LISTING);
        const r = res();
        await controller.createReservation({ params: { id: 'prod-1' }, user: FARMER, body: { quantity: 10 } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockReservation.create).not.toHaveBeenCalled();
    });

    test('computes the deposit split and classifies the crop', async () => {
        mockProduct.findById.mockResolvedValue(LISTING);
        mockReservation.findOne.mockResolvedValue(null);
        mockReservation.create.mockImplementation((doc) => Promise.resolve({ status: 'proposed', _id: 'res-1', timeline: [], createdAt: new Date(), ...doc }));
        const r = res();
        await controller.createReservation({
            params: { id: 'prod-1' }, user: BUYER,
            body: { quantity: 50, depositPercent: 20 }
        }, r);
        expect(r.statusCode).toBe(201);
        expect(mockReservation.create).toHaveBeenCalledWith(expect.objectContaining({
            listing: 'prod-1', buyer: 'buyer-1', seller: 'farmer-1',
            cropKey: 'mango', quantity: 50, totalValue: 5000, depositAmount: 1000, balanceAmount: 4000
        }));
    });

    test('blocks a second active reservation on the same listing', async () => {
        mockProduct.findById.mockResolvedValue(LISTING);
        mockReservation.findOne.mockResolvedValue({ _id: 'res-old' });
        const r = res();
        await controller.createReservation({ params: { id: 'prod-1' }, user: BUYER, body: { quantity: 10 } }, r);
        expect(r.statusCode).toBe(409);
        expect(mockReservation.create).not.toHaveBeenCalled();
    });
});

describe('acceptReservation', () => {
    test('refuses a reservation that is not proposed', async () => {
        mockReservation.findOne.mockResolvedValue(reservationDoc({ status: 'reserved' }));
        const r = res();
        await controller.acceptReservation({ params: { id: 'res-1' }, user: FARMER }, r);
        expect(r.statusCode).toBe(409);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });

    test('opens a deposit escrow order and awaits payment', async () => {
        const reservation = reservationDoc();
        mockReservation.findOne.mockResolvedValue(reservation);
        mockOrder.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'ord-dep', reference: doc.reference }));

        const r = res();
        await controller.acceptReservation({ params: { id: 'res-1' }, user: FARMER }, r);

        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('awaiting_deposit');
        expect(reservation.depositOrder).toBe('ord-dep');
        expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
            reservation: 'res-1', purpose: 'deposit', buyer: 'buyer-1', seller: 'farmer-1',
            quantity: 1, total: 1000, status: 'awaiting_payment'
        }));
        expect(r.body.data.depositOrderId).toBe('ord-dep');
    });
});

describe('declineReservation', () => {
    test('cancels a proposed reservation', async () => {
        const reservation = reservationDoc();
        mockReservation.findOne.mockResolvedValue(reservation);
        const r = res();
        await controller.declineReservation({ params: { id: 'res-1' }, user: FARMER }, r);
        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('cancelled');
    });
});

describe('fulfilReservation', () => {
    test('refuses to deliver before the deposit is held', async () => {
        mockReservation.findOne.mockResolvedValue(reservationDoc({ status: 'awaiting_deposit' }));
        const r = res();
        await controller.fulfilReservation({ params: { id: 'res-1' }, user: FARMER }, r);
        expect(r.statusCode).toBe(409);
        expect(mockOrder.create).not.toHaveBeenCalled();
    });

    test('opens a balance escrow order once the deposit is held', async () => {
        const reservation = reservationDoc({ status: 'reserved' });
        mockReservation.findOne.mockResolvedValue(reservation);
        mockOrder.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'ord-bal', reference: doc.reference }));

        const r = res();
        await controller.fulfilReservation({ params: { id: 'res-1' }, user: FARMER }, r);

        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('fulfilled');
        expect(reservation.finalOrder).toBe('ord-bal');
        expect(mockOrder.create).toHaveBeenCalledWith(expect.objectContaining({
            reservation: 'res-1', purpose: 'balance', total: 4000, status: 'awaiting_payment'
        }));
    });
});

describe('cancelReservation', () => {
    test('refuses to cancel once a deposit is held', async () => {
        mockReservation.findOne.mockResolvedValue(reservationDoc({ status: 'reserved' }));
        const r = res();
        await controller.cancelReservation({ params: { id: 'res-1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(409);
    });

    test('cancels before any money is held', async () => {
        const reservation = reservationDoc({ status: 'awaiting_deposit' });
        mockReservation.findOne.mockResolvedValue(reservation);
        const r = res();
        await controller.cancelReservation({ params: { id: 'res-1' }, user: BUYER }, r);
        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('cancelled');
    });
});

describe('reconcile (lazy status sync)', () => {
    test('promotes awaiting_deposit to reserved when the deposit is paid', async () => {
        const reservation = reservationDoc({ status: 'awaiting_deposit', depositOrder: 'ord-dep' });
        mockReservation.find.mockReturnValue(query([reservation]));
        mockOrder.find.mockReturnValue(query([
            { reservation: 'res-1', purpose: 'deposit', status: 'paid_in_escrow', payment: { paidAt: new Date() } }
        ]));

        const r = res();
        await controller.listMyReservations({ query: { role: 'buyer' }, user: BUYER }, r);

        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('reserved');
        expect(reservation.record).toHaveBeenCalledWith('deposit_paid', expect.anything());
        expect(reservation.save).toHaveBeenCalled();
    });

    test('completes a fulfilled reservation when the balance order is released', async () => {
        const reservation = reservationDoc({ status: 'fulfilled', finalOrder: 'ord-bal' });
        mockReservation.find.mockReturnValue(query([reservation]));
        mockOrder.find.mockReturnValue(query([
            { reservation: 'res-1', purpose: 'balance', status: 'released', payment: {} }
        ]));

        const r = res();
        await controller.listMyReservations({ query: { role: 'buyer' }, user: BUYER }, r);

        expect(reservation.status).toBe('completed');
    });
});

describe('adminResolveReservation', () => {
    test('rejects an unknown outcome', async () => {
        const r = res();
        await controller.adminResolveReservation({ params: { id: 'res-1' }, user: ADMIN, body: { outcome: 'nonsense' } }, r);
        expect(r.statusCode).toBe(400);
    });

    test('refunds a stuck reservation', async () => {
        const reservation = reservationDoc({ status: 'reserved' });
        mockReservation.findById.mockResolvedValue(reservation);
        const r = res();
        await controller.adminResolveReservation({ params: { id: 'res-1' }, user: ADMIN, body: { outcome: 'refund', note: 'Farmer could not deliver.' } }, r);
        expect(r.statusCode).toBe(200);
        expect(reservation.status).toBe('refunded');
    });
});

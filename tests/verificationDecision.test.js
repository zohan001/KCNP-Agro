/**
 * Admin verification decisions — consistency between the FarmerVerification
 * record and the User.identityVerified flag.
 *
 * These tests stub the two models rather than using mongodb-memory-server, so
 * they run on any CPU (MongoDB 5+ needs AVX). The point is the failure
 * ordering: a half-applied decision must never be reported as a success.
 */

const mockFarmerVerification = {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(() => Promise.resolve(0))
};
const mockUser = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
};
const mockProduct = { updateMany: jest.fn() };
const mockLogAudit = jest.fn(() => Promise.resolve());
const mockNotifyAdmins = jest.fn(() => Promise.resolve());

jest.mock('../server/models/FarmerVerification', () => mockFarmerVerification);
jest.mock('../server/models/User', () => mockUser);
jest.mock('../server/models/Product', () => mockProduct);
jest.mock('../server/db/database', () => ({ logAudit: mockLogAudit }));
jest.mock('../server/services/notifications', () => ({ notifyAdmins: mockNotifyAdmins }));

const controller = require('../server/controllers/verificationController');

const ADMIN = { _id: 'admin-1', email: 'admin@kcnp.test', role: 'admin' };

/** Minimal stand-in for the record document the controller mutates. */
function makeRecord(overrides = {}) {
    const rec = {
        _id: 'verif-1',
        user: 'farmer-1',
        status: 'submitted',
        approvedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: '',
        revokedAt: null,
        revokedListingAction: '',
        listingsAffected: 0,
        timeline: [],
        record(action, meta) { this.timeline.push({ action, ...meta }); },
        save: jest.fn(() => Promise.resolve()),
        toObject() { return { ...this, timeline: [...this.timeline] }; },
        ...overrides
    };
    return rec;
}

/**
 * findById().select() — the controller awaits the .select() result directly,
 * so the chain has to be thenable as well as exposing .exec().
 */
function thenable(doc) {
    const p = Promise.resolve(doc);
    p.exec = () => Promise.resolve(doc);
    p.select = jest.fn(() => p);
    return p;
}

function findByIdResult(doc) {
    return { select: jest.fn(() => thenable(doc)) };
}

/** findByIdAndUpdate().select() chain. */
function findByIdAndUpdateResult(doc) {
    const q = Promise.resolve(doc);
    q.select = jest.fn(() => q);
    return q;
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
    mockLogAudit.mockReturnValue(Promise.resolve());
    mockNotifyAdmins.mockReturnValue(Promise.resolve());
    mockFarmerVerification.countDocuments.mockReturnValue(Promise.resolve(0));
    mockProduct.updateMany.mockReturnValue(Promise.resolve({ modifiedCount: 0 }));
});

describe('adminApprove', () => {
    test('unlocks the account and approves the record', async () => {
        // A stale reason from an earlier rejection must not survive approval.
        const rec = makeRecord({ rejectionReason: 'Previously rejected for a blurry photo.' });
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: false, identityVerifiedAt: null
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(200);
        expect(r.body.success).toBe(true);
        expect(rec.status).toBe('approved');
        expect(rec.rejectionReason).toBe('');
        expect(rec.save).toHaveBeenCalledTimes(1);
        const update = mockUser.findByIdAndUpdate.mock.calls[0][1].$set;
        expect(update.identityVerified).toBe(true);
        expect(update.identityVerifiedAt).toBeInstanceOf(Date);
    });

    test('re-running approval on an already approved record repairs a stale lock', async () => {
        const rec = makeRecord({ status: 'approved' });
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: false, identityVerifiedAt: null
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(200);
        const update = mockUser.findByIdAndUpdate.mock.calls[0][1].$set;
        expect(update.identityVerified).toBe(true);
    });

    test('reports a clear failure and changes nothing when the account cannot be unlocked', async () => {
        const rec = makeRecord();
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: false, identityVerifiedAt: null
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult(null));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(503);
        expect(r.body.success).toBe(false);
        expect(r.body.message).toMatch(/not applied/i);
        // The record must never claim an approval that did not happen.
        expect(rec.status).toBe('submitted');
        expect(rec.save).not.toHaveBeenCalled();
        expect(mockLogAudit).toHaveBeenCalledWith(
            'VERIFICATION_DECISION_FAILED', expect.stringContaining('NOT applied')
        );
    });

    test('reverts the flag when the record cannot be saved', async () => {
        const rec = makeRecord();
        rec.save = jest.fn(() => Promise.reject(new Error('disk full')));
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: false, identityVerifiedAt: null
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(500);
        expect(r.body.success).toBe(false);
        expect(r.body.message).toMatch(/rolled back/i);
        // Second write is the revert, back to the farmer's previous state.
        expect(mockUser.findByIdAndUpdate).toHaveBeenCalledTimes(2);
        const revert = mockUser.findByIdAndUpdate.mock.calls[1][1].$set;
        expect(revert.identityVerified).toBe(false);
        expect(revert.identityVerifiedAt).toBeNull();
    });

    test('refuses to approve a record whose account is gone', async () => {
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(makeRecord()));
        mockUser.findById.mockReturnValue(findByIdResult(null));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(404);
        expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('refuses to approve a non-farmer account', async () => {
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(makeRecord()));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'trader', identityVerified: false, identityVerifiedAt: null
        }));

        const r = res();
        await controller.adminApprove({ params: { id: 'verif-1' }, user: ADMIN }, r);

        expect(r.statusCode).toBe(409);
        expect(r.body.message).toMatch(/farmer/i);
        expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('404s on an unknown record', async () => {
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(null));
        const r = res();
        await controller.adminApprove({ params: { id: 'nope' }, user: ADMIN }, r);
        expect(r.statusCode).toBe(404);
    });
});

describe('adminReject', () => {
    test('locks the account again and stores the reason', async () => {
        const rec = makeRecord({ status: 'approved', approvedAt: new Date() });
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: true, identityVerifiedAt: new Date()
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));

        const r = res();
        await controller.adminReject(
            { params: { id: 'verif-1' }, user: ADMIN, body: { reason: 'The photo of your ID was too blurry to read.' } },
            r
        );

        expect(r.statusCode).toBe(200);
        expect(rec.status).toBe('rejected');
        expect(rec.approvedAt).toBeNull();
        expect(rec.rejectionReason).toMatch(/blurry/);
        const update = mockUser.findByIdAndUpdate.mock.calls[0][1].$set;
        expect(update.identityVerified).toBe(false);
        expect(update.identityVerifiedAt).toBeNull();
    });

    test('rejects a too-short reason before writing anything', async () => {
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(makeRecord()));
        const r = res();
        await controller.adminReject({ params: { id: 'verif-1' }, user: ADMIN, body: { reason: 'no' } }, r);
        expect(r.statusCode).toBe(400);
        expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('reverts to unlocked when the rejection record cannot be saved', async () => {
        const at = new Date('2026-01-01');
        const rec = makeRecord({ status: 'approved' });
        rec.save = jest.fn(() => Promise.reject(new Error('network')));
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: true, identityVerifiedAt: at
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));

        const r = res();
        await controller.adminReject(
            { params: { id: 'verif-1' }, user: ADMIN, body: { reason: 'The documents do not belong to you.' } },
            r
        );

        expect(r.statusCode).toBe(500);
        expect(mockUser.findByIdAndUpdate).toHaveBeenCalledTimes(2);
        const revert = mockUser.findByIdAndUpdate.mock.calls[1][1].$set;
        expect(revert.identityVerified).toBe(true);
        expect(revert.identityVerifiedAt).toEqual(at);
    });
});

describe('adminListVerifications', () => {
    function listResult(docs) {
        const resolved = Promise.resolve(docs);
        resolved.exec = () => Promise.resolve(docs);
        const limit = jest.fn(() => resolved);
        const sort = jest.fn(() => ({ limit }));
        const populate = jest.fn(() => ({ sort }));
        return { populate };
    }

    test('marks a record that says approved but the account is still locked', async () => {
        mockFarmerVerification.find.mockReturnValue(listResult([
            makeRecord({ status: 'approved', user: { role: 'farmer', identityVerified: false } })
        ]));

        const r = res();
        await controller.adminListVerifications({ query: {}, user: ADMIN }, r);

        expect(r.statusCode).toBe(200);
        const row = r.body.data.verifications[0];
        expect(row.needsRepair).toBe(true);
        expect(row.repairReason).toMatch(/still locked/i);
    });

    test('leaves a consistent record alone', async () => {
        mockFarmerVerification.find.mockReturnValue(listResult([
            makeRecord({ status: 'approved', user: { role: 'farmer', identityVerified: true } }),
            makeRecord({ status: 'submitted', user: { role: 'farmer', identityVerified: false } })
        ]));

        const r = res();
        await controller.adminListVerifications({ query: {}, user: ADMIN }, r);

        r.body.data.verifications.forEach((row) => {
            expect(row.needsRepair).toBe(false);
            expect(row.repairReason).toBeNull();
        });
    });

    test('flags a record whose account no longer exists', async () => {
        mockFarmerVerification.find.mockReturnValue(listResult([
            makeRecord({ status: 'submitted', user: null })
        ]));

        const r = res();
        await controller.adminListVerifications({ query: {}, user: ADMIN }, r);

        const row = r.body.data.verifications[0];
        expect(row.needsRepair).toBe(true);
        expect(row.repairReason).toMatch(/no longer exists/i);
    });
});
describe('adminRevoke', () => {
    /** Approved farmer, locked into place by an earlier approval. */
    function approvedSetup(overrides = {}) {
        const rec = makeRecord({
            status: 'approved',
            approvedAt: new Date(),
            ...overrides
        });
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));
        mockUser.findById.mockReturnValue(findByIdResult({
            _id: 'farmer-1', role: 'farmer', identityVerified: true, identityVerifiedAt: new Date()
        }));
        mockUser.findByIdAndUpdate.mockReturnValue(findByIdAndUpdateResult({ _id: 'farmer-1' }));
        return rec;
    }

    const goodReason = 'The ID number does not match the account name.';

    test('withdraws the approval and records why', async () => {
        const rec = approvedSetup();
        mockProduct.updateMany.mockReturnValue(Promise.resolve({ modifiedCount: 0 }));

        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' },
            user: ADMIN,
            body: { reason: goodReason, listingAction: 'keep' }
        }, r);

        expect(r.statusCode).toBe(200);
        expect(rec.status).toBe('revoked');
        expect(rec.revokedAt).toBeInstanceOf(Date);
        expect(rec.rejectionReason).toBe(goodReason);
        expect(rec.revokedListingAction).toBe('keep');
        expect(rec.approvedAt).toBeNull();

        // The farmer must lose listing access immediately.
        const update = mockUser.findByIdAndUpdate.mock.calls[0][1].$set;
        expect(update.identityVerified).toBe(false);
        expect(update.identityVerifiedAt).toBeNull();
    });

    test('takes down live listings only when the admin asks for it', async () => {
        approvedSetup();
        mockProduct.updateMany.mockReturnValue(Promise.resolve({ modifiedCount: 3 }));

        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: goodReason, listingAction: 'delist' }
        }, r);

        expect(r.statusCode).toBe(200);
        expect(r.body.data.listingsAffected).toBe(3);
        expect(mockProduct.updateMany).toHaveBeenCalledWith(
            { seller: 'farmer-1', active: true },
            { $set: { active: false } }
        );
        expect(r.body.message).toMatch(/3 live listing\(s\) were taken down/);
    });

    test('leaves listings untouched when the admin chooses to keep them', async () => {
        approvedSetup();
        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: goodReason, listingAction: 'keep' }
        }, r);

        expect(r.statusCode).toBe(200);
        expect(mockProduct.updateMany).not.toHaveBeenCalled();
        expect(r.body.message).toMatch(/stay visible/);
    });

    test('refuses to guess what to do with live listings', async () => {
        const rec = approvedSetup();
        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: goodReason }
        }, r);

        expect(r.statusCode).toBe(400);
        // Nothing may change if the admin has not made this choice.
        expect(rec.status).toBe('approved');
        expect(mockUser.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(mockProduct.updateMany).not.toHaveBeenCalled();
    });

    test('requires a reason the farmer can act on', async () => {
        const rec = approvedSetup();
        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: 'bad', listingAction: 'delist' }
        }, r);

        expect(r.statusCode).toBe(400);
        expect(rec.status).toBe('approved');
        expect(mockProduct.updateMany).not.toHaveBeenCalled();
    });

    test('will not revoke a record that is not approved', async () => {
        const rec = makeRecord({ status: 'rejected' });
        mockFarmerVerification.findById.mockReturnValue(Promise.resolve(rec));

        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: goodReason, listingAction: 'delist' }
        }, r);

        expect(r.statusCode).toBe(409);
        expect(mockProduct.updateMany).not.toHaveBeenCalled();
    });

    test('never touches escrow', async () => {
        // Escrow lives in its own service and reads no identity fields, so a
        // revocation must not be able to interfere with it at all.
        const escrowSource = require('fs').readFileSync(
            require('path').join(__dirname, '../server/services/escrow.js'), 'utf8');
        expect(escrowSource).not.toMatch(/identityVerified/);
    });

    test('still revokes the identity when delisting fails, and says so', async () => {
        approvedSetup();
        mockProduct.updateMany.mockReturnValue(Promise.reject(new Error('write concern error')));

        const r = res();
        await controller.adminRevoke({
            params: { id: 'verif-1' }, user: ADMIN,
            body: { reason: goodReason, listingAction: 'delist' }
        }, r);

        // Partial: the farmer is locked out, but their listings are still up,
        // so the admin has to be told rather than told it is all done.
        expect(r.statusCode).toBe(200);
        expect(r.body.data.delistFailed).toBe(true);
        expect(r.body.message).toMatch(/could NOT be taken down/i);
        expect(mockUser.findByIdAndUpdate.mock.calls[0][1].$set.identityVerified).toBe(false);
    });
});

describe('adminListVerifications', () => {
    test('never returns the identity images in the queue', async () => {
        const docs = [makeRecord({
            status: 'submitted',
            idFront: 'data:image/png;base64,AAAA',
            idBack: 'data:image/png;base64,BBBB',
            facePhoto: 'data:image/png;base64,CCCC',
            user: { name: 'Amina', email: 'a@b.test', role: 'farmer', identityVerified: false }
        })];
        const resolved = Promise.resolve(docs);
        resolved.exec = () => Promise.resolve(docs);
        const limit = jest.fn(() => resolved);
        const sort = jest.fn(() => ({ limit }));
        const populate = jest.fn(() => ({ sort }));
        mockFarmerVerification.find.mockReturnValue({ populate });
        mockFarmerVerification.countDocuments.mockReturnValue(Promise.resolve(1));

        const r = res();
        await controller.adminListVerifications({ query: {}, user: ADMIN }, r);

        const row = r.body.data.verifications[0];
        expect(row.idFront).toBeUndefined();
        expect(row.idBack).toBeUndefined();
        expect(row.facePhoto).toBeUndefined();
        expect(row.hasImages).toBe(true);
        expect(r.body.data.pending).toBe(1);
    });
});

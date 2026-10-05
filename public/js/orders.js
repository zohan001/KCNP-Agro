/**
 * Order tracking for buyers, sellers and admins.
 *
 * Mirrors the escrow state machine in server/services/escrow.js. The server
 * sends `actions` on every order, so this file never decides on its own what a
 * user is allowed to do — it only renders the buttons the server permits.
 */
(function () {
    'use strict';

    var MAX_EDGE = 900;
    var JPEG_QUALITY = 0.7;

    var state = {
        orders: [],
        filter: 'all',
        current: null
    };

    function $(id) { return document.getElementById(id); }

    function esc(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function money(value) {
        var n = Number(value);
        if (!isFinite(n)) return '—';
        return 'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function when(value) {
        if (!value) return '—';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
    }

    function statusTone(status) {
        switch (status) {
            case 'awaiting_payment': return 'bg-accent-500/10 text-accent-400 border-accent-500/25';
            case 'paid_in_escrow': return 'bg-primary-500/10 text-primary-300 border-primary-500/20';
            case 'dispatched': return 'bg-primary-500/10 text-primary-300 border-primary-500/20';
            case 'delivered': return 'bg-primary-500/10 text-primary-300 border-primary-500/20';
            case 'released': return 'bg-primary-500/10 text-primary-300 border-primary-500/20';
            case 'disputed': return 'bg-red-500/10 text-red-300 border-red-500/20';
            case 'cancelled': return 'bg-gray-600/10 text-gray-500 border-gray-300';
            case 'refunded': return 'bg-gray-600/10 text-gray-500 border-gray-300';
            default: return 'bg-gray-600/10 text-gray-500 border-gray-300';
        }
    }

    function readStoredUser() {
        try {
            var raw = localStorage.getItem('kcnp_user') || localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function setStatus(message, tone) {
        var el = $('orders-status');
        if (!el) return;
        var tones = {
            info: 'mb-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm',
            ok: 'mb-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm',
            err: 'mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm'
        };
        el.className = tones[tone] || tones.info;
        el.textContent = message;
        el.classList.remove('hidden');
    }

    async function api(url, body) {
        var res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            credentials: 'same-origin',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
        var data = {};
        try { data = await res.json(); } catch (e) { /* empty body */ }
        return { res: res, data: data };
    }

    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            if (!file) return reject(new Error('No file selected.'));
            if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
            if (file.size > 12 * 1024 * 1024) return reject(new Error('That photo is too large. Try a smaller one.'));
            var reader = new FileReader();
            reader.onerror = function () { reject(new Error('Could not read that file.')); };
            reader.onload = function () {
                var img = new Image();
                img.onerror = function () { reject(new Error('That file is not a readable image.')); };
                img.onload = function () {
                    try {
                        var longest = Math.max(img.width, img.height);
                        var scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
                        var canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(img.width * scale));
                        canvas.height = Math.max(1, Math.round(img.height * scale));
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
                    } catch (e) {
                        reject(new Error('Could not process that image.'));
                    }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /* ---------------- rendering ---------------- */

    function actionButtons(order) {
        var actions = Array.isArray(order.actions) ? order.actions : [];
        var html = '';
        actions.forEach(function (action) {
            switch (action) {
                case 'pay':
                    html += '<button type="button" class="px-5 py-2 rounded-lg bg-primary-500 text-white font-semibold" data-action="pay">Pay &amp; Hold in Escrow</button>';
                    break;
                case 'mark_dispatched':
                    html += '<button type="button" class="px-5 py-2 rounded-lg bg-primary-500 text-white font-semibold" data-action="dispatch">Record Dispatch</button>';
                    break;
                case 'confirm_received':
                    html += '<button type="button" class="px-5 py-2 rounded-lg bg-emerald-500 text-white font-semibold" data-action="confirm">Confirm Delivery</button>';
                    break;
                case 'dispute':
                    html += '<button type="button" class="px-5 py-2 rounded-lg border border-red-500/40 text-red-300 font-semibold" data-action="dispute">Raise a Dispute</button>';
                    break;
                case 'acknowledge_payout':
                    // Informational only: the server exposes this state but has
                    // no acknowledgement endpoint, so do not offer a button
                    // that could only ever fail.
                    html += '<span class="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-300 text-sm font-medium">Payout released to you</span>';
                    break;
                case 'admin_release':
                    html += '<button type="button" class="px-5 py-2 rounded-lg bg-primary-500 text-white font-semibold" data-action="admin-release">Release Funds</button>';
                    break;
                case 'resolve_dispute':
                    html += '<button type="button" class="px-5 py-2 rounded-lg bg-primary-500 text-white font-semibold" data-action="admin-resolve">Resolve Dispute</button>';
                    break;
            }
        });
        return html;
    }

    function cardHtml(order) {
        var actions = Array.isArray(order.actions) ? order.actions : [];
        var canOpen = actions.length > 0 || order.status;
        return '<article class="glass-card rounded-2xl border border-gray-200 p-5 sm:p-6">' +
            '<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">' +
                '<div class="min-w-0">' +
                    '<p class="text-xs text-gray-500 uppercase tracking-wide">Order</p>' +
                    '<h3 class="font-heading text-lg font-bold text-gray-900 break-all">' + esc(order.reference || order._id) + '</h3>' +
                '</div>' +
                '<span class="self-start px-3 py-1 rounded-full text-xs font-semibold border ' + statusTone(order.status) + '">' + esc(order.statusLabel || order.status) + '</span>' +
            '</div>' +
            '<dl class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">' +
                '<div class="min-w-0"><dt class="text-gray-500">Item</dt><dd class="text-gray-900 font-medium break-words">' + esc(order.item) + '</dd></div>' +
                '<div><dt class="text-gray-500">Quantity</dt><dd class="text-gray-900 font-medium">' + esc(order.quantity) + '</dd></div>' +
                '<div><dt class="text-gray-500">Total</dt><dd class="text-gray-900 font-medium">' + money(order.total) + '</dd></div>' +
            '</dl>' +
            '<div class="flex flex-wrap items-center gap-2">' +
                '<button type="button" class="px-4 py-2 rounded-lg border border-gray-300 text-gray-900 text-sm font-medium hover:bg-primary-50" data-open="' + esc(order._id) + '">View Details</button>' +
                '<span class="px-3 py-1 rounded-full text-xs bg-primary-500/10 text-primary-300 border border-primary-500/20">You are the ' + esc(order.yourRole) + '</span>' +
            '</div>' +
        '</article>';
    }

    function render() {
        var list = $('orders-list');
        var empty = $('orders-empty');
        if (!list) return;

        var shown = state.orders.filter(function (o) {
            if (state.filter === 'all') return true;
            if (state.filter === 'disputed') return o.status === 'disputed';
            return o.yourRole === state.filter;
        });

        if (!shown.length) {
            list.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');
        list.innerHTML = shown.map(cardHtml).join('');
    }

    function renderModal(order) {
        $('modal-ref').textContent = order.reference || order._id || '';
        $('modal-status').textContent = (order.statusLabel || order.status) + ' — you are the ' + order.yourRole;
        $('modal-item').textContent = order.item || '—';
        $('modal-qty').textContent = String(order.quantity);
        $('modal-total').textContent = money(order.total);
        $('modal-paid-at').textContent = when(order.payment && order.payment.paidAt);
        $('modal-payref').textContent = (order.payment && order.payment.reference) || '—';

        var delivery = order.delivery || {};
        $('modal-method').textContent = delivery.method || '—';
        $('modal-carrier').textContent = delivery.carrierName || delivery.trackingCode || '—';
        $('modal-dispatched').textContent = when(delivery.dispatchedAt);
        $('modal-delivered').textContent = when(delivery.deliveredAt || delivery.autoReleaseAt);

        var proof = $('modal-proof');
        if (proof) {
            if (delivery.proofPhoto) {
                proof.src = delivery.proofPhoto;
                proof.classList.remove('hidden');
            } else {
                proof.removeAttribute('src');
                proof.classList.add('hidden');
            }
        }

        // OTP continuation (Paystack)
        var needsOtp = Boolean(order.payment && order.payment.needsOtp);
        var otpWrap = $('modal-otp-wrap');
        if (otpWrap) {
            otpWrap.classList.toggle('hidden', !needsOtp);
            var otpRef = $('modal-otp-ref');
            if (otpRef) otpRef.value = (order.payment && order.payment.otpReference) || '';
        }

        var actions = Array.isArray(order.actions) ? order.actions : [];
        var actionsEl = $('modal-actions');
        if (actionsEl) actionsEl.innerHTML = actionButtons(order);

        // The server needs a phone number before it can push an M-Pesa prompt.
        var payWrap = $('modal-pay-wrap');
        if (payWrap) {
            var canPay = actions.indexOf('pay') !== -1;
            payWrap.classList.toggle('hidden', !canPay);
            if (canPay) {
                var phone = $('modal-pay-phone');
                if (phone && !phone.value) {
                    var saved = readStoredUser();
                    phone.value = (saved && (saved.phone || saved.phoneNumber)) || '';
                }
            }
        }

        var dispatchWrap = $('modal-dispatch-wrap');
        if (dispatchWrap) {
            dispatchWrap.classList.toggle('hidden', actions.indexOf('mark_dispatched') === -1);
            var carrier = $('modal-dispatch-carrier');
            if (carrier && !carrier.value) {
                var seller = readStoredUser();
                if (seller) carrier.value = seller.name || '';
            }
        }

        var confirmWrap = $('modal-confirm-wrap');
        if (confirmWrap) confirmWrap.classList.toggle('hidden', actions.indexOf('confirm_received') === -1);

        var disputeWrap = $('modal-dispute-wrap');
        if (disputeWrap) disputeWrap.classList.toggle('hidden', actions.indexOf('dispute') === -1);

        var timeline = $('modal-timeline');
        if (timeline) {
            var events = Array.isArray(order.timeline) ? order.timeline : [];
            timeline.innerHTML = events.length
                ? events.map(function (e) {
                    return '<li class="border-l-2 border-primary-500/40 pl-4">' +
                        '<p class="font-semibold text-gray-900">' + esc(e.action) + '</p>' +
                        '<p class="text-xs text-gray-500">' + when(e.at || e.createdAt) + '</p>' +
                        (e.note ? '<p class="text-sm text-gray-400 mt-1">' + esc(e.note) + '</p>' : '') +
                    '</li>';
                }).join('')
                : '<li class="text-sm text-gray-500">No events recorded yet.</li>';
        }
    }

    function openModal(id) {
        var order = state.orders.find(function (o) { return String(o._id) === String(id); });
        if (!order) return;
        state.current = order;
        renderModal(order);
        var modal = $('order-modal');
        if (modal) modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        var modal = $('order-modal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        state.current = null;
    }

    /* ---------------- actions ---------------- */

    async function refresh(message, tone) {
        var out;
        try {
            out = await api('/api/orders');
        } catch (e) {
            setStatus('Could not reach the server. Check your connection.', 'err');
            return;
        }
        if (out.res.status === 401) {
            window.location.href = '/login?next=/orders';
            return;
        }
        if (!out.data.success) {
            setStatus(out.data.message || 'Could not load your orders.', 'err');
            return;
        }
        state.orders = out.data.data || [];
        render();
        if (message) setStatus(message, tone || 'ok');
    }

    async function payOrder() {
        var order = state.current;
        if (!order) return;
        var phoneInput = $('modal-pay-phone');
        var phone = phoneInput ? phoneInput.value.trim() : '';
        if (phone.replace(/[^0-9]/g, '').length < 9) {
            setStatus('Enter the M-Pesa number you are paying from, e.g. 0712 345 678.', 'warn');
            if (phoneInput) phoneInput.focus();
            return;
        }
        var btn = $('modal-pay-btn');
        try {
            if (btn) btn.disabled = true;
            // The server never redirects: it pushes an M-Pesa prompt to this
            // number and answers with the updated order plus a message.
            var out = await api('/api/orders/' + order._id + '/pay', { phone: phone });
            if (!out.data.success) {
                setStatus(out.data.message || 'Payment could not be started.', 'err');
                return;
            }
            setStatus(out.data.message || 'Check your phone for the M-Pesa prompt.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error while starting payment.', 'err');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function submitOtp(e) {
        e.preventDefault();
        var order = state.current;
        var code = $('modal-otp');
        var msg = $('modal-otp-msg');
        if (!order) return;
        try {
            var out = await api('/api/orders/' + order._id + '/otp', {
                reference: $('modal-otp-ref').value,
                otp: code.value.trim()
            });
            if (!out.data.success) {
                if (msg) { msg.textContent = out.data.message || 'That OTP was not accepted.'; msg.classList.remove('hidden'); }
                return;
            }
            if (msg) msg.classList.add('hidden');
            setStatus('Payment confirmed. The money is now held in escrow.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (err) {
            if (msg) { msg.textContent = 'Network error. Please try again.'; msg.classList.remove('hidden'); }
        }
    }

    async function recordDispatch() {
        var order = state.current;
        if (!order) return;
        var btn = $('modal-dispatch-btn');
        var file = $('modal-dispatch-proof').files[0];
        try {
            var proofPhoto = '';
            if (file) {
                proofPhoto = await fileToDataUrl(file);
            }
            if (btn) btn.disabled = true;
            var expected = $('modal-dispatch-expected').value;
            var out = await api('/api/orders/' + order._id + '/dispatch', {
                method: 'courier',
                carrierName: $('modal-dispatch-carrier').value.trim(),
                trackingCode: $('modal-dispatch-tracking').value.trim(),
                expectedAt: expected ? new Date(expected).toISOString() : null,
                notes: $('modal-dispatch-notes').value.trim(),
                proofPhoto: proofPhoto
            });
            if (!out.data.success) {
                setStatus(out.data.message || 'Could not record the dispatch.', 'err');
                return;
            }
            setStatus(out.data.message || 'Dispatch recorded.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error while recording dispatch.', 'err');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function confirmDelivery() {
        var order = state.current;
        if (!order) return;
        var btn = $('modal-confirm-btn');
        try {
            var file = $('modal-confirm-proof').files[0];
            var proofPhoto = file ? await fileToDataUrl(file) : '';
            if (btn) btn.disabled = true;
            var out = await api('/api/orders/' + order._id + '/confirm', {
                receivedBy: $('modal-confirm-receivedby').value.trim(),
                receiverPhone: $('modal-confirm-phone').value.trim(),
                proofPhoto: proofPhoto
            });
            if (!out.data.success) {
                setStatus(out.data.message || 'Could not confirm delivery.', 'err');
                return;
            }
            setStatus(out.data.message || 'Delivery confirmed and funds released.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error while confirming delivery.', 'err');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function raiseDispute() {
        var order = state.current;
        if (!order) return;
        var reason = $('modal-dispute-reason').value.trim();
        if (reason.length < 10) {
            setStatus('Please explain what went wrong in a little more detail.', 'warn');
            return;
        }
        try {
            var out = await api('/api/orders/' + order._id + '/dispute', { reason: reason });
            if (!out.data.success) {
                setStatus(out.data.message || 'Could not raise the dispute.', 'err');
                return;
            }
            setStatus(out.data.message || 'Dispute raised. The money is frozen while an admin reviews it.', 'ok');
            $('modal-dispute-reason').value = '';
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error while raising the dispute.', 'err');
        }
    }

    async function adminRelease() {
        var order = state.current;
        if (!order) return;
        var reference = window.prompt('M-Pesa confirmation or payout reference:', order.reference);
        if (reference === null) return;
        try {
            var out = await api('/api/orders/' + order._id + '/release', {
                payoutReference: String(reference).trim()
            });
            if (!out.data.success) {
                setStatus(out.data.message || 'Could not release the funds.', 'err');
                return;
            }
            setStatus(out.data.message || 'Funds released.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error.', 'err');
        }
    }

    async function adminResolve() {
        var order = state.current;
        if (!order) return;
        var reason = window.prompt('How should this dispute be resolved? This is recorded in the audit log.');
        if (reason === null) return;
        if (String(reason).trim().length < 5) {
            setStatus('Write a short note explaining the decision.', 'warn');
            return;
        }
        var release = window.confirm('Release the money to the farmer?\n\nOK = release to farmer\nCancel = refund the buyer');
        try {
            var out = await api('/api/orders/' + order._id + '/resolve', {
                resolution: reason,
                outcome: release ? 'release' : 'refund'
            });
            if (!out.data.success) {
                setStatus(out.data.message || 'Could not resolve the dispute.', 'err');
                return;
            }
            setStatus(out.data.message || 'Dispute resolved.', 'ok');
            await refresh();
            var fresh = state.orders.find(function (o) { return String(o._id) === String(order._id); });
            if (fresh) { state.current = fresh; renderModal(fresh); }
        } catch (e) {
            setStatus('Network error.', 'err');
        }
    }

    function init() {
        document.querySelectorAll('[data-filter]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.filter = btn.getAttribute('data-filter');
                document.querySelectorAll('[data-filter]').forEach(function (b) {
                    var on = b === btn;
                    b.setAttribute('aria-pressed', on ? 'true' : 'false');
                    b.classList.toggle('bg-primary-500', on);
                    b.classList.toggle('text-white', on);
                    b.classList.toggle('bg-white', !on);
                    b.classList.toggle('border-gray-300', !on);
                    b.classList.toggle('text-gray-900', !on);
                });
                render();
            });
        });

        var list = $('orders-list');
        if (list) {
            list.addEventListener('click', function (e) {
                var open = e.target.closest('[data-open]');
                if (open) openModal(open.getAttribute('data-open'));
            });
        }

        var close = $('modal-close');
        if (close) close.addEventListener('click', closeModal);

        var modal = $('order-modal');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
        });

        var actionsEl = $('modal-actions');
        if (actionsEl) {
            actionsEl.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-action]');
                if (!btn) return;
                var action = btn.getAttribute('data-action');
                if (action === 'pay') payOrder();
                else if (action === 'dispatch') {
                    var wrap = $('modal-dispatch-wrap');
                    if (wrap) wrap.classList.remove('hidden');
                } else if (action === 'confirm') {
                    var cw = $('modal-confirm-wrap');
                    if (cw) cw.classList.remove('hidden');
                } else if (action === 'dispute') {
                    var dw = $('modal-dispute-wrap');
                    if (dw) dw.classList.remove('hidden');
                    var reason = $('modal-dispute-reason');
                    if (reason) reason.focus();
                } else if (action === 'acknowledge') { /* informational only */ }
                else if (action === 'admin-release') adminRelease();
                else if (action === 'admin-resolve') adminResolve();
            });
        }

        var otpForm = $('modal-otp-form');
        if (otpForm) otpForm.addEventListener('submit', submitOtp);

        var payBtn = $('modal-pay-btn');
        if (payBtn) payBtn.addEventListener('click', payOrder);

        var dispatchBtn = $('modal-dispatch-btn');
        if (dispatchBtn) dispatchBtn.addEventListener('click', recordDispatch);

        var confirmBtn = $('modal-confirm-btn');
        if (confirmBtn) confirmBtn.addEventListener('click', confirmDelivery);

        var disputeBtn = $('modal-dispute-btn');
        if (disputeBtn) disputeBtn.addEventListener('click', raiseDispute);

        refresh();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
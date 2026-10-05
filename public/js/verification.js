/**
 * Farmer identity verification.
 *
 * Privacy model: the ID front, ID back and face photo are downscaled to a
 * small JPEG in the browser and posted as JSON to a cookie-authenticated
 * endpoint. Nothing is written to localStorage and no image is ever put in a
 * URL, so the documents cannot end up in browser history or a server log.
 */
(function () {
    'use strict';

    var MAX_EDGE = 1000;      // longest edge after downscaling
    var JPEG_QUALITY = 0.72;  // keeps a full set comfortably under 1MB

    var state = {
        idFront: '',
        idBack: '',
        face: '',
        stream: null
    };

    function $(id) { return document.getElementById(id); }

    function setStatus(el, message, tone) {
        if (!el) return;
        var tones = {
            info: 'mb-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm',
            ok: 'mb-4 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm',
            warn: 'mb-4 p-4 rounded-xl bg-accent-500/10 border border-accent-500/25 text-accent-400 text-sm',
            err: 'mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm'
        };
        el.className = tones[tone] || tones.info;
        el.textContent = message;
        el.classList.remove('hidden');
    }

    async function api(url, options) {
        var opts = options || {};
        var res = await fetch(url, {
            method: opts.method || 'GET',
            credentials: 'same-origin',
            headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
            body: opts.body ? JSON.stringify(opts.body) : undefined
        });
        var data = {};
        try { data = await res.json(); } catch (e) { /* empty body */ }
        return { res: res, data: data };
    }

    /**
     * Read a File and shrink it to a data URL. Cameras and scanners hand us
     * multi-megabyte images; posting those raw would be rejected by the
     * server's size ceiling, and would be wasteful to store either way.
     */
    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            if (!file) return reject(new Error('No file selected.'));
            if (!/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
            if (file.size > 12 * 1024 * 1024) return reject(new Error('That photo is too large. Try again with a smaller one.'));

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
                        var ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
                    } catch (err) {
                        reject(new Error('Could not process that image.'));
                    }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function wireFile(inputId, previewId, key) {
        var input = $(inputId);
        var preview = $(previewId);
        if (!input) return;
        input.addEventListener('change', async function () {
            var file = input.files && input.files[0];
            if (!file) return;
            try {
                var url = await fileToDataUrl(file);
                state[key] = url;
                if (preview) {
                    preview.src = url;
                    preview.classList.remove('hidden');
                }
                updateGate();
            } catch (err) {
                state[key] = '';
                if (preview) preview.classList.add('hidden');
                updateGate(err.message);
            }
        });
    }

    function stopCamera() {
        if (state.stream) {
            state.stream.getTracks().forEach(function (t) { t.stop(); });
            state.stream = null;
        }
        var video = $('face-video');
        if (video) {
            video.srcObject = null;
            video.classList.add('hidden');
        }
        var capture = $('capture-face');
        if (capture) capture.classList.add('hidden');
        var start = $('start-camera');
        if (start) start.textContent = 'Start Camera';
    }

    function captureFrame() {
        var video = $('face-video');
        var canvas = $('face-canvas');
        if (!video || !canvas || !video.videoWidth) return false;
        var longest = Math.max(video.videoWidth, video.videoHeight);
        var scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        state.face = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        var preview = $('face-preview');
        if (preview) {
            preview.src = state.face;
            preview.classList.remove('hidden');
        }
        return true;
    }

    function updateGate(problem) {
        var gate = $('verify-gate');
        if (!gate) return;
        var missing = [];
        if (!state.idFront) missing.push('ID front');
        if (!state.idBack) missing.push('ID back');
        if (!state.face) missing.push('live face photo');

        if (problem) {
            gate.textContent = problem;
        } else if (missing.length) {
            gate.textContent = 'Still needed to save: ' + missing.join(', ') + '.';
        } else {
            gate.textContent = 'All three images are ready. Save them, then request an admin review.';
        }
        gate.classList.remove('hidden');
    }

    function paintStatus(v) {
        var pill = $('verify-status-pill');
        var labels = {
            draft: { text: 'Not submitted', cls: 'px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm' },
            submitted: { text: 'Awaiting review', cls: 'px-4 py-2 rounded-lg bg-accent-500/10 border border-accent-500/25 text-accent-400 text-sm' },
            under_review: { text: 'Under review', cls: 'px-4 py-2 rounded-lg bg-accent-500/10 border border-accent-500/25 text-accent-400 text-sm' },
            approved: { text: 'Verified', cls: 'px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm' },
            rejected: { text: 'Rejected', cls: 'px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm' },
            revoked: { text: 'Verification withdrawn', cls: 'px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm' }
        };
        var meta = labels[v && v.status] || labels.draft;
        if (pill) {
            pill.textContent = meta.text;
            pill.className = meta.cls;
        }

        var box = $('verify-status');
        if (!box) return;

        if (v && v.status === 'approved') {
            box.className = 'p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-sm';
            box.textContent = 'You are verified. You can list produce and request escrow payouts.';
        } else if (v && v.status === 'rejected') {
            box.className = 'p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm';
            box.textContent = 'An admin could not accept your documents: ' + (v.rejectionReason || 'please try again.') + ' You can upload fresh photos below.';
        } else if (v && v.status === 'revoked') {
            // A revocation withdraws an approval that was already granted, so
            // the wording differs from a rejection: it is not a bad upload, and
            // their existing listings may still be live.
            var listingNote = v.revokedListingAction === 'delist'
                ? ' Your live listings were taken down.'
                : ' Your existing listings stay visible for now, but you cannot create or edit any.';
            box.className = 'p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm';
            box.textContent = 'An admin has withdrawn your verification: '
                + (v.rejectionReason || 'please contact support.')
                + listingNote
                + ' You must submit new documents before you can list again. Payments for orders you have already been paid for are not affected.';
        } else if (v && v.status === 'submitted') {
            box.className = 'p-4 rounded-xl bg-accent-500/10 border border-accent-500/25 text-accent-400 text-sm';
            box.textContent = 'Your documents are with an admin. You will be able to list once they are approved.';
        } else {
            box.className = 'hidden';
            box.textContent = '';
        }
        box.classList.remove('hidden');
    }

    async function load() {
        var out;
        try {
            out = await api('/api/verification/me');
        } catch (e) {
            setStatus($('verify-status'), 'Could not reach the server. Check your connection and reload.', 'err');
            return;
        }
        if (out.res.status === 401) {
            window.location.href = '/login?next=/verification';
            return;
        }
        if (!out.data.success) {
            setStatus($('verify-status'), out.data.message || 'Could not load your verification.', 'err');
            return;
        }
        var v = out.data.data.verification;
        paintStatus(v);
        updateGate();

        // Repopulate previews so a farmer who returns does not start over.
        if (v && v.idFront) { state.idFront = v.idFront; var a = $('id-front-preview'); if (a) { a.src = v.idFront; a.classList.remove('hidden'); } }
        if (v && v.idBack) { state.idBack = v.idBack; var b = $('id-back-preview'); if (b) { b.src = v.idBack; b.classList.remove('hidden'); } }
        if (v && v.facePhoto) { state.face = v.facePhoto; var c = $('face-preview'); if (c) { c.src = v.facePhoto; c.classList.remove('hidden'); } }
        updateGate();

        // An approved record cannot be edited server-side, so hide the form.
        if (v && v.status === 'approved') {
            var save = $('save-verification');
            var review = $('request-review');
            if (save) save.disabled = true;
            if (review) review.disabled = true;
        }
    }

    async function save() {
        var btn = $('save-verification');
        var statusEl = $('verify-status');
        if (btn) btn.disabled = true;
        try {
            if (!state.idFront || !state.idBack || !state.face) {
                setStatus(statusEl, 'Please add your ID front, ID back and a live face photo first.', 'warn');
                updateGate();
                return;
            }
            var out = await api('/api/verification/save', {
                method: 'POST',
                body: {
                    idFront: state.idFront,
                    idBack: state.idBack,
                    facePhoto: state.face,
                    deviceInfo: navigator.userAgent.slice(0, 200)
                }
            });
            if (!out.data.success) {
                setStatus(statusEl, out.data.message || 'Could not save your documents.', 'err');
                return;
            }
            setStatus(statusEl, out.data.message || 'Saved privately.', 'ok');
            var gate = $('verify-gate');
            if (gate) gate.classList.add('hidden');
            await load();
        } catch (e) {
            setStatus(statusEl, 'Network error. Please try again.', 'err');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function requestReview() {
        var btn = $('request-review');
        var statusEl = $('verify-status');
        if (btn) btn.disabled = true;
        try {
            var out = await api('/api/verification/request-review', { method: 'POST', body: {} });
            if (!out.data.success) {
                setStatus(statusEl, out.data.message || 'Could not request a review.', 'err');
                return;
            }
            setStatus(statusEl, out.data.message || 'Sent for review.', 'ok');
            await load();
        } catch (e) {
            setStatus(statusEl, 'Network error. Please try again.', 'err');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function startCamera() {
        var statusEl = $('verify-status');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatus(statusEl, 'This browser cannot open the camera. Use a recent Chrome, Safari or Firefox.', 'warn');
            return;
        }
        try {
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
                audio: false
            });
            var video = $('face-video');
            if (video) {
                video.srcObject = state.stream;
                video.classList.remove('hidden');
                // Autoplay can still be blocked until the element is in view.
                var p = video.play();
                if (p && p.catch) p.catch(function () { });
            }
            var capture = $('capture-face');
            if (capture) capture.classList.remove('hidden');
            var start = $('start-camera');
            if (start) start.textContent = 'Stop Camera';
        } catch (err) {
            setStatus(statusEl, 'Camera permission was blocked. Allow camera access in your browser, then try again.', 'warn');
        }
    }

    function init() {
        wireFile('id-front', 'id-front-preview', 'idFront');
        wireFile('id-back', 'id-back-preview', 'idBack');

        var start = $('start-camera');
        if (start) {
            start.addEventListener('click', function () {
                if (state.stream) stopCamera(); else startCamera();
            });
        }

        var capture = $('capture-face');
        if (capture) {
            capture.addEventListener('click', function () {
                if (captureFrame()) updateGate();
            });
        }

        var save = $('save-verification');
        if (save) save.addEventListener('click', save);

        var review = $('request-review');
        if (review) review.addEventListener('click', requestReview);

        window.addEventListener('pagehide', stopCamera);
        window.addEventListener('beforeunload', stopCamera);

        load();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const { calculateModule } = require('./lib/calculators');

admin.initializeApp();
const db = admin.firestore();

const PROJECT_KEY = process.env.PROJECT_KEY || 'quanturion-calculator';
const ADMIN_INGEST_URL = process.env.ADMIN_INGEST_URL || '';
const ADMIN_SHARED_SECRET = process.env.ADMIN_SHARED_SECRET || '';
const DEFAULT_COUNTRY = process.env.DEFAULT_COUNTRY || 'IL';
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'ILS';

function validateBody(body) {
  if (!body || typeof body !== 'object') throw new Error('Ungültiger Request-Body.');
  if (!body.moduleKey) throw new Error('moduleKey fehlt.');
  if (!body.customer?.name) throw new Error('Name fehlt.');
  if (!body.customer?.phone) throw new Error('Telefon fehlt.');
  if (!body.consents?.privacyAccepted || !body.consents?.partnerTransferAccepted) {
    throw new Error('Pflicht-Einwilligungen fehlen.');
  }
}

function hmac(rawBody) {
  return crypto.createHmac('sha256', ADMIN_SHARED_SECRET).update(rawBody).digest('hex');
}

async function forwardToAdmin(payload) {
  if (!ADMIN_INGEST_URL || !ADMIN_SHARED_SECRET) {
    throw new Error('ADMIN_INGEST_URL oder ADMIN_SHARED_SECRET fehlt.');
  }
  const rawBody = JSON.stringify(payload);
  const response = await fetch(ADMIN_INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Project-Key': PROJECT_KEY,
      'X-Idempotency-Key': payload.origin.idempotencyKey,
      'X-Signature': hmac(rawBody),
    },
    body: rawBody,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Admin-Projekt hat den Lead nicht angenommen.');
  }
  return data;
}

exports.submitLead = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    validateBody(req.body);
    const idempotencyKey = req.body.idempotencyKey || crypto.randomUUID();
    const calculationResult = calculateModule(req.body.moduleKey, req.body.calculatorInput || {}, {
      taxRefundCap: process.env.TAX_REFUND_CAP,
      mortgageFallbackRate: process.env.MORTGAGE_FALLBACK_RATE,
      electricityBenchmarkIlsPerKwh: process.env.ELECTRICITY_BENCHMARK_ILS_PER_KWH,
      insuranceBaseMonthlyIls: process.env.INSURANCE_BASE_MONTHLY_ILS,
    });

    const backupRef = db.collection('leadBackups').doc();
    const basePayload = {
      projectKey: PROJECT_KEY,
      leadType: req.body.moduleKey,
      language: req.body.language || 'de',
      source: req.body.source || 'customer_app',
      country: DEFAULT_COUNTRY,
      currency: DEFAULT_CURRENCY,
      customer: req.body.customer,
      contactPreference: req.body.contactPreference || { phone: true, email: false, whatsapp: true },
      consents: req.body.consents,
      calculatorInput: req.body.calculatorInput || {},
      calculationResult,
      origin: {
        projectKey: PROJECT_KEY,
        idempotencyKey,
        submittedAt: new Date().toISOString(),
      },
    };

    await backupRef.set({
      ...basePayload,
      status: 'pending_forward',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastError: null,
    });

    let adminResponse;
    try {
      adminResponse = await forwardToAdmin(basePayload);
      await backupRef.update({
        status: 'forwarded',
        forwardedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminLeadId: adminResponse.leadId || null,
        lastError: null,
      });
    } catch (error) {
      await backupRef.update({
        status: 'failed',
        lastError: error.message,
        lastTriedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      throw error;
    }

    res.status(200).json({ ok: true, leadId: adminResponse.leadId, backupId: backupRef.id, calculationResult });
  } catch (error) {
    logger.error(error);
    res.status(400).json({ ok: false, error: error.message || 'Lead konnte nicht verarbeitet werden.' });
  }
});

exports.retryFailedForwards = onSchedule({ schedule: 'every 15 minutes', region: 'us-central1' }, async () => {
  const snapshot = await db.collection('leadBackups').where('status', '==', 'failed').limit(20).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    try {
      const adminResponse = await forwardToAdmin(data);
      await doc.ref.update({
        status: 'forwarded',
        forwardedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminLeadId: adminResponse.leadId || null,
        lastError: null,
      });
    } catch (error) {
      await doc.ref.update({
        lastError: error.message,
        lastTriedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
});

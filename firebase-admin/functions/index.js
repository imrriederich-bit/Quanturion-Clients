
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

admin.initializeApp();
const db = admin.firestore();

function getSharedSecret(projectKey) {
  const envKey = `INGEST_SHARED_SECRET_${String(projectKey || '').toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  return process.env[envKey];
}

function verifySignature(req, rawBody) {
  const projectKey = req.get('X-Project-Key');
  const signature = req.get('X-Signature');
  const secret = getSharedSecret(projectKey);
  if (!projectKey || !signature || !secret) {
    throw new Error('Ungültige Projekt-Authentifizierung.');
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (expected !== signature) {
    throw new Error('INVALID_SIGNATURE');
  }
  return { projectKey };
}

function transporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function toReachabilityLabel(value, language) {
  const map = {
    de: { morning: 'Morgens', midday: 'Mittags', evening: 'Abends' },
    en: { morning: 'Morning', midday: 'Midday', evening: 'Evening' },
    he: { morning: 'בבוקר', midday: 'בצהריים', evening: 'בערב' },
  };
  return (map[language] || map.de)[value] || value || '-';
}

function buildCustomerMessage(language = 'de') {
  const texts = {
    de: {
      subject: 'Ihre Anfrage bei Quanturion ist eingegangen',
      body: 'Vielen Dank für Ihre Anfrage bei Quanturion. Ihre Anfrage ist eingegangen und wird an einen geeigneten Partner zur weiteren Prüfung und Bearbeitung weitergeleitet.',
    },
    en: {
      subject: 'Your request to Quanturion has been received',
      body: 'Thank you for your request to Quanturion. Your request has been received and will be forwarded to a suitable partner for further review and processing.',
    },
    he: {
      subject: 'הבקשה שלך ב-Quanturion התקבלה',
      body: 'תודה על פנייתך ל-Quanturion. בקשתך התקבלה ותועבר לשותף מתאים להמשך בדיקה וטיפול.',
    },
  };
  return texts[language] || texts.de;
}

function buildSupportEmail(lead) {
  return {
    subject: `Neue Lead-Anfrage – ${lead.leadType}`,
    text: [
      'Neue Lead-Anfrage eingegangen',
      '',
      `Projekt: ${lead.origin.projectKey}`,
      `Modul: ${lead.leadType}`,
      `Name: ${lead.customer.name || '-'}`,
      `Ort: ${lead.customer.city || '-'}`,
      `Telefon: ${lead.customer.phone || '-'}`,
      `E-Mail: ${lead.customer.email || '-'}`,
      `Erreichbarkeit: ${toReachabilityLabel(lead.customer.reachability, lead.language)}`,
      `ID: ${lead.customer.idNumber || '-'}`,
      `Sprache: ${lead.language}`,
      `Ergebnis: ${lead.calculationResult.displayText || '-'}`,
      '',
      'Input:',
      JSON.stringify(lead.calculatorInput, null, 2),
    ].join('\n'),
  };
}

function buildSupportWhatsAppText(lead) {
  return [
    'Neue Lead-Anfrage eingegangen',
    `Projekt: ${lead.origin.projectKey}`,
    `Modul: ${lead.leadType}`,
    `Name: ${lead.customer.name || '-'}`,
    `Ort: ${lead.customer.city || '-'}`,
    `Telefon: ${lead.customer.phone || '-'}`,
    `E-Mail: ${lead.customer.email || '-'}`,
    `Erreichbarkeit: ${toReachabilityLabel(lead.customer.reachability, lead.language)}`,
    `Ergebnis: ${lead.calculationResult.displayText || '-'}`,
  ].join('\n');
}

async function sendEmail({ to, subject, text }) {
  const mailer = transporter();
  if (!mailer || !to) return false;
  await mailer.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, text });
  return true;
}

async function sendWhatsAppTemplate({ to, language = 'de', templateName, components = [] }) {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID || !to || !templateName) return false;
  const response = await fetch(`https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language === 'he' ? 'he' : language },
        components,
      },
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`WhatsApp template send failed: ${err}`);
  }
  return true;
}

exports.ingestLeadFromProject = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  try {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const { projectKey } = verifySignature(req, rawBody);
    const payload = req.body || {};
    const idempotencyKey = req.get('X-Idempotency-Key') || payload.origin?.idempotencyKey;
    if (!idempotencyKey) throw new Error('Idempotency key fehlt.');

    const idemRef = db.collection('idempotencyKeys').doc(idempotencyKey);
    const leadRef = db.collection('leads').doc();
    let existingLeadId = null;

    await db.runTransaction(async (tx) => {
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) {
        existingLeadId = idemSnap.data().leadId;
        return;
      }
      const leadDoc = {
        origin: {
          projectKey,
          source: payload.source || 'customer_app',
          idempotencyKey,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        leadType: payload.leadType,
        language: payload.language || 'de',
        status: 'new',
        customer: payload.customer || {},
        contactPreference: payload.contactPreference || { phone: true, email: false, whatsapp: true },
        consents: payload.consents || {},
        calculatorInput: payload.calculatorInput || {},
        calculationResult: payload.calculationResult || {},
        notifications: {
          supportEmailSent: false,
          supportWhatsAppSent: false,
          customerEmailSent: false,
          customerWhatsAppSent: false,
        },
        meta: {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      };
      tx.set(leadRef, leadDoc);
      tx.set(idemRef, { leadId: leadRef.id, projectKey, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    const targetLeadId = existingLeadId || leadRef.id;
    const targetLeadRef = db.collection('leads').doc(targetLeadId);
    const leadSnap = await targetLeadRef.get();
    const lead = { id: targetLeadId, ...leadSnap.data() };

    if (!existingLeadId) {
      await db.collection('leadEvents').add({ leadId: targetLeadId, type: 'created', createdAt: admin.firestore.FieldValue.serverTimestamp(), payload: { projectKey } });

      const supportMail = buildSupportEmail(lead);
      const updates = {};
      try {
        const sent = await sendEmail({ to: process.env.SUPPORT_EMAIL, ...supportMail });
        updates['notifications.supportEmailSent'] = Boolean(sent);
      } catch (error) {
        logger.error('supportEmail', error);
        updates['notifications.supportEmailSent'] = false;
      }

      try {
        const sent = await sendWhatsAppTemplate({
          to: process.env.SUPPORT_WHATSAPP,
          language: 'de',
          templateName: process.env.WHATSAPP_SUPPORT_TEMPLATE,
          components: [{ type: 'body', parameters: [{ type: 'text', text: buildSupportWhatsAppText(lead).slice(0, 1000) }] }],
        });
        updates['notifications.supportWhatsAppSent'] = Boolean(sent);
      } catch (error) {
        logger.error('supportWhatsApp', error);
        updates['notifications.supportWhatsAppSent'] = false;
      }

      if (lead.customer.email && lead.contactPreference?.email) {
        try {
          const customerMsg = buildCustomerMessage(lead.language);
          const sent = await sendEmail({ to: lead.customer.email, subject: customerMsg.subject, text: customerMsg.body });
          updates['notifications.customerEmailSent'] = Boolean(sent);
        } catch (error) {
          logger.error('customerEmail', error);
          updates['notifications.customerEmailSent'] = false;
        }
      }

      if (lead.customer.phone && lead.contactPreference?.whatsapp) {
        try {
          const lang = lead.language || 'de';
          const templateName = process.env[`WHATSAPP_TEMPLATE_${String(lang).toUpperCase()}`];
          const sent = await sendWhatsAppTemplate({ to: lead.customer.phone.replace(/\+/g, ''), language: lang, templateName });
          updates['notifications.customerWhatsAppSent'] = Boolean(sent);
        } catch (error) {
          logger.error('customerWhatsApp', error);
          updates['notifications.customerWhatsAppSent'] = false;
        }
      }

      updates['meta.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
      await targetLeadRef.update(updates);
      await db.collection('leadEvents').add({ leadId: targetLeadId, type: 'notifications_processed', createdAt: admin.firestore.FieldValue.serverTimestamp(), payload: updates });
    }

    res.status(200).json({ ok: true, leadId: targetLeadId, status: existingLeadId ? 'already_exists' : 'stored' });
  } catch (error) {
    logger.error(error);
    res.status(400).json({ ok: false, error: error.message || 'Lead konnte nicht verarbeitet werden.' });
  }
});

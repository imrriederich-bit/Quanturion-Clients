#!/usr/bin/env node
const admin = require('firebase-admin');

if (process.argv.length < 4) {
  console.error('Usage: node setAdminClaim.js <serviceAccount.json> <uid>');
  process.exit(1);
}

const serviceAccountPath = process.argv[2];
const uid = process.argv[3];
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Admin claim gesetzt für UID ${uid}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

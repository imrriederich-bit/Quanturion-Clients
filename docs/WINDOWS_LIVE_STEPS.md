# Windows Live Steps

## Wichtig
Nicht `firebase init` im ZIP-Hauptordner ausführen.
Arbeite getrennt in:
- `firebase-admin`
- `firebase-customer`

## 1. Admin-Projekt deployen
```powershell
cd firebase-admin
Copy-Item .firebaserc.example .firebaserc
cd functions
npm install
Copy-Item .env.example .env.quanturion-admin
cd ..
firebase use quanturion-admin
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

## 2. Customer-Projekt deployen
```powershell
cd ..\firebase-customer
Copy-Item .firebaserc.example .firebaserc
cd functions
npm install
Copy-Item .env.example .env.quanturion-calculator
cd ..
firebase use quanturion-calculator
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

## 3. Expo App
```powershell
cd ..\customer-app
Copy-Item .env.example .env
npm install
npx expo start
```

## 4. URLs eintragen
- `customer-app/.env` -> `EXPO_PUBLIC_CUSTOMER_FUNCTION_URL`
- `firebase-customer/functions/.env.quanturion-calculator` -> `ADMIN_INGEST_URL`
```

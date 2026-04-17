# Deployment Checklist

## 1. Kundenprojekt
- Firestore aktivieren
- `firebase-customer/firestore.rules` deployen
- `firebase-customer/storage.rules` deployen
- Functions deployen
- `customer-app/.env` mit `EXPO_PUBLIC_CUSTOMER_FUNCTION_URL` füllen
- Expo/EAS Build ausführen

## 2. Adminprojekt
- Firestore aktivieren
- Authentication aktivieren
- Admin-User anmelden lassen
- Custom Claim `admin=true` setzen
- `firebase-admin/firestore.rules` deployen
- `firebase-admin/storage.rules` deployen
- Functions deployen
- SMTP testen
- WhatsApp Templates bei Meta freigeben

## 3. Live-Tests
- Testlead aus jedem Modul senden
- prüfen: `leadBackups` im Kundenprojekt
- prüfen: `leads` im Adminprojekt
- prüfen: interne E-Mail
- prüfen: Kunden-E-Mail
- prüfen: interne WhatsApp
- prüfen: Kunden-WhatsApp
- prüfen: Admin-Web/Admin-App Leserechte

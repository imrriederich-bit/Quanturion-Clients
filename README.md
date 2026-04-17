# Quanturion Business Live Package

Dieses Paket trennt bewusst **Kundenprojekt** (`quanturion-calculator`) und **Adminprojekt** (`quanturion-admin`).

Enthalten:
- `customer-app/` – Expo Kunden-App mit 4 Rechnern, 3 Sprachen und Lead-Formular
- `firebase-customer/` – Cloud Functions + Regeln für das Kundenprojekt
- `firebase-admin/` – Cloud Functions + Regeln für das Adminprojekt
- `docs/` – Setup-, Deploy- und Live-Checklisten
- `scripts/` – Hilfsskripte, u. a. für Admin Claims

## Live-Fertig bedeutet hier
Der komplette Code, die Datenflüsse und die Firebase-Regeln sind vorbereitet. Für echten Produktivbetrieb musst du noch folgende **externen Zugangsdaten** eintragen:
1. SMTP oder Mail-API Zugang
2. WhatsApp Business Cloud API Zugang
3. finale Domains / HTTPS Function URLs
4. Admin-UID(s) für Custom Claims

## Struktur

### Kundenprojekt `quanturion-calculator`
- App sammelt und validiert Eingaben
- App ruft `submitLead` im Kundenprojekt auf
- Function speichert Backup in `leadBackups`
- Function signiert und sendet den Lead an `ingestLeadFromProject` im Adminprojekt

### Adminprojekt `quanturion-admin`
- Function `ingestLeadFromProject` prüft Signatur + Idempotenz
- speichert Lead zentral in `leads`
- versendet interne E-Mail / WhatsApp
- versendet Kundenbestätigung per E-Mail / WhatsApp, wenn erlaubt

## Deployment-Reihenfolge
1. `firebase-admin` deployen
2. `.env` im Kundenprojekt mit Admin-Endpoint + Shared Secret füllen
3. `firebase-customer` deployen
4. `customer-app` auf die Customer Function URL zeigen lassen

Siehe `docs/DEPLOYMENT_CHECKLIST.md` und `docs/ENVIRONMENT.md`.

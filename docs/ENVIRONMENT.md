# Umgebungsvariablen

## customer-app /.env
```env
EXPO_PUBLIC_CUSTOMER_FUNCTION_URL=https://<region>-<project>.cloudfunctions.net/submitLead
EXPO_PUBLIC_SUPPORT_WHATSAPP=972559546995
```

## firebase-customer/functions/.env.quanturion-calculator
```env
ADMIN_INGEST_URL=https://<region>-<project>.cloudfunctions.net/ingestLeadFromProject
ADMIN_SHARED_SECRET=<same-secret-as-admin>
PROJECT_KEY=quanturion-calculator
DEFAULT_COUNTRY=IL
DEFAULT_CURRENCY=ILS
TAX_REFUND_CAP=35000
MORTGAGE_FALLBACK_RATE=4.8
ELECTRICITY_BENCHMARK_ILS_PER_KWH=0.52
INSURANCE_BASE_MONTHLY_ILS=420
```

## firebase-admin/functions/.env.quanturion-admin
```env
INGEST_SHARED_SECRET_QUANTURION_CALCULATOR=<same-secret-as-customer>
SUPPORT_EMAIL=quanturion.yavne@gmail.com
SUPPORT_WHATSAPP=972559546995
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-pass-or-app-password>
EMAIL_FROM=Quanturion <quanturion.yavne@gmail.com>
META_ACCESS_TOKEN=<meta-cloud-api-token>
META_PHONE_NUMBER_ID=<whatsapp-phone-number-id>
WHATSAPP_TEMPLATE_DE=lead_received_de
WHATSAPP_TEMPLATE_EN=lead_received_en
WHATSAPP_TEMPLATE_HE=lead_received_he
WHATSAPP_SUPPORT_TEMPLATE=internal_new_lead
ADMIN_BASE_URL=https://<your-admin-domain>
```

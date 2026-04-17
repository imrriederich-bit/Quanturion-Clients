
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Localization from 'expo-localization';
import { translations } from './src/translations';
import { MODULES } from './src/modules';
import { calculateModule } from './src/calculators';
import { loadLocalState, saveLocalState } from './src/storage';
import { submitLead } from './src/api';

const colors = {
  bg: '#0B1220',
  panel: '#121A2B',
  panel2: '#192335',
  text: '#F8FAFC',
  muted: '#A7B2C3',
  line: '#2D3A52',
  accent: '#2563EB',
  accent2: '#1D4ED8',
  success: '#16A34A',
  danger: '#EF4444',
};

const initialLead = {
  name: '',
  city: '',
  phone: '',
  reachability: 'morning',
  idNumber: '',
  email: '',
  contactPreference: { phone: true, email: false, whatsapp: true },
  privacyAccepted: false,
  partnerTransferAccepted: false,
};

const initialByModule = {
  tax: { salaryMode: 'gross', salaryAmount: '', maritalStatus: 'single', children: '', multipleEmployers: false, reserveDuty: false, donations: false, lastRefundWindow: '1_2' },
  mortgage: { loanAmount: '', yearsLeft: '', rateType: 'fixed', currentRate: '', currentBank: '', propertyValue: '' },
  electricity: { kwh: '', monthlyBill: '', provider: '', hasSmartMeter: false },
  insurance: { age: '', licenseYears: '', vehicleType: 'family', claimsLast3Years: '', driverCircle: 'familyCircle', city: '', annualKm: '', coverage: 'plus', currentPremium: '' },
};

const langMap = { de: 'de', en: 'en', he: 'he', iw: 'he' };

export default function App() {
  const deviceLang = langMap[Localization.getLocales?.()[0]?.languageCode] || 'de';
  const [language, setLanguage] = useState(deviceLang);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleInputs, setModuleInputs] = useState(initialByModule);
  const [lead, setLead] = useState(initialLead);
  const [submitting, setSubmitting] = useState(false);

  const t = useMemo(() => translations[language] || translations.de, [language]);
  const isRTL = language === 'he';

  useEffect(() => {
    loadLocalState().then((state) => {
      if (!state) return;
      if (state.language) setLanguage(state.language);
      if (state.moduleInputs) setModuleInputs((prev) => ({ ...prev, ...state.moduleInputs }));
      if (state.lead) setLead((prev) => ({ ...prev, ...state.lead }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    saveLocalState({ language, moduleInputs, lead }).catch(() => {});
  }, [language, moduleInputs, lead]);

  const result = useMemo(() => selectedModule ? calculateModule(selectedModule.key, moduleInputs[selectedModule.key]) : null, [selectedModule, moduleInputs]);

  const currentForm = selectedModule ? moduleInputs[selectedModule.key] : null;

  function updateField(key, value) {
    if (!selectedModule) return;
    setModuleInputs((prev) => ({
      ...prev,
      [selectedModule.key]: { ...prev[selectedModule.key], [key]: value },
    }));
  }

  function validateLead() {
    if (!lead.name.trim()) return t.validationName;
    if (!lead.phone.trim()) return t.validationPhone;
    if (!lead.privacyAccepted || !lead.partnerTransferAccepted) return t.validationConsent;
    const hasChannel = lead.contactPreference.phone || lead.contactPreference.email || lead.contactPreference.whatsapp;
    if (!hasChannel) return t.validationContactPreference;
    return null;
  }

  async function handleSubmit() {
    const validationError = validateLead();
    if (validationError) {
      Alert.alert('Hinweis', validationError);
      return;
    }
    if (!selectedModule) return;
    try {
      setSubmitting(true);
      const payload = {
        moduleKey: selectedModule.key,
        language,
        source: 'customer_app',
        customer: {
          name: lead.name.trim(),
          city: lead.city.trim(),
          phone: lead.phone.trim(),
          reachability: lead.reachability,
          idNumber: lead.idNumber.trim(),
          email: lead.email.trim(),
        },
        contactPreference: { ...lead.contactPreference },
        consents: {
          privacyAccepted: lead.privacyAccepted,
          partnerTransferAccepted: lead.partnerTransferAccepted,
        },
        calculatorInput: currentForm,
      };
      await submitLead(payload);
      Alert.alert(t.successTitle, t.successBody);
      setLead(initialLead);
      setSelectedModule(null);
    } catch (error) {
      Alert.alert('Fehler', error?.message || 'Lead konnte nicht gesendet werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.brand, align(isRTL)]}>{t.appTitle}</Text>
          <Text style={[styles.h1, align(isRTL)]}>{t.appIntroTitle}</Text>
          <Text style={[styles.body, align(isRTL)]}>{t.appIntroBody}</Text>
          <View style={styles.langRow}>
            {['de', 'en', 'he'].map((lang) => (
              <Pressable key={lang} onPress={() => setLanguage(lang)} style={[styles.langChip, language === lang && styles.langChipActive]}>
                <Text style={styles.langChipText}>{lang.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!selectedModule && (
          <View style={styles.grid}>
            {MODULES.map((module) => (
              <Pressable key={module.key} style={styles.card} onPress={() => setSelectedModule(module)}>
                <Text style={[styles.cardTitle, align(isRTL)]}>{t[module.titleKey]}</Text>
                <Text style={[styles.cardBody, align(isRTL)]}>{t[module.descKey]}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {selectedModule && (
          <>
            <Pressable style={styles.backButton} onPress={() => setSelectedModule(null)}>
              <Text style={styles.backButtonText}>{t.back}</Text>
            </Pressable>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, align(isRTL)]}>{t[selectedModule.titleKey]}</Text>
              <Text style={[styles.cardBody, align(isRTL)]}>{t[selectedModule.descKey]}</Text>
              <View style={styles.formBlock}>
                {selectedModule.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    t={t}
                    value={currentForm[field.key]}
                    onChange={updateField}
                    isRTL={isRTL}
                  />
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, align(isRTL)]}>{t.summaryTitle}</Text>
              {selectedModule.key === 'tax' ? (
                <Metric label={t.potentialRefund} value={result.displayText} isRTL={isRTL} />
              ) : (
                <>
                  <Metric label={t.monthlySavings} value={formatIls(result.monthlyPotential)} isRTL={isRTL} />
                  <Metric label={t.yearlySavings} value={formatIls(result.annualPotential)} isRTL={isRTL} />
                  <Metric label={t.totalSavings} value={formatIls(result.totalPotential)} isRTL={isRTL} />
                </>
              )}
              <Text style={[styles.disclaimer, align(isRTL)]}>{t.disclaimer}</Text>
            </View>

            <View style={styles.card}>
              <Text style={[styles.cardTitle, align(isRTL)]}>{t.sendRequest}</Text>
              <Input label={t.leadFormName} value={lead.name} onChangeText={(v) => setLead((p) => ({ ...p, name: v }))} isRTL={isRTL} />
              <Input label={t.leadFormCity} value={lead.city} onChangeText={(v) => setLead((p) => ({ ...p, city: v }))} isRTL={isRTL} />
              <Input label={t.leadFormPhone} value={lead.phone} onChangeText={(v) => setLead((p) => ({ ...p, phone: v }))} isRTL={isRTL} keyboardType="phone-pad" />
              <Select label={t.leadFormReachability} value={lead.reachability} options={[['morning', t.reachMorning], ['midday', t.reachMidday], ['evening', t.reachEvening]]} onChange={(v) => setLead((p) => ({ ...p, reachability: v }))} isRTL={isRTL} />
              <Input label={t.leadFormIdNumber} value={lead.idNumber} onChangeText={(v) => setLead((p) => ({ ...p, idNumber: v }))} isRTL={isRTL} keyboardType="number-pad" />
              <Input label={t.leadFormEmail} value={lead.email} onChangeText={(v) => setLead((p) => ({ ...p, email: v }))} isRTL={isRTL} keyboardType="email-address" />

              <Text style={[styles.subheading, align(isRTL)]}>{t.contactPreferenceTitle}</Text>
              <Toggle label={t.contactPhone} value={lead.contactPreference.phone} onChange={(v) => setLead((p) => ({ ...p, contactPreference: { ...p.contactPreference, phone: v } }))} isRTL={isRTL} />
              <Toggle label={t.contactEmail} value={lead.contactPreference.email} onChange={(v) => setLead((p) => ({ ...p, contactPreference: { ...p.contactPreference, email: v } }))} isRTL={isRTL} disabled={!lead.email.trim()} />
              <Toggle label={t.contactWhatsApp} value={lead.contactPreference.whatsapp} onChange={(v) => setLead((p) => ({ ...p, contactPreference: { ...p.contactPreference, whatsapp: v } }))} isRTL={isRTL} />

              <Toggle label={t.privacyConsent} value={lead.privacyAccepted} onChange={(v) => setLead((p) => ({ ...p, privacyAccepted: v }))} isRTL={isRTL} multiline />
              <Toggle label={t.partnerConsent} value={lead.partnerTransferAccepted} onChange={(v) => setLead((p) => ({ ...p, partnerTransferAccepted: v }))} isRTL={isRTL} multiline />

              <Text style={[styles.legal, align(isRTL)]}>{t.legal}</Text>

              <Pressable style={[styles.submit, submitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={submitting}>
                <Text style={styles.submitText}>{submitting ? t.calculating : t.sendRequest}</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function align(isRTL) { return { textAlign: isRTL ? 'right' : 'left' }; }
function formatIls(value) { return `₪ ${Math.round(Number(value || 0)).toLocaleString()}`; }

function Metric({ label, value, isRTL }) {
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, align(isRTL)]}>{label}</Text>
      <Text style={[styles.metricValue, align(isRTL)]}>{value}</Text>
    </View>
  );
}

function Input({ label, value, onChangeText, isRTL, keyboardType = 'default' }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, align(isRTL)]}>{label}</Text>
      <TextInput value={String(value ?? '')} onChangeText={onChangeText} keyboardType={keyboardType} style={[styles.input, align(isRTL)]} placeholderTextColor={colors.muted} />
    </View>
  );
}

function Select({ label, value, options, onChange, isRTL }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, align(isRTL)]}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(([key, text]) => (
          <Pressable key={key} onPress={() => onChange(key)} style={[styles.optionChip, value === key && styles.optionChipActive]}>
            <Text style={styles.optionChipText}>{text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange, isRTL, disabled = false, multiline = false }) {
  return (
    <View style={[styles.toggleRow, multiline && styles.toggleRowMultiline, disabled && { opacity: 0.5 }]}>
      <Text style={[styles.toggleLabel, align(isRTL)]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} disabled={disabled} thumbColor={value ? colors.accent : '#CBD5E1'} trackColor={{ false: '#334155', true: '#60A5FA' }} />
    </View>
  );
}

function Field({ field, t, value, onChange, isRTL }) {
  if (field.type === 'boolean') {
    return <Toggle label={t[field.labelKey]} value={Boolean(value)} onChange={(v) => onChange(field.key, v)} isRTL={isRTL} />;
  }
  if (field.type === 'select') {
    const options = field.options.map(([optionValue, optionLabelKey]) => [optionValue, t[optionLabelKey] || optionValue]);
    return <Select label={t[field.labelKey]} value={value} options={options} onChange={(v) => onChange(field.key, v)} isRTL={isRTL} />;
  }
  return <Input label={t[field.labelKey]} value={value} onChangeText={(v) => onChange(field.key, v)} isRTL={isRTL} keyboardType={field.type === 'number' ? 'numeric' : 'default'} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, gap: 16 },
  header: { backgroundColor: colors.panel, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.line, gap: 10 },
  brand: { color: '#93C5FD', fontSize: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  h1: { color: colors.text, fontSize: 30, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  grid: { gap: 12 },
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 24, padding: 18, gap: 12 },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  cardBody: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  langRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  langChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2 },
  langChipActive: { backgroundColor: colors.accent },
  langChipText: { color: colors.text, fontWeight: '800' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.panel2, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  backButtonText: { color: colors.text, fontWeight: '800' },
  formBlock: { gap: 12 },
  fieldWrap: { gap: 6 },
  label: { color: colors.text, fontWeight: '700', fontSize: 14 },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.text },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 12 },
  optionChipActive: { backgroundColor: colors.accent2, borderColor: colors.accent },
  optionChipText: { color: colors.text, fontWeight: '700' },
  metricRow: { gap: 4, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#25324A' },
  metricLabel: { color: colors.muted, fontSize: 13 },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  disclaimer: { color: colors.muted, marginTop: 10, lineHeight: 21 },
  subheading: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleRowMultiline: { alignItems: 'flex-start' },
  toggleLabel: { color: colors.text, flex: 1, lineHeight: 20 },
  legal: { color: colors.muted, lineHeight: 21, marginTop: 10 },
  submit: { marginTop: 10, backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});


const API_URL = process.env.EXPO_PUBLIC_CUSTOMER_FUNCTION_URL;

export async function submitLead(payload) {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_CUSTOMER_FUNCTION_URL fehlt.');
  }
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Lead konnte nicht gesendet werden.');
  }
  return data;
}

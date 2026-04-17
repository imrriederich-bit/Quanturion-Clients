
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quanturion_customer_app_state_v1';

export async function saveLocalState(state) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function loadLocalState() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

import { Alert, Linking } from 'react-native';
import { triggerLightHaptic } from './haptics';

export const normalizeIndianPhone = (phone?: string): string => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return phone?.startsWith('+') ? phone : `+${digits}`;
};

export const openPhoneDialer = (phone?: string) => {
  const clean = (phone || '').replace(/[^\d+]/g, '');
  if (!clean) {
    Alert.alert('माहिती नाही', 'संपर्क क्रमांक उपलब्ध नाही.');
    return;
  }
  triggerLightHaptic();
  Linking.openURL(`tel:${clean}`).catch(() =>
    Alert.alert('त्रुटी', 'कॉल अ‍ॅप उघडता आले नाही.')
  );
};

export const openWhatsAppMessage = (message: string, phone?: string) => {
  triggerLightHaptic();
  const formatted = normalizeIndianPhone(phone);
  const encoded = encodeURIComponent(message);
  const url = formatted
    ? `whatsapp://send?phone=${formatted}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  Linking.openURL(url).catch(() => {
    const webUrl = formatted
      ? `https://wa.me/${formatted.replace('+', '')}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    Linking.openURL(webUrl).catch(() =>
      Alert.alert('त्रुटी', 'WhatsApp उघडता आले नाही.')
    );
  });
};

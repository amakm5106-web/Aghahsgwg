export const PAYMENT_PROVIDER_CODES = ['kbz', 'wave', 'aya', 'cb'] as const;
export type PaymentProviderCode = typeof PAYMENT_PROVIDER_CODES[number];

const MYANMAR_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

export function normalizeMyanmarDigits(value: string): string {
  return value.replace(/[၀-၉]/g, (digit) => String(MYANMAR_DIGITS.indexOf(digit)));
}

export function normalizePhone(value: unknown): string {
  if (typeof value !== 'string') throw new Error('ဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပါ။');
  let normalized = normalizeMyanmarDigits(value).trim().replace(/[\s()-]/g, '');
  if (normalized.startsWith('+95')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('95')) normalized = `0${normalized.slice(2)}`;
  if (!/^09\d{7,9}$/.test(normalized)) throw new Error('မြန်မာဖုန်းနံပါတ် မှန်ကန်စွာထည့်ပါ။');
  return normalized;
}

export function normalizeTransferId(value: unknown): string {
  if (typeof value !== 'string') throw new Error('ငွေလွှဲ ID အပြည့်အစုံ ထည့်ပါ။');
  const normalized = normalizeMyanmarDigits(value).trim().replace(/\s+/g, '').toUpperCase();
  if (normalized.length < 5 || normalized.length > 128 || !/^[A-Z0-9._-]+$/.test(normalized)) {
    throw new Error('ငွေလွှဲ ID အပြည့်အစုံ မှန်ကန်စွာထည့်ပါ။');
  }
  return normalized;
}

export function parseMmkAmount(value: unknown, min = 1000, max = 100_000_000): number {
  const raw = typeof value === 'string' ? normalizeMyanmarDigits(value).trim() : value;
  const amount = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(amount) || amount < min || amount > max) {
    throw new Error(`ပမာဏကို ${min.toLocaleString()} မှ ${max.toLocaleString()} MMK အတွင်း ကိန်းပြည့်အဖြစ် ထည့်ပါ။`);
  }
  return amount;
}

export function parseProviderCode(value: unknown): PaymentProviderCode {
  if (typeof value !== 'string' || !(PAYMENT_PROVIDER_CODES as readonly string[]).includes(value)) {
    throw new Error('ငွေလွှဲဝန်ဆောင်မှု အမျိုးအစား မမှန်ကန်ပါ။');
  }
  return value as PaymentProviderCode;
}

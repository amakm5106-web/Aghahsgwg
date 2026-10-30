export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type IdentifierType = 'email' | 'phone';
export type NormalizedIdentifier = { value: string; type: IdentifierType };

export class AuthInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthInputError';
  }
}

export function normalizeIdentifier(input: unknown): NormalizedIdentifier {
  if (typeof input !== 'string') {
    throw new AuthInputError('ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ကို မှန်ကန်စွာ ဖြည့်ပါ။');
  }

  const raw = input.trim();
  if (!raw || raw.length > 191) {
    throw new AuthInputError('ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ကို မှန်ကန်စွာ ဖြည့်ပါ။');
  }

  if (raw.includes('@')) {
    const value = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      throw new AuthInputError('အီးမေးလ်လိပ်စာကို မှန်ကန်စွာ ဖြည့်ပါ။');
    }
    return { value, type: 'email' };
  }

  const westernDigits = raw.replace(/[၀-၉]/g, (digit) =>
    String('၀၁၂၃၄၅၆၇၈၉'.indexOf(digit)),
  );
  const compact = westernDigits.replace(/[\s().-]/g, '');
  const digits = compact.replace(/^\+/, '');
  let nationalDigits: string;

  if (/^09\d{7,9}$/.test(digits)) {
    nationalDigits = `959${digits.slice(2)}`;
  } else if (/^959\d{7,9}$/.test(digits)) {
    nationalDigits = digits;
  } else {
    throw new AuthInputError('Myanmar ဖုန်းနံပါတ် သို့မဟုတ် အီးမေးလ်ကို မှန်ကန်စွာ ဖြည့်ပါ။');
  }

  return { value: `+${nationalDigits}`, type: 'phone' };
}

export function passwordValidationError(password: unknown): string | null {
  if (typeof password !== 'string') return 'စကားဝှက်ကို ဖြည့်ပါ။';
  if (password.length < PASSWORD_MIN_LENGTH) return 'စကားဝှက်ကို အနည်းဆုံး ၈ လုံး ဖြည့်ပါ။';
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return 'စကားဝှက်သည် UTF-8 ဖြင့် ၇၂ bytes ထက် မကျော်ရပါ။';
  }
  return null;
}

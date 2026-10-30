/**
 * WavePay, KBZPay, and AYA Pay Receipt Parser & Deposit Slip Verifier.
 * Ported from Decr-main/src/receipt_parser.ts
 */

export interface ParsedReceipt {
  trx_id: string | null;
  last5_digits: string | null;
  extracted_amount: number | null;
  provider: 'wave' | 'kbz' | 'aya' | 'unknown';
  is_valid: boolean;
  message?: string;
}

const MYANMAR_DIGITS = '၀၁၂၃၄၅၆၇၈၉';

export function normalizeMyanmarDigits(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const idx = MYANMAR_DIGITS.indexOf(input[i]);
    out += idx !== -1 ? String(idx) : input[i];
  }
  return out;
}

function normalizeCoreMsisdn(phone: string): string {
  const digits = normalizeMyanmarDigits(String(phone || '')).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('959') && digits.length >= 10) return digits.slice(2);
  if (digits.startsWith('09') && digits.length >= 9) return digits.slice(1);
  if (digits.startsWith('9') && digits.length >= 8 && digits.length <= 10) return digits;
  return digits;
}

function isLikelyMyanmarPhone(candidate: string, excludedCorePhone: string): boolean {
  const clean = candidate.replace(/\D/g, '');
  if (!clean) return true;

  if (excludedCorePhone) {
    const candCore = normalizeCoreMsisdn(clean);
    if (candCore === excludedCorePhone || (clean.length <= 12 && clean.includes(excludedCorePhone))) {
      return true;
    }
  }

  // Myanmar mobile: 09xxxxxxxxx or 959xxxxxxxxx
  if (clean.startsWith('09') && clean.length >= 9 && clean.length <= 11) {
    return true;
  }
  if (clean.startsWith('959') && clean.length >= 10 && clean.length <= 12) {
    return true;
  }
  return false;
}

function isLikelyDateCompact(candidate: string): boolean {
  // Exclude 8-digit YYYYMMDD dates
  if (candidate.length === 8 && /^20[2-3]\d(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(candidate)) {
    return true;
  }
  return false;
}

const TRX_LABEL_REGEX =
  /(?:transaction\s*(?:id|no|number|code|#)?|trans(?:action)?\s*(?:id|no|code)?|order\s*(?:id|no|number|#)?|trx\s*(?:id|no)?|txn\s*(?:id|no)?|ref(?:erence)?\s*(?:id|no|number|code)?|လုပ်ဆောင်ချက်\s*အမှတ်စဉ်|လုပ်ငန်းစဉ်\s*အမှတ်|အော်ဒါ\s*အမှတ်|အမှတ်စဉ်)/i;

/**
 * Extracts transaction ID and amount from receipt text or user input.
 */
export function extractReceiptInfo(rawText: string, excludePhone?: string): ParsedReceipt {
  const normalized = normalizeMyanmarDigits(String(rawText || ''));
  if (!normalized.trim()) {
    return {
      trx_id: null,
      last5_digits: null,
      extracted_amount: null,
      provider: 'unknown',
      is_valid: false,
      message: 'အချက်အလက် ထည့်သွင်းထားခြင်း မရှိပါ။',
    };
  }

  const excludedCore = normalizeCoreMsisdn(excludePhone || '');
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let trxId = '';

  // Pass 1: Look adjacent to explicit Transaction ID labels
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!TRX_LABEL_REGEX.test(line)) continue;

    const afterLabel = line.replace(TRX_LABEL_REGEX, ' ');
    const windowLines = [afterLabel, lines[i + 1] || ''];

    for (const segment of windowLines) {
      if (!segment) continue;
      const directMatches = segment.match(/\b\d{7,24}\b/g) || [];
      for (const cand of directMatches) {
        if (!isLikelyMyanmarPhone(cand, excludedCore) && !isLikelyDateCompact(cand)) {
          trxId = cand;
          break;
        }
      }
      if (trxId) break;

      const collapsed = segment.replace(/(\d)[ \t]+(?=\d)/g, '$1');
      const collapsedMatches = collapsed.match(/\b\d{8,24}\b/g) || [];
      for (const cand of collapsedMatches) {
        if (!isLikelyMyanmarPhone(cand, excludedCore) && !isLikelyDateCompact(cand)) {
          trxId = cand;
          break;
        }
      }
      if (trxId) break;
    }

    if (trxId) break;
  }

  // Pass 2: Scan all standalone 8-24 digit sequences
  if (!trxId) {
    const scrubbed = normalized
      .replace(/(?:\+?95\s*9|09)[\s\-]*\d[\d\s\-]{6,11}/g, ' ')
      .replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g, ' ');

    const candidates = scrubbed.match(/\b\d{8,24}\b/g) || [];
    const validCandidates = candidates.filter(
      (c) => !isLikelyMyanmarPhone(c, excludedCore) && !isLikelyDateCompact(c)
    );

    // Prefer 9-22 digit IDs
    const preferred = validCandidates.find((c) => c.length >= 9 && c.length <= 22);
    trxId = preferred || validCandidates[0] || '';
  }

  // If user just typed an alphanumeric transaction ID (e.g. KP12345678, WMT98234123)
  if (!trxId) {
    const alphaNumMatch = normalized.match(/\b([A-Za-z]{2,4}\d{6,18})\b/);
    if (alphaNumMatch) {
      trxId = alphaNumMatch[1];
    }
  }

  // Extract transfer amount
  const amountMatch = normalized.match(
    /(\d{1,3}(?:,\d{3})+|\d{3,9})(?:\.\d{1,2})?\s*(?:Ks|MMK|Kyat|ကျပ်)/i
  );
  const extractedAmount =
    amountMatch && amountMatch[1] ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;

  // Detect provider
  let provider: 'wave' | 'kbz' | 'aya' | 'unknown' = 'unknown';
  if (/wave|wavemoney|wavepay/i.test(normalized)) {
    provider = 'wave';
  } else if (/kbz|kbzpay|kpay/i.test(normalized)) {
    provider = 'kbz';
  } else if (/aya|ayapay/i.test(normalized)) {
    provider = 'aya';
  } else if (trxId) {
    if (trxId.length >= 18) provider = 'kbz';
    else if (trxId.length === 12) provider = 'aya';
    else provider = 'wave';
  }

  const isValid = Boolean(trxId && trxId.length >= 6);

  return {
    trx_id: trxId || null,
    last5_digits: trxId ? trxId.slice(-5) : null,
    extracted_amount: Number.isFinite(extractedAmount) ? extractedAmount : null,
    provider,
    is_valid: isValid,
    message: isValid
      ? 'ပြေစာစစ်ဆေးမှု အောင်မြင်ပါသည်။'
      : 'မှန်ကန်သော Transaction ID / စလစ်အချက်အလက်ကို မတွေ့ရှိပါ။',
  };
}

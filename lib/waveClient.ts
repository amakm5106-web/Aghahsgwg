import crypto from 'node:crypto';

export const WAVE_API_HOST = 'https://api.wavemoney.io:8100';
export const WMT_MFS_HEADER = 'wmt-mfs';
export const FINGERPRINT = '87EC104C0FFBB8E749CD59D9C64851441B38D1C13C9746DC124BB9E71E66DCB9';
export const APP_ID = 'mm.com.wavemoney.wavepay';
export const VERSION_CODE = '1470';
export const APP_VERSION = '2.6.1';

export const RSA_PUBLIC_KEY_1 = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4fV3EhdFo6O6ujXcji4y
6GmhX8eXP6Of0SJSVp4AVQXj9Bbb5UKW0smu/wVhqBOSBpF9dfaJcCAhXOr9XDm5
aGZVEMQIJ1UM89MgYcvZ11zQ6z8mbq775X/8TUPun1L2Z+2oIc6fu5v0VKfjFo1J
2tuK+abF9C7EOcWClyAZFpo2GB+AYk3AcGTLJ8PcbH5A8KZesBVIitYb1uSASREJ
mvbeBSOyITpnLppXOui6RIba7Kc5KPvSJxJ270+SJxrg2t6CehoDAx1JW17q1VfC
OMVWewfwge8EkQ0DVwNy7p5z6a+1BoIEdweJn83/XluyMx6sWlbnwIJvc0i6vPTX
lwIDAQAB
-----END PUBLIC KEY-----`;

export const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyVd3HpGdUJSJ+PMes20w
IPP0QTCTiiaMwldFnLWp8xi0hD5yY0ZXAkBYebDUQoxSCq2lSTNzI0PCHg48tOOA
c2QIB0/n/xhcr6UBIaXUVCjAiDa9NjEQ3DBs2eS9/MsTzHM4rj73+/XHK04XIUKE
upqpXSgeslanGWzu3I7HqVNPVLf2uCJp7TpCNhRCEMjOaKnteQRczTysjeZ/NaFr
zV4H1PMZClJxRUxcvWuORX1h/hmSAIYweJr9UL5xWKSnTYlR6FLLJRwIDGt9EjQF
9l15hT3kNxPPgRakfCv5sXOrALqxXQKy83m1WeR0MVvbSUx7Ct6N97M51lkQEcbw
VwIDAQAB
-----END PUBLIC KEY-----`;

export function rsaEncryptSecret(value: string, counter: string): string {
  const plaintext = `${value}:${counter}`;
  const encrypted = crypto.publicEncrypt(
    {
      key: RSA_PUBLIC_KEY_1,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plaintext, 'utf8')
  );
  return encrypted.toString('base64');
}

export function generateDeviceId(): string {
  return crypto.randomBytes(20).toString('hex');
}

export interface WaveClientOptions {
  phone: string;
  deviceId?: string;
  model?: string;
  osVersion?: string;
  wmtMfs?: string;
}

export function isWaveSuccess(json: any): boolean {
  if (!json || typeof json !== 'object') return false;
  const status = String(json.statusCode || json.codeStatus || '').toUpperCase();
  if (['0', '200', 'SC000', 'SC00', 'SUCCESS', 'OK'].includes(status)) return true;
  if (typeof json.message === 'string' && json.message.toLowerCase() === 'success') return true;
  if (json.responseMap && !json.errorCategory && !json.errorCode && !json.serverErrorCode) return true;
  return false;
}

export class WaveApiClient {
  phone: string;
  deviceId: string;
  model: string;
  osVersion: string;
  wmtMfs: string;
  base: string;

  constructor(options: WaveClientOptions) {
    this.phone = options.phone.trim().replace(/[^0-9]/g, '');
    this.deviceId = options.deviceId || generateDeviceId();
    this.model = options.model || 'Xiaomi 12';
    this.osVersion = options.osVersion || '13';
    this.wmtMfs = options.wmtMfs || '';
    this.base = WAVE_API_HOST;
  }

  getHeaders(extra: Record<string, string> = {}): HeadersInit {
    const headers: Record<string, string> = {
      fingerprint: FINGERPRINT,
      appId: APP_ID,
      userLanguage: 'en',
      versionCode: VERSION_CODE,
      appVersion: APP_VERSION,
      deviceId: this.deviceId,
      device: `${this.model}(${this.model})`,
      product: 'redfin',
      cpuAbi: 'arm64-v8a,armeabi-v7a,armeabi',
      manufacturer: 'Google',
      model: this.model,
      osVersion: this.osVersion,
      'user-agent': 'okhttp/4.9.0',
      ...extra,
    };

    if (this.wmtMfs) {
      headers[WMT_MFS_HEADER] = this.wmtMfs;
    }

    return headers;
  }

  // 1. Request OTP
  async requestOtp(): Promise<{ success: boolean; message: string; raw?: any }> {
    try {
      const url = `${this.base}/v3/wmt-mfs-otp/generate-otp?msisdn=${encodeURIComponent(this.phone)}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const json = await res.json().catch(() => ({}));
      const success = isWaveSuccess(json);

      return {
        success,
        message: json.message || (success ? 'OTP ပေးပို့ပြီးပါပြီ။ ဖုန်းထဲမှ ၆ လုံးကုဒ်ကို ရိုက်ထည့်ပါ။' : 'OTP တောင်းဆိုမှု မအောင်မြင်ပါ။ ဖုန်းနံပါတ် စစ်ဆေးပေးပါ။'),
        raw: json,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Wave ဆာဗာသို့ ချိတ်ဆက်၍မရပါ: ${err?.message || err}`,
      };
    }
  }

  // 2. Get Security Token
  async getSecurityToken(): Promise<string> {
    const url = `${this.base}/v3/wmt-mfs-otp/security-token?msisdn=${encodeURIComponent(this.phone)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders({
        'user-agent': 'Dart/3.6.0 (dart:io)',
      }),
    });

    const json = await res.json();
    const token = json?.responseMap?.securityCounter;
    if (!token) {
      throw new Error(json.message || 'Security counter could not be retrieved from Wave.');
    }
    return String(token);
  }

  // 3. Confirm OTP
  async confirmOtp(otp: string): Promise<{ success: boolean; message: string; raw?: any }> {
    const url = `${this.base}/v3/wmt-mfs-otp/confirm-otp`;
    const formData = new URLSearchParams();
    formData.append('msisdn', this.phone);
    formData.append('otp', otp);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: formData.toString(),
    });

    const json = await res.json().catch(() => ({}));
    const success = isWaveSuccess(json);

    return {
      success,
      message: json.message || (success ? 'OTP အတည်ပြုပြီးပါပြီ။' : 'OTP မမှန်ကန်ပါ။ ပြန်လည်ကြိုးစားပါ။'),
      raw: json,
    };
  }

  // 4. Login with PIN and OTP
  async login(pin: string, otp: string): Promise<{
    success: boolean;
    token?: string;
    agentId?: number;
    phone?: string;
    message: string;
    raw?: any;
  }> {
    const otpRes = await this.confirmOtp(otp);
    if (!otpRes.success) {
      return {
        success: false,
        message: otpRes.message || 'OTP အတည်ပြုချက် မအောင်မြင်ပါ။',
        raw: otpRes.raw,
      };
    }

    const passwordCounter = await this.getSecurityToken();
    const pinCounter = await this.getSecurityToken();

    const encryptedPassword = rsaEncryptSecret(pin, passwordCounter);
    const encryptedPin = rsaEncryptSecret(pin, pinCounter);

    const url = `${this.base}/v3/mfs-customer/login`;
    const formData = new URLSearchParams();
    formData.append('msisdn', this.phone);
    formData.append('password', encryptedPassword);
    formData.append('pin', encryptedPin);

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      }),
      body: formData.toString(),
    });

    const receivedToken = res.headers.get(WMT_MFS_HEADER) || '';
    if (receivedToken) {
      this.wmtMfs = receivedToken;
    }

    const json = await res.json().catch(() => ({}));
    const statusCode = json.statusCode;
    const success = (statusCode === 0 || statusCode === '0' || statusCode === 200 || statusCode === '200') && (!!receivedToken || !!json.responseMap);

    const agentId = json?.responseMap?.agentId;
    const token = receivedToken || json?.responseMap?.token || '';

    return {
      success,
      token,
      agentId,
      phone: this.phone,
      message: json.message || (success ? 'WavePay အကောင့်သို့ အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ။' : 'Login မအောင်မြင်ပါ။ PIN နံပါတ် မှန်မမှန် စစ်ဆေးပါ။'),
      raw: json,
    };
  }

  // 5. Get Wallet Balance
  async getWalletBalance(token?: string): Promise<{ success: boolean; balance?: number; message: string; raw?: any }> {
    const authToken = token || this.wmtMfs;
    if (!authToken) {
      return { success: false, message: 'WMT-MFS Session Token မရှိပါ။ Login အရင်ဝင်ပေးပါ။' };
    }

    try {
      const url = `${this.base}/v2/mfs-customer/wallet-balance`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders({
          [WMT_MFS_HEADER]: authToken,
        }),
      });

      const nextToken = res.headers.get(WMT_MFS_HEADER);
      if (nextToken) this.wmtMfs = nextToken;

      const json = await res.json().catch(() => ({}));
      const statusCode = json.statusCode;
      const success = statusCode === 0 || statusCode === '0' || statusCode === 200 || statusCode === '200';

      const balance = json?.responseMap?.balance || json?.responseMap?.availableBalance || 0;

      return {
        success,
        balance: Number(balance) || 0,
        message: success ? 'Balance retrieved' : (json.message || 'Balance retrieval failed'),
        raw: json,
      };
    } catch (err: any) {
      return { success: false, message: `Wave API Error: ${err?.message || err}` };
    }
  }

  // 6. Get Transaction History
  async getTransactionHistory(limit: number = 20, offset: number = 0, token?: string): Promise<{
    success: boolean;
    transactions: Array<{
      transId: string;
      amount: number;
      direction: string;
      senderPhone?: string;
      senderName?: string;
      timestamp: string;
      title?: string;
    }>;
    message: string;
    raw?: any;
  }> {
    const authToken = token || this.wmtMfs;
    if (!authToken) {
      return {
        success: false,
        transactions: [],
        message: 'WMT-MFS Session Token မရှိပါ။ Wave အကောင့် Login ဝင်ပေးပါ။',
      };
    }

    try {
      const url = `${this.base}/merchant-app/tnxhistory-utility/v2/tnx-histories?limit=${limit}&offset=${offset}`;
      const browserHeaders = {
        'user-agent': `Mozilla/5.0 (Linux; Android ${this.osVersion}; ${this.model} Build/RD1A.200810.022.A4; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.137 Mobile Safari/537.36`,
        accept: '*/*',
        'content-type': 'application/json',
        origin: this.base,
        'x-requested-with': APP_ID,
        [WMT_MFS_HEADER]: authToken,
      };

      const res = await fetch(url, {
        method: 'GET',
        headers: browserHeaders,
      });

      const nextToken = res.headers.get(WMT_MFS_HEADER);
      if (nextToken) this.wmtMfs = nextToken;

      const json = await res.json().catch(() => ({}));

      // Parse Wave transactions list
      const rawList = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.responseMap?.transactions)
        ? json.responseMap.transactions
        : Array.isArray(json?.transactions)
        ? json.transactions
        : [];

      const parsed = rawList.map((item: any) => {
        const transId = String(item.transactionId || item.transId || item.txnId || item.id || '');
        const amount = Math.abs(Number(item.amount || item.transAmount || 0));
        const direction = item.direction || (item.type === 'RECEIVE' || item.type === 'CR' ? 'CR' : 'DR');
        const senderPhone = item.senderMsisdn || item.fromMsisdn || item.msisdn || '';
        const senderName = item.senderName || item.fromName || item.title || 'Wave Customer';
        const timestamp = item.dateTime || item.createdDate || item.timestamp || new Date().toISOString();

        return {
          transId,
          amount,
          direction,
          senderPhone,
          senderName,
          timestamp,
          title: item.title || item.transactionType || 'Wave Transfer',
        };
      });

      return {
        success: res.status >= 200 && res.status < 300,
        transactions: parsed,
        message: 'History loaded',
        raw: json,
      };
    } catch (err: any) {
      return {
        success: false,
        transactions: [],
        message: `Wave History Error: ${err?.message || err}`,
      };
    }
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { WaveApiClient } from '@/lib/waveClient';
import { getSessionUser, isSameOriginRequest, sessionTokenFromRequest } from '@/lib/auth/core';
export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ success: false, message: 'Same-origin request required.' }, { status: 403 });
  }

  let isAdmin = false;
  try {
    const user = await getSessionUser(sessionTokenFromRequest(req));
    isAdmin = user?.role === 'admin';
  } catch {
    return NextResponse.json({ success: false, message: 'Authentication service is unavailable.' }, { status: 503 });
  }
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: 'Admin access required.' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, phone, pin, otp, token, limit, offset, deviceId } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action parameter is required.' },
        { status: 400 }
      );
    }

    const client = new WaveApiClient({
      phone: phone || '',
      deviceId: deviceId || undefined,
      wmtMfs: token || '',
    });

    switch (action) {
      case 'request_otp': {
        if (!phone) {
          return NextResponse.json(
            { success: false, message: 'Wave ဖုန်းနံပါတ် ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။' },
            { status: 400 }
          );
        }
        const result = await client.requestOtp();
        return NextResponse.json(result);
      }

      case 'login': {
        if (!phone || !pin || !otp) {
          return NextResponse.json(
            { success: false, message: 'ဖုန်းနံပါတ်၊ OTP နှင့် PIN အားလုံး ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။' },
            { status: 400 }
          );
        }
        const result = await client.login(pin, otp);
        return NextResponse.json(result);
      }

      case 'verify_token': {
        if (!token) {
          return NextResponse.json(
            { success: false, message: 'WMT-MFS Token ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။' },
            { status: 400 }
          );
        }
        const balRes = await client.getWalletBalance(token);
        const histRes = await client.getTransactionHistory(10, 0, token);

        const isValid = balRes.success || histRes.success || histRes.transactions.length > 0;

        return NextResponse.json({
          success: isValid,
          balance: balRes.balance || 0,
          transactions: histRes.transactions || [],
          message: isValid
            ? 'Wave Session Token ချိတ်ဆက်မှု အောင်မြင်ပါသည်။'
            : (balRes.message || 'Token သက်တမ်းကုန်ဆုံး သို့မဟုတ် မမှန်ကန်ပါ။'),
        });
      }

      case 'history': {
        const historyRes = await client.getTransactionHistory(
          limit ? Number(limit) : 20,
          offset ? Number(offset) : 0,
          token
        );
        return NextResponse.json(historyRes);
      }

      case 'balance': {
        const balRes = await client.getWalletBalance(token);
        return NextResponse.json(balRes);
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Wave Gateway လုပ်ဆောင်မှု မအောင်မြင်ပါ။',
      },
      { status: 500 }
    );
  }
}

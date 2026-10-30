import { NextRequest, NextResponse } from 'next/server';
import { getAuthDb } from '@/lib/auth/db';
import { getAdminSessionUser } from '@/lib/auth/admin-server';
import { isJsonRequest, isSameOriginRequest } from '@/lib/auth/core';
import { normalizePhone, parseProviderCode } from '@/lib/wallet/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'ဤလုပ်ဆောင်မှုကို AzLottery ဆိုက်မှသာ ပို့နိုင်ပါသည်။' }, { status: 403 });
  if (!isJsonRequest(request)) return NextResponse.json({ error: 'JSON တောင်းဆိုချက်ဖြင့် ပြန်ကြိုးစားပါ။' }, { status: 415 });
  let admin;
  try { admin = await getAdminSessionUser(request); }
  catch { return NextResponse.json({ error: 'စီမံခန့်ခွဲသူ session ကိုစစ်ဆေး၍မရပါ။' }, { status: 503 }); }
  if (!admin) return NextResponse.json({ error: 'စီမံခန့်ခွဲသူခွင့်ပြုချက် မရှိပါ။' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'တောင်းဆိုချက် မမှန်ကန်ပါ။' }, { status: 400 });
  }

  let code: string;
  let receiverPhone: string;
  try {
    code = parseProviderCode(body.code);
    receiverPhone = normalizePhone(body.receiverPhone);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const receiverName = typeof body.receiverName === 'string' ? body.receiverName.trim() : '';
  const status = body.status === 'disabled' ? 'disabled' : body.status === 'active' ? 'active' : null;
  if (!name || name.length > 100 || !receiverName || receiverName.length > 128 || !status) {
    return NextResponse.json({ error: 'ဝန်ဆောင်မှုအမည်၊ လက်ခံသူအမည်နှင့် အခြေအနေကို မှန်ကန်စွာဖြည့်ပါ။' }, { status: 400 });
  }

  try {
    await getAuthDb().execute(
      `INSERT INTO azlottery_payment_providers (code, name, receiver_phone, receiver_name, status, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), receiver_phone = VALUES(receiver_phone),
         receiver_name = VALUES(receiver_name), status = VALUES(status), updated_by_user_id = VALUES(updated_by_user_id)`,
      [code, name, receiverPhone, receiverName, status, admin.id],
    );
    return NextResponse.json({ ok: true, message: 'ငွေလက်ခံအကောင့်အချက်အလက်ကို သိမ်းဆည်းပြီးပါပြီ။' }, { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (error) {
    console.error('[admin/wallet/providers] failed', (error as { code?: string }).code || 'unknown');
    return NextResponse.json({ error: 'ငွေလက်ခံအကောင့်ကို သိမ်းဆည်း၍မရပါ။' }, { status: 503 });
  }
}

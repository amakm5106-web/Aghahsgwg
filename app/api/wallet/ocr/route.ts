import { NextRequest, NextResponse } from 'next/server';
import { extractReceiptInfo } from '@/lib/receiptParser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, receiver_phone } = body;
    if (!text) {
      return NextResponse.json({ status: 'error', message: 'No receipt text provided' }, { status: 400 });
    }
    const parsed = extractReceiptInfo(text, receiver_phone);
    return NextResponse.json({ status: 'success', data: parsed });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err?.message || 'OCR parsing failed' }, { status: 500 });
  }
}

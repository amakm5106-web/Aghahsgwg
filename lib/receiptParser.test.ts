import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMyanmarDigits, extractReceiptInfo } from './receiptParser';

test('normalizeMyanmarDigits converts burmese numerals to western digits', () => {
  assert.equal(normalizeMyanmarDigits('၀၉၉၈၇၆၅၄၃၂၁'), '09987654321');
  assert.equal(normalizeMyanmarDigits('၅၀,၀၀၀ ကျပ်'), '50,000 ကျပ်');
});

test('extractReceiptInfo extracts WavePay transaction ID and amount', () => {
  const sampleWaveReceipt = `
    WavePay Money Transfer
    Transaction ID: 987654321012
    From: 09987654321
    To: 09876543210
    Amount: 20,000.00 Ks
    Status: Successful
  `;
  const parsed = extractReceiptInfo(sampleWaveReceipt);
  assert.equal(parsed.trx_id, '987654321012');
  assert.equal(parsed.last5_digits, '21012');
  assert.equal(parsed.extracted_amount, 20000);
  assert.equal(parsed.provider, 'wave');
  assert.equal(parsed.is_valid, true);
});

test('extractReceiptInfo extracts KBZPay 20-digit order number and MMK amount with Myanmar digits', () => {
  const sampleKbzReceipt = `
    KBZPay အောင်မြင်ပါသည်
    လုပ်ဆောင်ချက် အမှတ်စဉ်: ၀၂၀၂၆၁၀၂၄၁၂၃၄၅၆၇၈၉၀၁
    ငွေပမာဏ: ၅၀,၀၀၀ MMK
  `;
  const parsed = extractReceiptInfo(sampleKbzReceipt);
  assert.equal(parsed.trx_id, '02026102412345678901');
  assert.equal(parsed.extracted_amount, 50000);
  assert.equal(parsed.provider, 'kbz');
  assert.equal(parsed.is_valid, true);
});

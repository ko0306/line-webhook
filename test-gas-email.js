/**
 * GASのsendNotificationEmailを実際に叩いてテスト
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxe7SadlFI_VpVhK6pAAbm1s8VcqcwHRqhx8dLpuCxma63OJw7Q0in_FtPHyrVsWNKI/exec';

async function testGas(action, data) {
  console.log(`\n[送信] action=${action}`, data);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
      redirect: 'follow',
    });
    const text = await res.text();
    console.log('[レスポンス status]', res.status);
    try {
      const json = JSON.parse(text);
      console.log('[レスポンス JSON]', JSON.stringify(json, null, 2));
      return json;
    } catch {
      console.log('[レスポンス text]', text.slice(0, 500));
      return null;
    }
  } catch (err) {
    console.error('[エラー]', err.message);
    return null;
  }
}

async function run() {
  console.log('=== GAS sendNotificationEmail テスト ===');

  // 1. sendNotificationEmail を直接テスト
  const r1 = await testGas('sendNotificationEmail', {
    lineUserId: 'U_TEST_000',
    message: '【テスト】GASからのメール送信テストです。届いていたら成功です。',
  });

  console.log('\n--- 結果 ---');
  if (r1?.success) {
    console.log('✅ sendNotificationEmail: 成功');
  } else {
    console.log('❌ sendNotificationEmail: 失敗', r1);
  }

  // 2. saveInquiry もテスト（お問い合わせ保存 + メール通知が走るか）
  console.log('\n=== GAS saveInquiry テスト ===');
  const r2 = await testGas('saveInquiry', {
    lineUserId: 'U_TEST_000',
    name: 'テストユーザー',
    email: 'test@example.com',
    service: 'シフトアプリ',
    details: 'これはテストのお問い合わせです',
  });

  if (r2?.success) {
    console.log('✅ saveInquiry: 成功');
  } else {
    console.log('❌ saveInquiry: 失敗', r2);
  }
}

run().catch(console.error);

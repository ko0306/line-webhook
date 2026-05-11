/**
 * followイベント（友達追加）のモックテスト
 * LINE API / GAS を実際には呼ばずに、送信されるメッセージを確認する
 */

const sentMessages = [];
const gasRequests  = [];

// --- モック: LINE Client ---
const mockClient = {
  replyMessage: async (replyToken, messages) => {
    const list = Array.isArray(messages) ? messages : [messages];
    list.forEach(msg => {
      console.log('  [LINE reply]', JSON.stringify(msg, null, 2));
      sentMessages.push({ replyToken, msg });
    });
    return { status: 200 };
  },
  pushMessage: async (to, msg) => {
    console.log('  [LINE push] to:', to, JSON.stringify(msg, null, 2));
    sentMessages.push({ to, msg });
    return { status: 200 };
  },
};

// --- モック: fetch (GAS呼び出し) ---
global.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  console.log('  [GAS]', body.action, JSON.stringify(body));
  gasRequests.push(body);
  const responses = {
    setConversationState : { success: true },
    saveUserService      : { success: true },
    getConversationState : { state: null, stateData: {} },
  };
  return { json: async () => responses[body.action] ?? { success: true } };
};

// --- followイベントのハンドラ（webhook.jsのhandleFollowと同一ロジック） ---
async function handleFollow(event) {
  const ref    = event.referral?.ref;
  const userId = event.source.userId;

  if (ref === 'free') {
    console.log('  → 無料相談フロー（このテストでは省略）');
    return;
  }

  const service = ref === 'shift' ? 'shift' : ref === 'web' ? 'web' : 'other';

  await Promise.all([
    mockClient.replyMessage(event.replyToken, {
      type: 'text',
      text: 'この度はOZONONIXの公式LINEにご登録いただきありがとうございます！\nメールアドレスのご確認はセキュリティ強化のためです。\nお問い合わせ時に入力したメールアドレスを教えてください📧',
    }),
    fetch('GAS_URL', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ action: 'setConversationState', lineUserId: userId, state: 'WAITING_EMAIL', stateData: {} }),
    }),
    fetch('GAS_URL', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ action: 'saveUserService', lineUserId: userId, service }),
    }),
  ]);
}

// --- テスト実行 ---
async function runTests() {
  const cases = [
    { label: 'refなし（通常登録）',    event: { replyToken: 'rt-001', source: { userId: 'U111' }, referral: null } },
    { label: 'ref=shift（シフト）',    event: { replyToken: 'rt-002', source: { userId: 'U222' }, referral: { ref: 'shift' } } },
    { label: 'ref=web（Web問い合わせ）', event: { replyToken: 'rt-003', source: { userId: 'U333' }, referral: { ref: 'web'   } } },
    { label: 'ref=free（無料相談）',   event: { replyToken: 'rt-004', source: { userId: 'U444' }, referral: { ref: 'free'  } } },
  ];

  for (const { label, event } of cases) {
    console.log(`\n${'─'.repeat(55)}`);
    console.log(`テスト: ${label}`);
    console.log('─'.repeat(55));
    sentMessages.length = 0;
    gasRequests.length  = 0;

    await handleFollow(event);

    // 結果サマリー
    const emailMsg = sentMessages.find(m =>
      m.msg?.text?.includes('メールアドレス')
    );
    if (emailMsg) {
      console.log('\n  ✅ メールアドレスを聞くメッセージが送信されました');
      console.log('  本文:', emailMsg.msg.text.replace(/\n/g, ' '));
    } else if (label.includes('無料相談')) {
      console.log('\n  ℹ️  無料相談フロー（メール認証なし）');
    } else {
      console.log('\n  ❌ メールアドレスを聞くメッセージが送信されていません！');
    }
    console.log(`  GASリクエスト数: ${gasRequests.length}`);
  }

  console.log('\n' + '═'.repeat(55));
  console.log('テスト完了');
}

runTests().catch(console.error);

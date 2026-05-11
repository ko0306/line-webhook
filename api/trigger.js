const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxe7SadlFI_VpVhK6pAAbm1s8VcqcwHRqhx8dLpuCxma63OJw7Q0in_FtPHyrVsWNKI/exec';

async function gasPost(action, data) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

function makeQuickReply(items) {
  return {
    items: items.map(([label, text]) => ({
      type: 'action',
      action: { type: 'message', label, text },
    })),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, action } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'missing params' });

  try {
    if (action === 'free') {
      // 無料相談フロー
      await gasPost('saveUserService', { lineUserId: userId, service: 'consultation' });
      await client.pushMessage(userId, {
        type: 'text',
        text: 'こんにちは！OZONONIXでございます😊\n無料相談へのご登録ありがとうございます！',
      });
      await client.pushMessage(userId, {
        type: 'text',
        text: 'どのようなことについてご相談でしょうか？\nお気軽にお選びください👇',
        quickReply: makeQuickReply([
          ['📱 シフトアプリ', 'fc_shift'],
          ['🌐 HP制作',       'fc_hp'],
          ['💻 アプリ制作',   'fc_app'],
          ['💰 料金・費用',   'fc_price'],
          ['💬 その他',       'fc_other'],
        ]),
      });

    } else if (action === 'auth') {
      // メール認証フロー
      await gasPost('setConversationState', { lineUserId: userId, state: 'WAITING_EMAIL', stateData: {} });
      await client.pushMessage(userId, {
        type: 'text',
        text: 'この度はお問い合わせいただきありがとうございます！\nメールアドレスのご確認はセキュリティ強化のためです。\nお問い合わせ時に入力したメールアドレスを教えてください📧',
      });

    } else {
      return res.status(400).json({ error: 'unknown action' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[TRIGGER ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

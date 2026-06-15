const { Client } = require('@line/bot-sdk');

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const INTERNAL_BOT_TOKEN = process.env.INTERNAL_BOT_TOKEN || '';
const INTERNAL_GROUP_ID = 'C4bfc1aee984b5f5e350dc8423885ce96';
const TASK_GAS_URL = 'https://script.google.com/macros/s/AKfycbwA1jwXjqv2iyXO9UUbNADY09yMQPhOZzZJhs-zrmGwixUtvwK_ghXh85SxuyUI4A/exec';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = req.headers['x-reply-secret'];
  if (!INTERNAL_BOT_TOKEN || secret !== INTERNAL_BOT_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { customerId, customerName, message, replierName, messageId } = req.body || {};
  if (!customerId || !message) {
    return res.status(400).json({ ok: false, error: 'missing params' });
  }

  try {
    // 顧客にLINEメッセージを送信
    await client.pushMessage(customerId, { type: 'text', text: message });

    // GASに返信済みを記録
    if (messageId) {
      await fetch(TASK_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _source: 'liff',
          action: 'markCustomerReplied',
          messageId,
          replyText: message,
          replierName,
        }),
      }).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[CUSTOMER REPLY ERROR]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};

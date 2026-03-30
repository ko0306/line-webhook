const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyadGxcb7MTdiiFQgYPMBh6ZBfLOLzyIhW8kYO97F8OUTDUqNfKY4ZQ1kc0BGOZ0mWs/exec';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('LINE Webhook Server is running');
  }

  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  if (!validateSignature(body, config.channelSecret, signature)) {
    return res.status(403).send('Invalid signature');
  }

  await Promise.all(req.body.events.map(handleEvent));

  res.status(200).send('OK');
};

async function handleEvent(event) {
  // 友達追加時
  if (event.type === 'follow') {
    const referral = event.referral;
    const sourceType = referral?.sourceType;
    const ref = referral?.ref;

    let greeting = '';

    if (sourceType === 'LINE_AT_AD' || sourceType === 'LINE_POINT_AD') {
      greeting = '広告を見てくださりありがとうございます！\nお得な情報をいち早くお届けします🎁\n\n';
    } else if (ref === 'web') {
      greeting = 'ホームページからご登録ありがとうございます！\n\n';
    } else {
      greeting = '友達追加ありがとうございます！\n\n';
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: greeting + 'お問い合わせ時に入力されたメールアドレスを入力してください📧\n（例：example@gmail.com）',
    });
    return;
  }

  // メッセージ受信時
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    // メールアドレス以外は無視
    if (!text.includes('@') || !text.includes('.')) return;

    const lineUserId = event.source.userId;

    // GASにメールとLINEユーザーIDを送信
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: text, lineUserId }),
    });

    const result = await response.json();

    if (result.success) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '紐付けが完了しました！\n今後ともよろしくお願いします😊',
      });
    } else {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'メールアドレスが見つかりませんでした。\nもう一度確認して入力してください。',
      });
    }
  }
}

const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('LINE Webhook Server is running');
  }

  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  if (!validateSignature(body, config.channelSecret, signature)) {
    return res.status(403).send('Invalid signature');
  }

  const events = req.body.events;

  await Promise.all(events.map(handleEvent));

  res.status(200).send('OK');
};

async function handleEvent(event) {
  if (event.type !== 'follow') return;

  const referral = event.referral;
  const sourceType = referral?.sourceType;
  const ref = referral?.ref;

  let message = '';

  if (sourceType === 'LINE_AT_AD' || sourceType === 'LINE_POINT_AD') {
    // LINE広告から友達追加
    message = '広告を見てくださりありがとうございます！\nお得な情報をいち早くお届けします🎁';
  } else if (ref === 'web') {
    // Webサイトから友達追加
    message = 'ホームページからご登録ありがとうございます！\n最新情報をお届けします😊';
  } else {
    // その他（QRコードなど）
    message = '友達追加ありがとうございます！\nよろしくお願いします🙏';
  }

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: message,
  });
}

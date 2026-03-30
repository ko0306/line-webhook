const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxtxD2BGCziFD2vkzwzVNgq5xNwoMFsqfh_0Uw8-3VDHzTcSEkDvxvjI2nwB0E4NxHF/exec';

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

    // サービス種別を判定
    let service = 'other';
    if (ref === 'shift') service = 'shift';

    // GASにサービス種別を保存
    await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveUserService',
        lineUserId: event.source.userId,
        service,
      }),
    });

    let greeting = '';
    if (sourceType === 'LINE_AT_AD' || sourceType === 'LINE_POINT_AD') {
      greeting = '広告を見てくださりありがとうございます！\n\n';
    } else if (ref === 'web' || ref === 'shift') {
      greeting = 'ホームページからご登録ありがとうございます！\n\n';
    } else {
      greeting = '友達追加ありがとうございます！\n\n';
    }

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: greeting + 'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧',
    });
    return;
  }

  // メッセージ受信時
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    // ===== リッチメニューのボタン処理 =====

    // A：お問い合わせ
    if (text === 'お問い合わせ') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'お問い合わせありがとうございます！\n担当者が確認次第ご連絡いたします。\nそのままご用件をお送りください💬',
      });
      return;
    }

    // B：よくあるQ&A
    if (text === 'よくあるQ&A') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '【よくあるQ&A】\n\n※ 後日FAQを追加します',
      });
      return;
    }

    // D：規約・プランを確認
    if (text === '規約・プランを確認') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '【規約・プラン】\n\n現在のご契約プランや規約は後日こちらに表示されます。\n\nプランの変更・退会をご希望の方はその旨をこのトークにお送りください。担当者よりご連絡いたします。',
      });
      return;
    }

    // メールアドレス以外は無視
    if (!text.includes('@') || !text.includes('.')) return;

    const lineUserId = event.source.userId;

    // GASにメールとLINEユーザーIDを送信
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'linkUser', email: text, lineUserId }),
    });

    const result = await response.json();

    if (result.success) {
      const service = result.service;

      if (service === 'shift') {
        // シフトアプリのお客様
        await client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: 'ありがとうございます！',
          },
          {
            type: 'text',
            text: '確認が完了しました😊\n\nシフトアプリの使い方説明書は後日お送りします。\n\n現時点で変更したい点や追加してほしい機能などがあればお気軽にお知らせください！',
          },
        ]);
      } else {
        // その他のお客様
        await client.replyMessage(event.replyToken, [
          {
            type: 'text',
            text: 'ありがとうございます！',
          },
          {
            type: 'text',
            text: '確認が完了しました😊\n\nお問い合わせ内容を確認し、カウンセリングをしたいと思います。\n担当者からご連絡しますので、しばらくお待ちください。',
          },
        ]);
      }
    } else {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'メールアドレスが見つかりませんでした。\nもう一度確認して入力してください。',
      });
    }
  }
}

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

    // Webからの登録はメール確認フローへ直行
    if (ref === 'web' || ref === 'shift') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧',
      });
      return;
    }

    // 広告・直接登録は挨拶メッセージ＋商品カードを送信
    await client.replyMessage(event.replyToken, [
      {
        type: 'text',
        text: 'はじめまして！OZONONIXです。\n友だち追加ありがとうございます😊\n\nこのアカウントでは、\n我が社が提供しているサービスの\n詳細を紹介しています！！',
      },
      {
        type: 'text',
        text: '我々は以下の三つのサービスを提供しています💪\n\n詳しい資料には、具体例を用いた値段、発注から提供までの流れが掲載されています！',
      },
      {
        type: 'template',
        altText: 'サービス一覧',
        template: {
          type: 'carousel',
          columns: [
            {
              thumbnailImageUrl: 'https://via.placeholder.com/1024x512',// ※後で差し替え
              imageAspectRatio: 'rectangle',
              imageSize: 'cover',
              title: 'シフト管理アプリ',
              text: 'シフト管理・勤怠管理・勤務時間集計まで一つで完結 ¥1500〜',
              actions: [
                { type: 'uri', label: '詳しい資料', uri: 'https://example.com' }, // ※後で差し替え
                { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
              ],
            },
            {
              thumbnailImageUrl: 'https://via.placeholder.com/1024x512', // ※後で差し替え
              imageAspectRatio: 'rectangle',
              imageSize: 'cover',
              title: 'Web作成',
              text: '丁寧なカウンセリングと自由度の高いカスタマイズ ¥50000〜',
              actions: [
                { type: 'uri', label: '詳しい資料', uri: 'https://example.com' }, // ※後で差し替え
                { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
              ],
            },
            {
              thumbnailImageUrl: 'https://via.placeholder.com/1024x512', // ※後で差し替え
              imageAspectRatio: 'rectangle',
              imageSize: 'cover',
              title: '業務効率化アプリ作成',
              text: 'お客様に合わせたアプリを一から作成 ¥500000〜',
              actions: [
                { type: 'uri', label: '詳しい資料', uri: 'https://example.com' }, // ※後で差し替え
                { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
              ],
            },
          ],
        },
      },
    ]);
    return;
  }

  // メッセージ受信時
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();

    // ===== リッチメニューのボタン処理 =====

    // メール認証（Webからお問い合わせ後にLINEに戻ってきた既存ユーザー）
    if (text === 'メール認証') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧',
      });
      return;
    }

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

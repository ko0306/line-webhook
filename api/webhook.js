const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxtxD2BGCziFD2vkzwzVNgq5xNwoMFsqfh_0Uw8-3VDHzTcSEkDvxvjI2nwB0E4NxHF/exec';

// プラン情報（GAS側のPLANS定数と合わせること）
const PLAN_INFO = {
  'ライト':       { price: 1500 },
  'スタンダード': { price: 3000 },
  'プレミアム':   { price: 5000 },
};

// ==================== エントリポイント ====================
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('LINE Webhook Server is running');

  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);
  if (!validateSignature(body, config.channelSecret, signature)) return res.status(403).send('Invalid signature');

  await Promise.all(req.body.events.map(handleEvent));
  res.status(200).send('OK');
};

// ==================== イベント振り分け ====================
async function handleEvent(event) {
  if (event.type === 'follow') return handleFollow(event);
  if (event.type === 'message' && event.message.type === 'text') return handleMessage(event);
}

// ==================== 友達追加 ====================
async function handleFollow(event) {
  const ref = event.referral?.ref;
  const service = ref === 'shift' ? 'shift' : 'other';

  await gasPost('saveUserService', { lineUserId: event.source.userId, service });

  if (ref === 'web' || ref === 'shift') {
    return replyText(event.replyToken,
      'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧'
    );
  }

  await client.replyMessage(event.replyToken, [
    { type: 'text', text: 'はじめまして！OZONONIXです。\n友だち追加ありがとうございます😊\n\nこのアカウントでは、我が社が提供しているサービスの詳細を紹介しています！！' },
    { type: 'text', text: '我々は以下の三つのサービスを提供しています💪\n\n詳しい資料には、具体例を用いた値段、発注から提供までの流れが掲載されています！' },
    {
      type: 'template',
      altText: 'サービス一覧',
      template: {
        type: 'carousel',
        columns: [
          {
            thumbnailImageUrl: 'https://via.placeholder.com/1024x512',
            imageAspectRatio: 'rectangle', imageSize: 'cover',
            title: 'シフト管理アプリ',
            text: 'シフト管理・勤怠管理・勤務時間集計まで一つで完結 ¥1500〜',
            actions: [
              { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product2/' },
              { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
            ],
          },
          {
            thumbnailImageUrl: 'https://via.placeholder.com/1024x512',
            imageAspectRatio: 'rectangle', imageSize: 'cover',
            title: 'Web作成',
            text: '丁寧なカウンセリングと自由度の高いカスタマイズ ¥50000〜',
            actions: [
              { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product1/' },
              { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
            ],
          },
          {
            thumbnailImageUrl: 'https://via.placeholder.com/1024x512',
            imageAspectRatio: 'rectangle', imageSize: 'cover',
            title: '業務効率化アプリ作成',
            text: 'お客様に合わせたアプリを一から作成 ¥500000〜',
            actions: [
              { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product3/' },
              { type: 'uri', label: 'お問い合わせ開始', uri: 'https://liff.line.me/2009734205-wWWdTXIP' },
            ],
          },
        ],
      },
    },
  ]);
}

// ==================== メッセージ受信 ====================
async function handleMessage(event) {
  const text = event.message.text.trim();
  const lineUserId = event.source.userId;

  // --- 固定テキスト（状態に関係なく常に動作） ---
  switch (text) {
    case 'メール認証':
      return replyText(event.replyToken,
        'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧'
      );
    case 'よくあるQ&A':
      return replyText(event.replyToken, '【よくあるQ&A】\n\n※ 後日FAQを追加します');
    case 'お問い合わせ':
      return replyText(event.replyToken,
        'お問い合わせありがとうございます！\n担当者が確認次第ご連絡いたします。\nそのままご用件をお送りください💬'
      );
    case '規約・プランを確認':
      return handlePlanCheck(event);
    case '情報変更':
      return handleInfoChangeStart(event, lineUserId);
    case 'プラン変更':
      return handlePlanChangeStart(event, lineUserId);
    case '退会手続き':
      return handleWithdrawStart(event, lineUserId);
  }

  // --- 会話状態を取得 ---
  const { state, stateData } = await gasPost('getConversationState', { lineUserId });

  switch (state) {
    case 'WAITING_CUSTOMIZATION':
      return handleCustomizationReply(event, text, lineUserId, stateData);
    case 'WAITING_CUSTOMIZATION_DETAILS':
      return handleCustomizationDetails(event, lineUserId);
    case 'WAITING_PLAN_CHANGE_SELECT':
      return handlePlanChangeSelect(event, text, lineUserId, stateData);
    case 'WAITING_PLAN_CHANGE_CONFIRM':
      return handlePlanChangeConfirm(event, text, lineUserId, stateData);
    case 'WAITING_INFO_FIELD_SELECT':
      return handleInfoFieldSelect(event, text, lineUserId);
    case 'WAITING_WITHDRAW_CONFIRM':
      return handleWithdrawConfirm(event, text, lineUserId);
    default:
      if (state && state.startsWith('WAITING_INFO_CHANGE_VALUE:')) {
        return handleInfoChangeValue(event, text, lineUserId, state.split(':')[1]);
      }
  }

  // --- メールアドレス入力（状態なし） ---
  if (text.includes('@') && text.includes('.')) {
    return handleEmailInput(event, text, lineUserId);
  }
}

// ==================== メール認証 → サービス判定 ====================
async function handleEmailInput(event, email, lineUserId) {
  const result = await gasPost('linkUser', { email, lineUserId });

  if (!result.success) {
    return replyText(event.replyToken,
      'メールアドレスが見つかりませんでした。\nもう一度確認して入力してください。'
    );
  }

  const { inquiry, plan, trial } = result;
  const isShift = (inquiry && inquiry.includes('シフト')) || result.service === 'shift';

  if (isShift) {
    const planMeta = PLAN_INFO[plan] || {};
    const featuresUrl = `${GAS_URL}?page=shift-features&plan=${encodeURIComponent(plan || '')}`;

    await gasPost('setConversationState', {
      lineUserId, state: 'WAITING_CUSTOMIZATION', stateData: { plan, inquiry },
    });

    await client.replyMessage(event.replyToken, [
      { type: 'text', text: 'ありがとうございます！確認が完了しました😊' },
      {
        type: 'text',
        text: [
          '【お申し込み内容】',
          `サービス: シフト管理アプリ`,
          plan ? `プラン: ${plan}（¥${(planMeta.price || 0).toLocaleString()}/月）` : '',
          (trial === 'はい' || trial === true || trial === 'TRUE') ? '無料トライアル: 希望あり' : '',
        ].filter(Boolean).join('\n'),
      },
      {
        type: 'text',
        text: `シフトアプリの機能・プラン詳細はこちら👇\n${featuresUrl}\n\n選択プラン「${plan || '未設定'}」でご利用いただける機能が確認できます。`,
      },
      {
        type: 'text',
        text: 'これら以外に付けたい機能があれば独自カスタマイズができます。\n\nカスタマイズをご希望ですか？',
        quickReply: makeQuickReply([
          ['はい', 'カスタマイズ_はい'],
          ['いいえ', 'カスタマイズ_いいえ'],
        ]),
      },
    ]);
  } else {
    await client.replyMessage(event.replyToken, [
      { type: 'text', text: 'ありがとうございます！確認が完了しました😊' },
      { type: 'text', text: 'お問い合わせ内容を確認し、カウンセリングをしたいと思います。\n担当者からご連絡しますので、しばらくお待ちください。' },
    ]);
  }
}

// ==================== カスタマイズフロー ====================
async function handleCustomizationReply(event, text, lineUserId, stateData) {
  if (text === 'カスタマイズ_いいえ') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    await client.replyMessage(event.replyToken, [
      { type: 'text', text: 'かしこまりました！\n専用のアプリを制作しています。営業日から二日以内でアプリを提供します。' },
      { type: 'text', text: '何か質問などあれば随時解答します。お気軽にお送りください😊' },
    ]);
    return;
  }
  if (text === 'カスタマイズ_はい') {
    await gasPost('setConversationState', { lineUserId, state: 'WAITING_CUSTOMIZATION_DETAILS', stateData });
    return replyText(event.replyToken,
      'どういった機能やカスタマイズを希望するか、出来る限り詳細に教えてください。\n\n※ 全ての要望をかなえられない場合もありますがご了承ください。'
    );
  }
}

async function handleCustomizationDetails(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
  return replyText(event.replyToken,
    '承知しました。ありがとうございます。\n担当者が確認しておりますので、お待ちください。'
  );
}

// ==================== 規約・プラン確認 ====================
async function handlePlanCheck(event) {
  const lineUserId = event.source.userId;
  const result = await gasPost('getUserInfo', { lineUserId });

  if (!result.success) {
    return replyText(event.replyToken,
      'ご契約情報が見つかりませんでした。\nメールアドレスをお送りいただくか、担当者にお問い合わせください。'
    );
  }

  const { email, inquiry, plan, trial, budget, withdrawn } = result;
  if (withdrawn) {
    return replyText(event.replyToken, '退会済みのアカウントです。ご不明な点はこのトークにてお問い合わせください。');
  }

  const isShift = inquiry && inquiry.includes('シフト');

  const infoLines = [
    '【ご契約情報】',
    `📧 メール: ${email || '未設定'}`,
    `📦 サービス: ${inquiry || '未設定'}`,
    isShift && plan ? `📋 プラン: ${plan}` : '',
    trial ? `🆓 無料トライアル: ${trial}` : '',
    budget ? `💰 ご予算: ${budget}` : '',
  ].filter(Boolean).join('\n');

  const agreementsText =
    '【同意事項】\n・個人情報保護方針\n・特定商取引法に基づく表記\n・利用規約\n\n各規約の詳細はWebサイトをご確認ください。';

  const options = [
    ['情報変更', '情報変更'],
    ...(isShift ? [['プラン変更', 'プラン変更']] : []),
    ['退会はこちら', '退会手続き'],
  ];

  await client.replyMessage(event.replyToken, [
    { type: 'text', text: infoLines },
    { type: 'text', text: agreementsText },
    { type: 'text', text: '操作を選択してください。', quickReply: makeQuickReply(options) },
  ]);
}

// ==================== 情報変更フロー ====================
async function handleInfoChangeStart(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: 'WAITING_INFO_FIELD_SELECT', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: '変更したい項目を選択してください。',
    quickReply: makeQuickReply([
      ['メールアドレス', 'フィールド変更_email'],
      ['ご予算', 'フィールド変更_budget'],
      ['キャンセル', 'キャンセル_情報変更'],
    ]),
  });
}

async function handleInfoFieldSelect(event, text, lineUserId) {
  if (text === 'キャンセル_情報変更') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, 'キャンセルしました。');
  }
  const fieldMap = {
    'フィールド変更_email':  { field: 'email',  label: 'メールアドレス' },
    'フィールド変更_budget': { field: 'budget', label: 'ご予算' },
  };
  const info = fieldMap[text];
  if (!info) {
    await client.replyMessage(event.replyToken, {
      type: 'text', text: '選択肢からお選びください。',
      quickReply: makeQuickReply([
        ['メールアドレス', 'フィールド変更_email'],
        ['ご予算', 'フィールド変更_budget'],
        ['キャンセル', 'キャンセル_情報変更'],
      ]),
    });
    return;
  }
  await gasPost('setConversationState', { lineUserId, state: `WAITING_INFO_CHANGE_VALUE:${info.field}`, stateData: {} });
  return replyText(event.replyToken, `新しい${info.label}を入力してください。`);
}

async function handleInfoChangeValue(event, text, lineUserId, field) {
  await gasPost('updateUserInfo', { lineUserId, field, value: text });
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
  return replyText(event.replyToken, '情報を更新しました。変更内容は担当者が確認いたします。');
}

// ==================== プラン変更フロー ====================
async function handlePlanChangeStart(event, lineUserId) {
  const planOptions = Object.entries(PLAN_INFO).map(([name, info]) => [
    `${name} (¥${info.price.toLocaleString()})`,
    `プラン選択_${name}`,
  ]);
  planOptions.push(['キャンセル', 'キャンセル_プラン変更']);

  await gasPost('setConversationState', { lineUserId, state: 'WAITING_PLAN_CHANGE_SELECT', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text', text: '変更後のプランを選択してください。',
    quickReply: makeQuickReply(planOptions),
  });
}

async function handlePlanChangeSelect(event, text, lineUserId, stateData) {
  if (text === 'キャンセル_プラン変更') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, 'キャンセルしました。');
  }
  if (!text.startsWith('プラン選択_')) return;

  const newPlan = text.replace('プラン選択_', '');
  if (!PLAN_INFO[newPlan]) return;

  const infoRes = await gasPost('getUserInfo', { lineUserId });
  const currentPlan = infoRes.plan || '未設定';
  const currentPrice = PLAN_INFO[currentPlan]?.price || 0;
  const newPrice = PLAN_INFO[newPlan].price;

  await gasPost('setConversationState', {
    lineUserId, state: 'WAITING_PLAN_CHANGE_CONFIRM',
    stateData: { newPlan, currentPlan },
  });

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: [
      '【プラン変更確認】',
      `現在: ${currentPlan}（¥${currentPrice.toLocaleString()}/月）`,
      `変更後: ${newPlan}（¥${newPrice.toLocaleString()}/月）`,
      '',
      `⚠️ 今月の請求は現プラン料金（¥${currentPrice.toLocaleString()}）のままです。`,
      `翌月から新プラン料金（¥${newPrice.toLocaleString()}）が適用されます。`,
      '',
      '※ プラン変更は2ヶ月に1度のみ可能です。',
      '',
      '変更しますか？',
    ].join('\n'),
    quickReply: makeQuickReply([
      ['変更する', '変更する'],
      ['キャンセル', 'キャンセル_プラン変更'],
    ]),
  });
}

async function handlePlanChangeConfirm(event, text, lineUserId, stateData) {
  if (text === 'キャンセル_プラン変更') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, 'プラン変更をキャンセルしました。');
  }
  if (text === '変更する') {
    const result = await gasPost('changePlan', { lineUserId, newPlan: stateData.newPlan });
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });

    if (result.success) {
      return replyText(event.replyToken, `プランを「${stateData.newPlan}」に変更しました。\n翌月より新プランが適用されます。`);
    } else if (result.reason === 'too_soon') {
      return replyText(event.replyToken, `プラン変更は2ヶ月に1度のみ可能です。\n次回変更可能日: ${result.nextAvailable}`);
    } else {
      return replyText(event.replyToken, 'プラン変更に失敗しました。担当者にお問い合わせください。');
    }
  }
}

// ==================== 退会フロー ====================
async function handleWithdrawStart(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: 'WAITING_WITHDRAW_CONFIRM', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: '⚠️ 退会処理を行います。\n\n退会すると全てのサービスが停止されます。\n\n本当に退会しますか？',
    quickReply: makeQuickReply([
      ['退会する', '退会する'],
      ['キャンセル', 'キャンセル_退会'],
    ]),
  });
}

async function handleWithdrawConfirm(event, text, lineUserId) {
  if (text === 'キャンセル_退会') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, '退会をキャンセルしました。ご利用ありがとうございます。');
  }
  if (text === '退会する') {
    await gasPost('withdraw', { lineUserId });
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, '退会処理が完了しました。\nご利用いただきありがとうございました。\nまたのご縁をお待ちしております。');
  }
}

// ==================== ユーティリティ ====================
function makeQuickReply(items) {
  return {
    items: items.map(([label, text]) => ({
      type: 'action',
      action: { type: 'message', label, text },
    })),
  };
}

async function replyText(replyToken, text) {
  return client.replyMessage(replyToken, { type: 'text', text });
}

async function gasPost(action, data = {}) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data }),
    });
    return res.json();
  } catch (err) {
    console.error('GAS error:', action, err);
    return { success: false, error: err.message };
  }
}

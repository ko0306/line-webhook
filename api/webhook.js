const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxuDDKvFcPPf0DZODHeHXUDI-UDRFNq9IvV0NDF1Bqk6SKDdh_rxAuwO5dpOlZ76G-7/exec';

const PLAN_INFO = {
  'ライト':       { price: 1500 },
  'スタンダード': { price: 3000 },
  'プレミアム':   { price: 5000 },
};

// ==================== キーワードルール ====================
// ※ 現在有効なルール一覧（下部に詳細リスト）
const KEYWORD_RULES = [
  {
    words: ['料金', '値段', 'いくら', '費用', '価格', '月額'],
    reply: '料金についてのご質問ありがとうございます！\n\n【各サービスの料金】\n📱 シフト管理アプリ：¥1,500/月〜\n🌐 HP作成：¥50,000〜\n💻 アプリ制作：¥500,000〜\n\n詳しくはこちら👇\nhttps://harurururun.github.io/company-OZONONIX/',
  },
  {
    words: ['シフト', '勤怠', '出勤', '退勤', '打刻', 'シフト管理'],
    reply: 'シフト管理アプリについてのご質問ですね！\n\nスタッフのシフト作成・勤怠管理・勤務時間集計がスマホで完結するアプリです。\n\n詳しくはこちら👇\nhttps://harurururun.github.io/company-OZONONIX/product2/',
  },
  {
    words: ['ホームページ', 'hp', 'ウェブサイト', 'サイト', 'web', 'ウェブ'],
    reply: 'HP作成についてのご質問ですね！\n\n丁寧なカウンセリングと自由度の高いカスタマイズが特徴です。\n料金：¥50,000〜\n\n詳しくはこちら👇\nhttps://harurururun.github.io/company-OZONONIX/product1/',
  },
  {
    words: ['アプリ', 'アプリ制作', '業務効率', 'システム開発'],
    reply: '業務効率化アプリ制作についてのご質問ですね！\n\nお客様の業務に合わせたアプリを一から制作します。\n料金：¥500,000〜\n\n詳しくはこちら👇\nhttps://harurururun.github.io/company-OZONONIX/product3/',
  },
  {
    words: ['無料', 'トライアル', '試し', 'お試し', '無料体験'],
    reply: '無料トライアルをご希望の場合は、お問い合わせよりご相談ください！\n担当者よりご連絡いたします😊\n\nhttps://harurururun.github.io/company-OZONONIX/contact',
  },
  {
    words: ['支払い', '請求', '振込', '銀行', '領収書', '請求書'],
    reply: 'お支払いについてのご質問ありがとうございます！\n\n銀行振込にて対応しております。\n請求書・領収書の発行も可能です。\n\n詳細はお問い合わせください👇\nhttps://harurururun.github.io/company-OZONONIX/contact',
  },
  {
    words: ['営業時間', '対応時間', '何時', '休日', '土日'],
    reply: '対応時間のご質問ありがとうございます！\n\n💬 対応時間：平日 10:00〜18:00\n\nお気軽にメッセージをお送りください！',
  },
  {
    words: ['カスタマイズ', 'オリジナル', '独自機能'],
    reply: 'カスタマイズについてのご質問ありがとうございます！\n\n各サービスとも独自カスタマイズに対応しています。\nご希望の内容をお知らせいただければ、対応可否をご確認いたします😊',
  },
  {
    words: ['こんにちは', 'こんばんは', 'おはよう', 'はじめまして'],
    reply: 'こんにちは！OZONONIXです😊\n\nビジネスに役立つサービスを提供しています。\nご質問はお気軽にどうぞ！',
  },
  {
    words: ['ありがとう', '感謝'],
    reply: 'こちらこそありがとうございます😊\nまたいつでもお気軽にご連絡ください！',
  },
];

// ==================== FAQ ====================
const FAQ_DATA = {
  'シフトアプリ': [
    { q: '料金はいくらですか？', a: '月額¥1,500〜です。スタッフ数や必要な機能によってプランを選べます。\n・ライト（〜10名）：¥1,500/月\n・スタンダード（〜30名）：¥3,000/月\n・プレミアム（人数無制限）：¥5,000/月' },
    { q: '無料トライアルはありますか？', a: 'はい、ご相談いただけます。まずはお問い合わせよりご連絡ください😊' },
    { q: 'スマホで使えますか？', a: 'はい！スマホのホーム画面にインストールしてアプリとして使えます（PWA対応）。' },
    { q: '何名まで登録できますか？', a: 'プランによって異なります。\n・ライト：最大10名\n・スタンダード：最大30名\n・プレミアム：無制限' },
    { q: '解約はできますか？', a: 'はい、月末までにお申し出いただくと翌月より解約となります。LINEまたはお問い合わせフォームよりご連絡ください。' },
    { q: 'データは安全ですか？', a: 'Supabase（世界水準のDBサービス）で安全に管理しています。データは暗号化されています。' },
  ],
  'HP作成': [
    { q: '料金はいくらですか？', a: '¥50,000〜となっています。ページ数やデザイン・機能の複雑さによって異なります。まずはご相談ください。' },
    { q: 'スマホ対応のHPは作れますか？', a: 'はい、全てのHPをスマートフォン対応（レスポンシブ）で制作しています。' },
    { q: '完成後に修正できますか？', a: '納品後の修正については打ち合わせ時にご確認ください。軽微な修正は対応可能な場合があります。' },
    { q: 'どのくらいで完成しますか？', a: 'ご要望の内容によって異なります。お打ち合わせ後に目安をお伝えします。' },
    { q: 'ドメイン・サーバーは必要ですか？', a: 'ドメインやサーバーが必要な場合はご案内します。お気軽にご相談ください。' },
  ],
  'アプリ制作': [
    { q: '料金はいくらですか？', a: '¥500,000〜となっています。要件によって大きく異なります。まずはご相談ください。' },
    { q: 'iOS・Android両方に対応できますか？', a: 'はい、対応可能です。要件に応じてご提案します。' },
    { q: '開発期間はどのくらいですか？', a: '要件確認後にお伝えします。小規模なら数週間〜、大規模なら数ヶ月が目安です。' },
    { q: '既存のシステムと連携できますか？', a: '要件次第で対応可能です。詳しくはお問い合わせください。' },
    { q: '完成後のサポートはありますか？', a: '保守・運用サポートについては個別にご相談ください。' },
  ],
  '料金・支払い': [
    { q: '支払い方法は？', a: '銀行振込にて対応しています。詳細はご契約時にご案内します。' },
    { q: '請求書払いはできますか？', a: 'はい、請求書でのお支払いに対応しています。' },
    { q: '領収書は発行できますか？', a: 'はい、発行可能です。ご入金確認後にお送りします。' },
    { q: '分割払いはできますか？', a: '大型案件については個別にご相談ください。' },
  ],
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

// ==================== 友達追加（順番にメッセージ送信） ====================
async function handleFollow(event) {
  const ref = event.referral?.ref;
  const userId = event.source.userId;
  const service = ref === 'shift' ? 'shift' : 'other';

  if (ref === 'web' || ref === 'shift') {
    // replyToken期限切れ防止のため並列実行
    await Promise.all([
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧',
      }),
      gasPost('setConversationState', { lineUserId: userId, state: 'WAITING_EMAIL', stateData: {} }),
      gasPost('saveUserService', { lineUserId: userId, service }),
    ]);
    return;
  }

  await gasPost('saveUserService', { lineUserId: userId, service });

  await client.replyMessage(event.replyToken, [
    { type: 'text', text: 'はじめまして！OZONONIXです😊' },
    { type: 'text', text: '友だち追加ありがとうございます！\nこのアカウントでは、弊社サービスのご紹介・お問い合わせ対応をしています。' },
    { type: 'text', text: '我々は以下の三つのサービスを提供しています💪\n詳しい資料には、値段・発注から提供までの流れが掲載されています！' },
    {
    type: 'template',
    altText: 'サービス一覧',
    template: {
      type: 'carousel',
      columns: [
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card1_shift.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: 'シフト管理アプリ',
          text: 'シフト管理・勤怠・集計まで完結 ¥1500〜',
          actions: [
            { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product2/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://harurururun.github.io/company-OZONONIX/contact' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card2_hp.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: 'HP作成',
          text: '丁寧なカウンセリングと高いカスタマイズ ¥50000〜',
          actions: [
            { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product1/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://harurururun.github.io/company-OZONONIX/contact' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card3_app.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: '業務効率化アプリ制作',
          text: 'お客様に合わせたアプリを一から制作 ¥500000〜',
          actions: [
            { type: 'uri', label: '詳しい資料', uri: 'https://harurururun.github.io/company-OZONONIX/product3/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://harurururun.github.io/company-OZONONIX/contact' },
          ],
        },
      ],
    },
    }
  ]);
}

// ==================== メッセージ受信 ====================
async function handleMessage(event) {
  const text = event.message.text.trim();
  const lineUserId = event.source.userId;

  // --- 固定テキスト ---
  switch (text) {
    case 'メール認証':
      await gasPost('setConversationState', { lineUserId, state: 'WAITING_EMAIL', stateData: {} });
      return replyText(event.replyToken, 'この度はお問い合わせいただきありがとうございます！\nセキュリティ強化のため、お問い合わせ時に入力したメールアドレスを教えてください📧');
    case 'お問い合わせ開始':
      return handleInquiryContact(event, lineUserId);
    case 'よくあるQ&A':
      return handleFaqTop(event);
    case '規約・プランを確認':
      return handlePlanCheck(event);
    case '情報変更':
      return handleInfoChangeStart(event, lineUserId);
    case 'プラン変更':
      return handlePlanChangeStart(event, lineUserId);
    case '退会手続き':
      return handleWithdrawStart(event, lineUserId);
  }

  // --- FAQ カテゴリ選択 ---
  if (text.startsWith('FAQ_')) {
    return handleFaqCategory(event, text.replace('FAQ_', ''));
  }

  // --- お問い合わせサービス選択 ---
  if (text.startsWith('問い合わせ_')) {
    return handleInquiryService(event, text.replace('問い合わせ_', ''), lineUserId);
  }

  // --- 会話状態 ---
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
    case 'INQUIRY_DETAILS':
      return handleInquiryDetails(event, text, lineUserId, stateData);
    case 'INQUIRY_EMAIL':
      return handleInquiryEmail(event, text, lineUserId, stateData);
    case 'INQUIRY_NAME':
      return handleInquiryName(event, text, lineUserId, stateData);
    case 'WAITING_EMAIL':
      return handleEmailInput(event, text, lineUserId);
    default:
      if (state && state.startsWith('WAITING_INFO_CHANGE_VALUE:')) {
        return handleInfoChangeValue(event, text, lineUserId, state.split(':')[1]);
      }
  }

  // --- メールアドレス入力 ---
  if (text.includes('@') && text.includes('.')) {
    return handleEmailInput(event, text, lineUserId);
  }

  // --- キーワードマッチング ---
  const match = findKeyword(text);
  if (match) {
    return replyText(event.replyToken, match.reply);
  }

  // --- 未判定メッセージ ---
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'メッセージありがとうございます😊\nご質問内容に応じてご案内します。',
    quickReply: makeQuickReply([
      ['よくあるQ&A', 'よくあるQ&A'],
      ['お問い合わせ', 'お問い合わせ開始'],
    ]),
  });
}

// ==================== よくあるQ&A ====================
async function handleFaqTop(event) {
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: '【よくあるQ&A】\nカテゴリを選んでください👇',
    quickReply: makeQuickReply([
      ['📱 シフトアプリ', 'FAQ_シフトアプリ'],
      ['🌐 HP作成', 'FAQ_HP作成'],
      ['💻 アプリ制作', 'FAQ_アプリ制作'],
      ['💰 料金・支払い', 'FAQ_料金・支払い'],
    ]),
  });
}

async function handleFaqCategory(event, category) {
  const items = FAQ_DATA[category];
  if (!items) {
    return replyText(event.replyToken, '該当するカテゴリが見つかりませんでした。');
  }
  const text = `【${category} よくある質問】\n\n` +
    items.map((item, i) => `Q${i + 1}. ${item.q}\n→ ${item.a}`).join('\n\n');

  await client.replyMessage(event.replyToken, [
    { type: 'text', text },
    {
      type: 'text',
      text: '他にご質問はありますか？',
      quickReply: makeQuickReply([
        ['📱 シフトアプリ', 'FAQ_シフトアプリ'],
        ['🌐 HP作成', 'FAQ_HP作成'],
        ['💻 アプリ制作', 'FAQ_アプリ制作'],
        ['💰 料金・支払い', 'FAQ_料金・支払い'],
        ['お問い合わせ', 'お問い合わせ開始'],
      ]),
    },
  ]);
}

// ==================== リッチメニュー「お問い合わせ」→ 担当者チャット ====================
async function handleInquiryContact(event, lineUserId) {
  await Promise.all([
    client.replyMessage(event.replyToken, [
      { type: 'text', text: '担当者に繋ぎます！\nこちらに直接メッセージをお送りください😊\n担当者が確認次第、返信いたします。' },
      { type: 'text', text: '💬 対応時間：平日 10:00〜18:00' },
    ]),
    gasPost('sendNotificationEmail', {
      lineUserId,
      message: 'リッチメニューの「お問い合わせ」ボタンが押されました。LINEで担当者対応をお願いします。',
    }),
  ]);
}

// ==================== お問い合わせフロー ====================
async function handleInquiryStart(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'お問い合わせありがとうございます😊\nどのサービスについてのご質問・ご相談ですか？',
    quickReply: makeQuickReply([
      ['シフトアプリ', '問い合わせ_シフトアプリ'],
      ['HP作成', '問い合わせ_HP作成'],
      ['アプリ制作', '問い合わせ_アプリ制作'],
      ['その他', '問い合わせ_その他'],
    ]),
  });
}

async function handleInquiryService(event, service, lineUserId) {
  await gasPost('setConversationState', {
    lineUserId, state: 'INQUIRY_DETAILS', stateData: { service },
  });
  const questions = {
    'シフトアプリ': 'シフトアプリについてのご質問・ご相談内容をできるだけ詳しくお教えください。\n（例：スタッフ人数、困っていること、希望機能など）',
    'HP作成':       'HP作成についてのご質問・ご相談内容をお教えください。\n（例：希望するサイトのイメージ、ページ数、ご予算など）',
    'アプリ制作':   'アプリ制作についてのご質問・ご相談内容をお教えください。\n（例：作りたいアプリのイメージ、機能、ご予算など）',
    'その他':       'どのようなご質問・ご相談ですか？お気軽にお聞かせください。',
  };
  return replyText(event.replyToken, questions[service] || 'ご質問内容をお教えください。');
}

async function handleInquiryDetails(event, text, lineUserId, stateData) {
  await gasPost('setConversationState', {
    lineUserId, state: 'INQUIRY_EMAIL',
    stateData: { ...stateData, details: text },
  });
  return replyText(event.replyToken, 'ありがとうございます！\nご連絡先のメールアドレスを教えてください📧');
}

async function handleInquiryEmail(event, text, lineUserId, stateData) {
  if (!text.includes('@') || !text.includes('.')) {
    return replyText(event.replyToken, '正しいメールアドレスの形式で入力してください。\n（例：example@email.com）');
  }
  await gasPost('setConversationState', {
    lineUserId, state: 'INQUIRY_NAME',
    stateData: { ...stateData, email: text },
  });
  return replyText(event.replyToken, 'お名前を教えてください😊');
}

async function handleInquiryName(event, text, lineUserId, stateData) {
  await gasPost('saveInquiry', {
    lineUserId,
    name: text,
    email: stateData.email,
    service: stateData.service,
    details: stateData.details,
  });
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
  await client.replyMessage(event.replyToken, [
    { type: 'text', text: `${text}様、ありがとうございます！` },
    { type: 'text', text: '担当者が確認しておりますので、しばらくお待ちください。\nご連絡はいただいたメールアドレスにお送りします📧' },
  ]);
}

// ==================== メール認証 → サービス判定 ====================
async function handleEmailInput(event, email, lineUserId) {
  const result = await gasPost('linkUser', { email, lineUserId });

  if (!result.success) {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'メールアドレスが見つかりませんでした。\n\nまずウェブのお問い合わせフォームからお申し込みください👇\nhttps://harurururun.github.io/company-OZONONIX/contact\n\nお申し込み後、こちらでメールアドレスを入力してください。',
    });
  }
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });

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
          'サービス: シフト管理アプリ',
          plan ? `プラン: ${plan}（¥${(planMeta.price || 0).toLocaleString()}/月）` : '',
          (trial === 'はい' || trial === true || trial === 'TRUE') ? '無料トライアル: 希望あり' : '',
        ].filter(Boolean).join('\n'),
      },
      {
        type: 'text',
        text: `シフトアプリの機能・プラン詳細はこちらからご確認いただけます👇\n${featuresUrl}\n\n選択プラン「${plan || '未設定'}」でご利用いただける機能が表示されています。`,
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
    await client.replyMessage(event.replyToken, { type: 'text', text: 'かしこまりました！' });
    await sleep(1200);
    await client.pushMessage(lineUserId, { type: 'text', text: '専用のアプリを制作しています。営業日から二日以内でアプリを提供します。' });
    await sleep(1200);
    await client.pushMessage(lineUserId, { type: 'text', text: '何か質問などあれば随時解答します。お気軽にお送りください😊' });
    return;
  }
  if (text === 'カスタマイズ_はい') {
    await gasPost('setConversationState', { lineUserId, state: 'WAITING_CUSTOMIZATION_DETAILS', stateData });
    return replyText(event.replyToken, 'どういった機能やカスタマイズを希望するか、出来る限り詳細に教えてください。\n\n※ 全ての要望をかなえられない場合もありますがご了承ください。');
  }
}

async function handleCustomizationDetails(event, lineUserId) {
  const customText = event.message.text;
  await gasPost('saveCustomization', { lineUserId, content: customText });
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
  await client.replyMessage(event.replyToken, { type: 'text', text: '承知しました。ありがとうございます。' });
  await sleep(1200);
  await client.pushMessage(lineUserId, { type: 'text', text: '担当者が確認しておりますので、お待ちください。' });
}

// ==================== 規約・プラン ====================
async function handlePlanCheck(event) {
  const lineUserId = event.source.userId;
  const result = await gasPost('getUserInfo', { lineUserId });

  if (!result.success) {
    return replyText(event.replyToken, '現在契約中のプランはありません。\nご利用をご希望の方は、お問い合わせボタンよりお申し込みください。');
  }

  const { email, inquiry, plan, trial, budget, withdrawn } = result;
  if (withdrawn) return replyText(event.replyToken, '退会済みのアカウントです。');

  const isShift = inquiry && inquiry.includes('シフト');
  const infoText = [
    '【ご契約情報】',
    `📧 メール: ${email || '未設定'}`,
    `📦 サービス: ${inquiry || '未設定'}`,
    isShift && plan ? `📋 プラン: ${plan}` : '',
    trial ? `🆓 無料トライアル: ${trial}` : '',
    budget ? `💰 ご予算: ${budget}` : '',
  ].filter(Boolean).join('\n');

  const agreementsText = '【同意事項】\n・個人情報保護方針\n・特定商取引法に基づく表記\n・利用規約\n\n各規約の詳細はWebサイトをご確認ください。';

  const options = [
    ['情報変更', '情報変更'],
    ...(isShift ? [['プラン変更', 'プラン変更']] : []),
    ['退会はこちら', '退会手続き'],
  ];

  await client.replyMessage(event.replyToken, [
    { type: 'text', text: infoText },
    { type: 'text', text: agreementsText },
    { type: 'text', text: '操作を選択してください。', quickReply: makeQuickReply(options) },
  ]);
}

// ==================== 情報変更 ====================
async function handleInfoChangeStart(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: 'WAITING_INFO_FIELD_SELECT', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text', text: '変更したい項目を選択してください。',
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

// ==================== プラン変更 ====================
async function handlePlanChangeStart(event, lineUserId) {
  const planOptions = Object.entries(PLAN_INFO).map(([name, info]) => [
    `${name} (¥${info.price.toLocaleString()})`, `プラン選択_${name}`,
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
    quickReply: makeQuickReply([['変更する', '変更する'], ['キャンセル', 'キャンセル_プラン変更']]),
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
    }
    return replyText(event.replyToken, 'プラン変更に失敗しました。担当者にお問い合わせください。');
  }
}

// ==================== 退会 ====================
async function handleWithdrawStart(event, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: 'WAITING_WITHDRAW_CONFIRM', stateData: {} });
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: '⚠️ 退会処理を行います。\n退会すると全てのサービスが停止されます。\n\n本当に退会しますか？',
    quickReply: makeQuickReply([['退会する', '退会する'], ['キャンセル', 'キャンセル_退会']]),
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
    return replyText(event.replyToken, '退会処理が完了しました。\nご利用いただきありがとうございました。');
  }
}

// ==================== キーワードマッチング ====================
function findKeyword(text) {
  const normalized = text.toLowerCase().replace(/\s/g, '');
  return KEYWORD_RULES.find(rule =>
    rule.words.some(w => normalized.includes(w.toLowerCase()))
  ) || null;
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
    return { success: false };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

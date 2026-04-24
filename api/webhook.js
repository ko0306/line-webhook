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
    words: ['支払い', '請求', 'クレジット', 'カード', '振込', '領収書', '請求書'],
    reply: 'お支払いについてのご質問ありがとうございます！\n\nクレジットカードにてご契約専用サイトよりお支払いいただきます。\nご契約時に専用サイトのURLをご案内します。\n\nご不明な点はお問い合わせください😊',
  },
  {
    words: ['解約', '退会', 'やめ', 'キャンセル'],
    reply: '解約・退会のご希望ありがとうございます。\n\n下のメニューの「規約・プランを確認」を開き、「退会はこちら」よりこの公式LINEでお手続きいただけます😊\n\nご不明な点があればお気軽にご連絡ください。',
  },
  {
    words: ['セキュリティ', '安全', '個人情報', 'プライバシー', '漏洩', '不正'],
    reply: 'セキュリティについてのご質問ありがとうございます！\n\nお客様ごとに専用のアプリを作成するため、部外者が干渉することはできない仕組みになっています🔒\n\n安心してご利用ください😊',
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
    words: ['こんにちは', 'こんばんは', 'おはよう', 'はじめまして', 'よろしく'],
    reply: 'こんにちは！OZONONIXです😊\n\nビジネスに役立つサービスを提供しています。\nご質問はお気軽にどうぞ！',
  },
  {
    words: ['ありがとう', '感謝', 'ありがとございます'],
    reply: 'こちらこそありがとうございます😊\nまたいつでもお気軽にご連絡ください！',
  },
  {
    words: ['契約', '申し込み', '申込', '始めたい', 'はじめたい', '使いたい'],
    reply: 'ご契約・お申し込みはこちらのフォームからお願いします😊\n\nhttps://harurururun.github.io/company-OZONONIX/contact\n\nフォーム送信後、このLINEに自動で戻ってきます。',
  },
  {
    words: ['問い合わせ', 'お問合せ', '質問', '相談'],
    reply: 'お問い合わせ・ご相談はリッチメニューの「お問い合わせ」ボタン、またはそのままメッセージをお送りください😊\n担当者が対応いたします。',
  },
];

// ==================== FAQ ====================
const FAQ_DATA = {
  'シフトアプリ': [
    { q: '料金はいくらですか？', a: '月額¥1,500〜です。スタッフ数や必要な機能によってプランを選べます。\n・ライト（〜10名）：¥1,500/月\n・スタンダード（〜30名）：¥3,000/月\n・プレミアム（人数無制限）：¥5,000/月' },
    { q: '無料トライアルはありますか？', a: 'はい、ご相談いただけます。まずはお問い合わせよりご連絡ください😊' },
    { q: 'スマホで使えますか？', a: 'はい！スマホのホーム画面にインストールしてアプリとして使えます（PWA対応）。' },
    { q: '何名まで登録できますか？', a: 'プランによって異なります。\n・ライト：最大10名\n・スタンダード：最大30名\n・プレミアム：無制限' },
    { q: '解約はできますか？', a: 'はい、解約はこの公式LINEで承っています。\n下のメニューの「規約・プランを確認」→「退会はこちら」よりお手続きください。月末までにお手続きいただくと翌月より解約となります。' },
    { q: 'データは安全ですか？', a: 'お客様ごとに専用のアプリを作成するため、部外者が干渉することはできない仕組みです🔒\nデータも世界水準のDBサービスで暗号化して管理しています。安心してご利用ください。' },
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
    { q: '支払い方法は？', a: 'クレジットカードにてご契約専用サイトよりお支払いいただきます。ご契約時に専用サイトのURLをご案内します。' },
    { q: '領収書は発行できますか？', a: 'はい、発行可能です。ご入金確認後にお送りします。' },
    { q: '解約はできますか？', a: 'はい、解約はこの公式LINEで承っています。\n下のメニューの「規約・プランを確認」→「退会はこちら」よりお手続きください。' },
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

  if (ref === 'free') {
    await gasPost('saveUserService', { lineUserId: userId, service: 'consultation' });
    await handleFreeConsultWelcome(event, userId);
    return;
  }

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

  // 順々にメッセージを送信
  await client.replyMessage(event.replyToken, { type: 'text', text: 'はじめまして！OZONONIXです😊' });
  await sleep(1500);
  await client.pushMessage(userId, { type: 'text', text: '友だち追加ありがとうございます！\nこのアカウントでは、弊社サービスのご紹介・お問い合わせ対応をしています。' });
  await sleep(1500);
  await client.pushMessage(userId, { type: 'text', text: '弊社では以下の三つのサービスを提供しています💪\n詳しい資料には、料金・発注から納品までの流れが掲載されています！' });
  await sleep(1500);
  await client.pushMessage(userId, {
    type: 'text',
    text: '🌟 特にイチオシは「シフト管理アプリ」です！\n\n✅ 完全カスタマイズ可能\n✅ 他社と比べて圧倒的に安い月額料金\n✅ お客様専用に作成するため部外者が干渉できない高いセキュリティ\n✅ シフト提出・作成・勤怠入力がすべて一括管理\n\nぜひ詳細をご覧ください👇',
  });
  await sleep(1500);
  await client.pushMessage(userId, {
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
  });
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
    case '問合せ種別_質問':
      await Promise.all([
        client.replyMessage(event.replyToken, [
          { type: 'text', text: '担当者に繋ぎます！\nこちらに直接メッセージをお送りください😊\n担当者が確認次第、返信いたします。' },
          { type: 'text', text: '💬 対応時間：平日 10:00〜18:00' },
        ]),
        gasPost('sendNotificationEmail', {
          lineUserId,
          message: 'お問い合わせ（ご質問・ご相談）のボタンが押されました。LINEで担当者対応をお願いします。',
        }),
      ]);
      return;
    case '問合せ種別_契約':
      return replyText(event.replyToken,
        'ご契約のお申し込みはこちらのフォームからお願いします😊\n\nhttps://harurururun.github.io/company-OZONONIX/contact\n\nフォーム送信後、このLINEに自動で戻ってきます。'
      );
    // ==================== 無料相談カテゴリ ====================
    case 'fc_shift': return handleConsultCategory(event, 'shift');
    case 'fc_hp':    return handleConsultCategory(event, 'hp');
    case 'fc_app':   return handleConsultCategory(event, 'app');
    case 'fc_price': return handleConsultCategory(event, 'price');
    case 'fc_other': return handleConsultOther(event);
    case 'fd_staff':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '担当者に直接ご連絡しますか？\n担当者が確認次第、ご返信いたします😊',
        quickReply: makeQuickReply([
          ['はい、お願いします', 'fc_staff_yes'],
          ['いいえ、大丈夫です', 'fc_staff_no'],
        ]),
      });
    case 'fc_staff_yes': return handleConsultStaff(event, lineUserId);
    case 'fc_staff_no':
      return replyText(event.replyToken, '承知しました😊\n他にご質問があればキーワードを入力するか、下のメニューからお選びください。');

    // --- シフトアプリ詳細 ---
    case 'fd_shift_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 料金・プラン】\n\n📱 ライト（最大10名）：月額¥1,500\n📱 スタンダード（最大30名）：月額¥3,000\n📱 プレミアム（人数無制限）：月額¥5,000\n\n他社と比べて圧倒的にお得な価格でご提供しています！\n完全カスタマイズも対応可能です😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['シフトアプリQ&A', 'fc_shift']]) },
      ]);
    case 'fd_shift_feat':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 主な機能】\n\n✅ シフト提出・作成・承認\n✅ 勤怠打刻（出勤・退勤・休憩）\n✅ 勤務時間集計\n✅ CSV出力\n✅ プッシュ通知\n✅ 修正申請機能\n✅ 完全カスタマイズ対応\n\nお客様専用に構築するため、必要な機能だけをシンプルに実装できます😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['シフトアプリQ&A', 'fc_shift']]) },
      ]);
    case 'fd_shift_trial':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【無料体験について】\n\n無料トライアルのご希望はお問い合わせよりご相談ください😊\n担当者がご案内いたします。' },
        { type: 'text', text: '担当者に直接ご連絡しますか？', quickReply: makeQuickReply([['はい', 'fc_staff_yes'], ['他の質問', 'fc_shift']]) },
      ]);
    case 'fd_shift_users':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【スタッフ人数について】\n\n・ライト：最大10名\n・スタンダード：最大30名\n・プレミアム：無制限\n\nスタッフ数が増えても、プラン変更で柔軟に対応できます😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['シフトアプリQ&A', 'fc_shift']]) },
      ]);
    case 'fd_shift_sec':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【セキュリティについて】\n\nお客様ごとに専用アプリを作成するため、部外者が干渉することはできない仕組みです🔒\nデータは世界水準のDBで暗号化して安全に管理しています。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['シフトアプリQ&A', 'fc_shift']]) },
      ]);

    // --- HP詳細 ---
    case 'fd_hp_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 料金】\n\n¥50,000〜です。\nページ数・デザイン・機能によって異なります。まずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['HPのQ&A', 'fc_hp']]) },
      ]);
    case 'fd_hp_period':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 期間】\n\nご要望によって異なりますが、打ち合わせ後に目安をお伝えします。\nまずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['HPのQ&A', 'fc_hp']]) },
      ]);
    case 'fd_hp_mobile':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【スマホ対応について】\n\nすべてのHPをスマートフォン対応（レスポンシブ）で制作しています😊\nPC・スマホ・タブレットで最適に表示されます。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['HPのQ&A', 'fc_hp']]) },
      ]);
    case 'fd_hp_custom':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP カスタマイズ】\n\nお客様のご要望に合わせて柔軟に対応します😊\nご希望のデザインや機能をお伝えください。' },
        { type: 'text', text: '担当者に直接ご相談しますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['HPのQ&A', 'fc_hp']]) },
      ]);

    // --- アプリ制作詳細 ---
    case 'fd_app_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ制作 料金】\n\n¥500,000〜です。\n要件によって大きく異なります。まずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['アプリのQ&A', 'fc_app']]) },
      ]);
    case 'fd_app_period':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ開発 期間】\n\n・小規模：数週間〜\n・大規模：数ヶ月〜\n\n要件確認後に目安をお伝えします😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['アプリのQ&A', 'fc_app']]) },
      ]);
    case 'fd_app_ios':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【iOS・Android対応】\n\n両方に対応可能です😊\n要件に応じて最適な方法をご提案します。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['アプリのQ&A', 'fc_app']]) },
      ]);

    // --- 料金詳細 ---
    case 'fd_price_shift':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 月額料金】\n・ライト（最大10名）：¥1,500/月\n・スタンダード（最大30名）：¥3,000/月\n・プレミアム（無制限）：¥5,000/月\n\n他社と比べて圧倒的にお得です😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['料金Q&A', 'fc_price']]) },
      ]);
    case 'fd_price_hp':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 料金】\n¥50,000〜です。\nページ数・機能によって異なります😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['料金Q&A', 'fc_price']]) },
      ]);
    case 'fd_price_app':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ制作 料金】\n¥500,000〜です。\n要件によって異なります😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['料金Q&A', 'fc_price']]) },
      ]);
    case 'fd_price_payment':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【支払い方法】\nクレジットカードにてご契約専用サイトよりお支払いいただきます。\nご契約時に専用サイトのURLをご案内します😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: makeQuickReply([['担当者に相談', 'fd_staff'], ['料金Q&A', 'fc_price']]) },
      ]);

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
    text: 'メッセージありがとうございます😊\n\n以下よりご用件をお選びください。\n\n📋 よくあるQ&A：料金・解約・セキュリティなどのよくある質問\n💬 お問い合わせ：ご質問・ご相談または契約のお申し込み\n📄 規約・プラン：ご契約内容の確認・変更・退会',
    quickReply: makeQuickReply([
      ['よくあるQ&A', 'よくあるQ&A'],
      ['お問い合わせ', 'お問い合わせ開始'],
      ['規約・プランを確認', '規約・プランを確認'],
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

// ==================== リッチメニュー「お問い合わせ」→ 質問 or 契約を選択 ====================
async function handleInquiryContact(event, lineUserId) {
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'お問い合わせありがとうございます！\nご用件をお選びください😊',
    quickReply: makeQuickReply([
      ['ご質問・ご相談', '問合せ種別_質問'],
      ['ご契約を希望', '問合せ種別_契約'],
    ]),
  });
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
  await Promise.all([
    gasPost('saveInquiry', {
      lineUserId,
      name: text,
      email: stateData.email,
      service: stateData.service,
      details: stateData.details,
    }),
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    sendEmail(lineUserId, `LINEお問い合わせが完了しました。\nお名前：${text}\nサービス：${stateData.service}\n内容：${stateData.details}`),
  ]);
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
    await Promise.all([
      client.replyMessage(event.replyToken, [
        { type: 'text', text: 'ありがとうございます！確認が完了しました😊' },
        { type: 'text', text: 'お問い合わせ内容を確認し、カウンセリングをしたいと思います。\n担当者からご連絡しますので、しばらくお待ちください。' },
      ]),
      sendEmail(lineUserId, 'メール認証完了（HP/アプリ制作）。担当者からのカウンセリング対応をお願いします。'),
    ]);
  }
}

// ==================== カスタマイズフロー ====================
async function handleCustomizationReply(event, text, lineUserId, stateData) {
  if (text === 'カスタマイズ_いいえ') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    await Promise.all([
      client.replyMessage(event.replyToken, { type: 'text', text: 'かしこまりました！' }),
      sendEmail(lineUserId, 'シフトアプリ契約者がカスタマイズ不要と回答しました。専用アプリの制作を開始してください。'),
    ]);
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
  await Promise.all([
    gasPost('saveCustomization', { lineUserId, content: customText }),
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    sendEmail(lineUserId, `シフトアプリ契約者からカスタマイズ要望が届きました。内容：${customText}`),
  ]);
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

// ==================== メール通知（ラッパー） ====================
async function sendEmail(lineUserId, message) {
  const result = await gasPost('sendNotificationEmail', { lineUserId, message });
  if (!result.success) {
    console.error('[EMAIL FAILED]', result.error, '| userId:', lineUserId, '| msg:', message);
  }
  return result;
}

// ==================== 無料相談フロー ====================
async function handleFreeConsultWelcome(event, userId) {
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'こんにちは！OZONONIXです😊\n無料相談へのご登録ありがとうございます！',
  });
  await sleep(1200);
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
}

async function handleConsultCategory(event, category) {
  const configs = {
    shift: {
      title: 'シフトアプリについてのご相談ですね！\n詳しい内容をお選びください👇',
      items: [
        ['料金・プラン',   'fd_shift_price'],
        ['機能について',   'fd_shift_feat'],
        ['無料体験',       'fd_shift_trial'],
        ['スタッフ人数',   'fd_shift_users'],
        ['セキュリティ',   'fd_shift_sec'],
        ['担当者に相談',   'fd_staff'],
      ],
    },
    hp: {
      title: 'HP制作についてのご相談ですね！\n詳しい内容をお選びください👇',
      items: [
        ['料金',           'fd_hp_price'],
        ['制作期間',       'fd_hp_period'],
        ['スマホ対応',     'fd_hp_mobile'],
        ['カスタマイズ',   'fd_hp_custom'],
        ['担当者に相談',   'fd_staff'],
      ],
    },
    app: {
      title: 'アプリ制作についてのご相談ですね！\n詳しい内容をお選びください👇',
      items: [
        ['料金',           'fd_app_price'],
        ['開発期間',       'fd_app_period'],
        ['iOS/Android',    'fd_app_ios'],
        ['担当者に相談',   'fd_staff'],
      ],
    },
    price: {
      title: '料金・費用についてのご相談ですね！\nどのサービスについてですか？👇',
      items: [
        ['シフトアプリ',   'fd_price_shift'],
        ['HP制作',         'fd_price_hp'],
        ['アプリ制作',     'fd_price_app'],
        ['支払い方法',     'fd_price_payment'],
        ['担当者に相談',   'fd_staff'],
      ],
    },
  };
  const config = configs[category];
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: config.title,
    quickReply: makeQuickReply(config.items),
  });
}

async function handleConsultOther(event) {
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'ご相談内容をキーワードで入力していただくか、担当者に直接ご連絡することも可能です😊\n\n例：「シフト」「料金」「セキュリティ」など',
    quickReply: makeQuickReply([
      ['担当者に連絡する', 'fd_staff'],
    ]),
  });
}

async function handleConsultStaff(event, lineUserId) {
  await Promise.all([
    client.replyMessage(event.replyToken, [
      { type: 'text', text: '担当者に取り次いでいます。しばらくお待ちください🙏' },
      { type: 'text', text: '💬 対応時間：平日 10:00〜18:00\n（時間外のお問い合わせは翌営業日に対応いたします）' },
    ]),
    sendEmail(lineUserId, '無料相談から担当者接続が選ばれました。LINEで担当者対応をお願いします。'),
  ]);
}

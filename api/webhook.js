const { Client, validateSignature } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new Client(config);

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxe7SadlFI_VpVhK6pAAbm1s8VcqcwHRqhx8dLpuCxma63OJw7Q0in_FtPHyrVsWNKI/exec';

const INTERNAL_BOT_TOKEN = process.env.INTERNAL_BOT_TOKEN || '';
const INTERNAL_GROUP_ID  = 'C4bfc1aee984b5f5e350dc8423885ce96';
const TASK_GAS_URL = 'https://script.google.com/macros/s/AKfycbwA1jwXjqv2iyXO9UUbNADY09yMQPhOZzZJhs-zrmGwixUtvwK_ghXh85SxuyUI4A/exec';

const PLAN_INFO = {
  'ベーシック':   { price: 1980 },
  'スタンダード': { price: 2980 },
  'プレミアム':   { price: 3980 },
};

// プランごとのStripe支払いURL
const STRIPE_PAYMENT_URLS = {
  'ベーシック':   'https://buy.stripe.com/3cIaEPcF97mG5dHaAI0sU00',
  'スタンダード': 'https://buy.stripe.com/aFa28j34z4aucG9aAI0sU01',
  'プレミアム':   'https://buy.stripe.com/bJe6ozfRlayS35zgZ60sU02',
};

// ==================== キーワードルール ====================
const KEYWORD_RULES = [
  {
    words: ['料金', '値段', 'いくら', '費用', '価格', '月額', 'コスト', '金額'],
    reply: '料金についてのご質問ありがとうございます！\n\n【各サービスの料金】\n📱 シフト管理アプリ：¥1,980/月〜\n🌐 HP作成：¥50,000〜\n💻 アプリ制作：¥500,000〜\n\n詳しくはこちら👇\nhttps://ozononix.com/',
  },
  {
    words: ['シフト', '勤怠', '出勤', '退勤', '打刻', 'シフト管理', 'シフト表', '出退勤'],
    reply: 'シフト管理アプリについてのご質問ですね！\n\nスタッフのシフト作成・勤怠管理・勤務時間集計がスマホで完結するアプリです。\n\n詳しくはこちら👇\nhttps://ozononix.com/product2/',
  },
  {
    words: ['ホームページ', 'hp', 'ウェブサイト', 'サイト', 'web', 'ウェブ', 'website', 'ホムペ'],
    reply: 'HP作成についてのご質問ですね！\n\n丁寧なカウンセリングと自由度の高いカスタマイズが特徴です。\n料金：¥50,000〜\n\n詳しくはこちら👇\nhttps://ozononix.com/product1/',
  },
  {
    words: ['アプリ制作', '業務効率化', 'システム開発', 'システム構築', '業務改善ツール'],
    reply: '業務効率化アプリ制作についてのご質問ですね！\n\nお客様の業務に合わせたアプリを一から制作します。\n料金：¥500,000〜\n\n詳しくはこちら👇\nhttps://ozononix.com/product3/',
  },
  {
    words: ['無料', 'トライアル', '試し', 'お試し', '無料体験', '無料期間', 'フリー'],
    reply: '無料トライアルについてのご質問ありがとうございます！\n\nシフト管理アプリは初月1ヶ月間・全機能が無料でご利用いただけます😊\nまずはお気軽にお問い合わせください！\n\nhttps://ozononix.com/product2/',
  },
  {
    words: ['支払い', '請求', 'クレジット', 'カード', '振込', '領収書', '請求書', '支払方法', 'お支払'],
    reply: 'お支払いについてのご質問ありがとうございます！\n\nクレジットカードにてご契約専用サイトよりお支払いいただきます。\nご契約時に専用サイトのURLをご案内いたします。\n\nご不明な点はお気軽にお問い合わせください😊',
  },
  {
    words: ['解約', '退会', 'やめたい', 'キャンセル', '停止', '解除', '辞める'],
    reply: '解約・退会のご希望ありがとうございます。\n\n下のメニューの「規約・プランを確認」を開き、「退会はこちら」よりこの公式LINEでお手続きいただけます😊\n\nご不明な点があればお気軽にご連絡ください。',
  },
  {
    words: ['セキュリティ', '安全', '個人情報', 'プライバシー', '漏洩', '不正', '安心', '守られ'],
    reply: 'セキュリティについてのご質問ありがとうございます！\n\nお客様ごとに専用のアプリを作成するため、部外者が干渉することはできない仕組みになっています🔒\nデータは世界水準のDBで暗号化して安全に管理しています。\n\n安心してご利用ください😊',
  },
  {
    words: ['営業時間', '対応時間', '何時', '休日', '土日', '営業日', '時間帯', '開いてる'],
    reply: '対応時間のご質問ありがとうございます！\n\n💬 対応時間：平日 10:00〜18:00\n\n時間外のお問い合わせは翌営業日に対応いたします。\nお気軽にメッセージをお送りください！',
  },
  {
    words: ['カスタマイズ', 'オリジナル', '独自機能', 'オーダーメイド', 'カスタム', 'アレンジ'],
    reply: 'カスタマイズについてのご質問ありがとうございます！\n\n各サービスとも独自カスタマイズに対応しています。\nご希望の内容をお知らせいただければ、対応可否をご確認いたします😊\n\nお問い合わせはこちら👇\nhttps://ozononix.com/contact',
  },
  {
    words: ['こんにちは', 'こんばんは', 'おはよう', 'はじめまして', 'よろしく', 'hello', 'hi'],
    reply: 'こんにちは！OZONONIXでございます😊\n\nビジネスに役立つサービスをご提供しております。\nご質問はお気軽にどうぞ！',
  },
  {
    words: ['ありがとう', '感謝', 'ありがとございます', 'ありがとうございます', 'サンキュー', 'thanks'],
    reply: 'こちらこそありがとうございます😊\nまたいつでもお気軽にご連絡ください！',
  },
  {
    words: ['契約', '申し込み', '申込', '始めたい', 'はじめたい', '使いたい', '導入したい', '登録したい'],
    reply: 'ご契約・お申し込みはリッチメニューの「お問い合わせ」ボタンよりお願いいたします😊\n\nまたはこちらのフォームよりお申し込みください👇\nhttps://ozononix.com/contact',
  },
  {
    words: ['問い合わせ', 'お問合せ', '質問', '相談', '聞きたい', '教えて'],
    reply: 'お問い合わせ・ご相談はリッチメニューの「お問い合わせ」ボタン、またはそのままメッセージをお送りください😊\n担当者または自動で返答いたします。',
  },
  {
    words: ['スマホ', 'スマートフォン', 'モバイル', 'iphone', 'android', 'スマートフォン対応', 'スマホ対応'],
    reply: 'スマートフォン対応についてのご質問ありがとうございます！\n\n📱 シフト管理アプリ：ホーム画面にインストールしてアプリとして使えます（PWA対応）\n🌐 HP作成：全てのHPをスマートフォン対応（レスポンシブ）で制作しています\n💻 アプリ制作：iOS・Android両方に対応可能です\n\n詳しくはお気軽にお問い合わせください😊',
  },
  {
    words: ['機能', 'できること', '使い方', '何ができる', '何がある', '搭載'],
    reply: '【シフト管理アプリ 主な機能】\n\n✅ シフト提出・作成・承認\n✅ 勤怠打刻（出勤・退勤・休憩）\n✅ 勤務時間集計\n✅ CSV出力\n✅ プッシュ通知\n✅ 修正申請機能\n✅ 完全カスタマイズ対応\n\n他のサービスの機能もお気軽にお問い合わせください😊',
  },
  {
    words: ['人数', 'スタッフ数', '従業員数', '何名', '何人', '上限', '制限', '人数制限'],
    reply: '利用人数についてのご質問ありがとうございます！\n\n【シフトアプリ プラン別スタッフ数】\n・ベーシック：〜19名（1店舗）\n・スタンダード：〜40名（店舗無制限）\n・プレミアム：無制限（店舗無制限）\n\nスタッフ数が増えてもプラン変更で対応できます😊',
  },
  {
    words: ['店舗', '複数店', 'チェーン', '多店舗', '支店', '何店舗'],
    reply: '複数店舗への対応についてのご質問ありがとうございます！\n\n【シフトアプリ 店舗数】\n・ベーシック：1店舗\n・スタンダード：店舗数無制限（〜40名）\n・プレミアム：店舗数無制限（無制限）\n\n複数店舗でのご利用もスタンダード以上で対応しています😊',
  },
  {
    words: ['通知', 'プッシュ通知', 'お知らせ', 'アラート', '通知機能', 'push'],
    reply: 'プッシュ通知についてのご質問ありがとうございます！\n\n📲 シフト管理アプリはプッシュ通知に対応しています。\nシフト確定・変更・申請などをスマホへリアルタイムでお知らせします😊\n\nカスタマイズで通知内容の調整も可能です。',
  },
  {
    words: ['csv', 'エクスポート', '出力', '集計', 'データ出力', '帳票', 'ダウンロード'],
    reply: 'データ出力についてのご質問ありがとうございます！\n\n📊 シフト管理アプリはCSV出力に対応しています。\n勤務時間の集計データをエクスポートして、給与計算や管理業務にご活用いただけます😊',
  },
  {
    words: ['修正申請', '打刻修正', '変更申請', '打刻ミス', '訂正', '申請機能'],
    reply: '修正申請についてのご質問ありがとうございます！\n\n✏️ シフト管理アプリには修正申請機能が搭載されています。\nスタッフが打刻ミスや変更をアプリ上で申請し、管理者が承認する仕組みです😊\n\nカスタマイズで申請フローも調整可能です。',
  },
  {
    words: ['導入', '始め方', 'はじめ方', 'セットアップ', '手順', 'スタート', '使い始め'],
    reply: '導入についてのご質問ありがとうございます！\n\n【オゾシフ 導入の流れ】\n1️⃣ お問い合わせ・お申し込み\n2️⃣ 担当者よりヒアリング\n3️⃣ お客様専用アプリを制作\n4️⃣ ご利用開始\n\n初月は全機能無料でお試しいただけます😊\nhttps://ozononix.com/product2/',
  },
  {
    words: ['サポート', '困った', 'エラー', '不具合', 'バグ', 'おかしい', '動かない', '問題'],
    reply: 'サポートについてのご質問ありがとうございます！\n\n💬 サポート対応時間：平日 10:00〜18:00\n\nご不明な点やお困りのことがあればお気軽にメッセージをお送りください。\n担当者または自動で返答いたします😊',
  },
  {
    words: ['比較', '他社', '競合', '違い', 'どう違う', 'おすすめ', '選び方'],
    reply: 'サービスの違いについてのご質問ありがとうございます！\n\n【OZONONIXの強み】\n✅ お客様専用に制作するため高セキュリティ\n✅ 完全カスタマイズ対応\n✅ 他社と比べてリーズナブルな料金\n✅ 担当者による丁寧なサポート\n\n詳しくはこちら👇\nhttps://ozononix.com/',
  },
  {
    words: ['期間', 'いつから', '納期', '完成', 'どのくらい', 'かかる', '日数', '何ヶ月'],
    reply: '制作期間についてのご質問ありがとうございます！\n\n・シフトアプリ：ヒアリング後約2〜4週間\n・HP作成：1〜3ヶ月（要件によって異なります）\n・アプリ制作：要件確認後にお伝えします\n\nまずはお気軽にご相談ください😊',
  },
  {
    words: ['会社', 'ozononix', 'オゾノニクス', '運営', 'どんな会社', '自己紹介', '概要'],
    reply: 'OZONONIXについてのご質問ありがとうございます！\n\n🏢 OZONONIX（オゾノニクス）は、\nシフト管理アプリ・ホームページ制作・業務効率化アプリ制作を提供する会社です。\n\n詳しくはこちら👇\nhttps://ozononix.com/',
  },
  {
    words: ['データ', 'バックアップ', '消える', '保存', 'クラウド', '保管', '紛失'],
    reply: 'データ管理についてのご質問ありがとうございます！\n\n💾 データは世界水準のクラウドDBで暗号化して安全に管理しています。\n自動バックアップにも対応しており、大切なデータを安心してお預けいただけます🔒',
  },
];

// ==================== FAQ ====================
const FAQ_DATA = {
  'シフトアプリ': [
    { q: '料金はいくらですか？', a: '月額¥1,980〜です。スタッフ数に合わせてプランを選べます。\n・ベーシック（〜19名・1店舗）：¥1,980/月\n・スタンダード（〜40名・店舗無制限）：¥2,980/月\n・プレミアム（無制限・優先サポート）：¥3,980/月' },
    { q: '無料トライアルはありますか？', a: 'はい！初月1ヶ月間、全機能を無料でお試しいただけます😊\nまずはお気軽にお問い合わせください。' },
    { q: 'スマホで使えますか？', a: 'はい！スマホのホーム画面にインストールしてアプリとして使えます（PWA対応）。' },
    { q: '何名まで登録できますか？', a: 'プランによって異なります。\n・ベーシック：〜19名（1店舗）\n・スタンダード：〜40名（店舗無制限）\n・プレミアム：無制限（店舗無制限）' },
    { q: '解約はできますか？', a: 'はい、解約はこの公式LINEで承っています。\n下のメニューの「規約・プランを確認」→「退会はこちら」よりお手続きください。月末までにお手続きいただくと翌月より解約となります。' },
    { q: 'データは安全ですか？', a: 'お客様ごとに専用のアプリを作成するため、部外者が干渉することはできない仕組みです🔒\nデータも世界水準のDBサービスで暗号化して管理しています。安心してご利用ください。' },
  ],
  'HP作成': [
    { q: '料金はいくらですか？', a: '¥50,000〜となっています。ページ数やデザイン・機能の複雑さによって異なります。まずはご相談ください。' },
    { q: 'スマホ対応のHPは作れますか？', a: 'はい、全てのHPをスマートフォン対応（レスポンシブ）で制作しています。' },
    { q: '完成後に修正できますか？', a: '月7回まで無料で修正対応いたします😊\nそれ以上の修正も別途ご相談ください。' },
    { q: 'どのくらいで完成しますか？', a: '早くて1ヶ月、平均2〜3ヶ月が目安です。\nご要望の内容によって異なりますので、お打ち合わせ後に詳しくお伝えします。' },
    { q: '最低契約期間はありますか？', a: '3ヶ月からのご契約となります。ご不明な点はお気軽にご相談ください😊' },
    { q: 'ドメイン・サーバーは必要ですか？', a: 'ドメインやサーバーが必要な場合はご案内します。お気軽にご相談ください。' },
  ],
  'アプリ制作': [
    { q: '料金はいくらですか？', a: '¥500,000〜となっています。要件によって大きく異なります。まずはご相談ください。' },
    { q: 'iOS・Android両方に対応できますか？', a: 'はい、対応可能です。要件に応じてご提案します。' },
    { q: '開発期間はどのくらいですか？', a: '要件確認後にお伝えします。小規模なら数週間〜、大規模なら数ヶ月が目安です。' },
    { q: '既存のシステムと連携できますか？', a: 'はい、既存システムとのAPI連携にも対応しています。POSレジ・予約システム・勤怠管理など、お気軽にご相談ください😊' },
    { q: '完成後のサポートはありますか？', a: '保守・運用サポートについては個別にご相談ください。' },
  ],
  '料金・支払い': [
    { q: '支払い方法は？', a: 'クレジットカードにてご契約専用サイトよりお支払いいただきます。ご契約時に専用サイトのURLをご案内いたします。' },
    { q: '領収書は発行できますか？', a: 'はい、発行可能でございます。ご入金確認後にお送りいたします。' },
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

  // 社内グループへ通知（fire-and-forget）
  notifyInternalGroup('new_follow', {
    message: `ユーザーID：${userId}${ref ? `\n流入元：${ref}` : ''}`,
  }).catch(() => {});

  // 既存ユーザー確認（ブロック解除・再登録対応）
  const userInfo = await gasPost('getUserInfo', { lineUserId: userId });
  if (userInfo.success) {
    // 再登録前の会話状態（手続き途中）を保存しておく
    const prevConvState = await gasPost('getConversationState', { lineUserId: userId });
    const stateData = {
      isReturning:   true,
      inquiry:       userInfo.inquiry    || '',
      plan:          userInfo.plan       || '',
      trial:         userInfo.trial      || '',
      userStatus:    userInfo.userStatus || '',
      withdrawn:     userInfo.withdrawn  || false,
      lastAction:    userInfo.lastAction || '',
      prevState:     prevConvState?.state     || '',
      prevStateData: prevConvState?.stateData || {},
    };
    await Promise.all([
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'おかえりなさい！OZONONIXです😊\n\n本人確認のため、ご登録時のメールアドレスを教えてください📧',
      }),
      gasPost('setConversationState', { lineUserId: userId, state: 'WAITING_EMAIL', stateData }),
    ]);
    return;
  }

  // 無料相談パターン
  if (ref === 'free') {
    await gasPost('saveUserService', { lineUserId: userId, service: 'consultation' });
    await handleFreeConsultWelcome(event, userId);
    return;
  }

  // お問い合わせフォームからの登録（shift/web）→ メールアドレスを聞く
  if (ref === 'shift' || ref === 'web') {
    const service = ref === 'shift' ? 'shift' : 'web';
    await Promise.all([
      client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'この度はOZONONIXの公式LINEにご登録いただきありがとうございます！\nメールアドレスのご確認はセキュリティ強化のためです。\nお問い合わせ時に入力したメールアドレスを教えてください📧',
      }),
      gasPost('setConversationState', { lineUserId: userId, state: 'WAITING_EMAIL', stateData: {} }),
      gasPost('saveUserService', { lineUserId: userId, service }),
    ]);
    return;
  }

  // 普通の登録（refなし・その他）→ 挨拶 + カルーセル
  await gasPost('saveUserService', { lineUserId: userId, service: 'other' });
  await client.replyMessage(event.replyToken, { type: 'text', text: 'はじめまして。OZONONIXでございます😊' });
  await sleep(1500);
  await client.pushMessage(userId, { type: 'text', text: '友だち追加いただきありがとうございます！\nこのアカウントでは、弊社サービスのご紹介・お問い合わせ対応をしております。' });
  await sleep(1500);
  await client.pushMessage(userId, { type: 'text', text: '弊社では以下の三つのサービスをご提供しております💪\n詳しい資料には、料金・発注から納品までの流れが掲載されております！' });
  await sleep(1500);
  await client.pushMessage(userId, {
    type: 'text',
    text: '🌟 特におすすめは「シフト管理アプリ」です！\n\n✅ 完全カスタマイズ対応\n✅ 他社と比べてリーズナブルな月額料金\n✅ お客様専用に作成するため部外者が干渉できない高いセキュリティ\n✅ シフト提出・作成・勤怠入力がすべて一括管理\n\nぜひ詳細をご覧ください👇',
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
            { type: 'uri', label: '詳しい資料', uri: 'https://ozononix.com/product2/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://ozononix.com/contact' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card2_hp.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: 'HP作成',
          text: '丁寧なカウンセリングと高いカスタマイズ ¥50000〜',
          actions: [
            { type: 'uri', label: '詳しい資料', uri: 'https://ozononix.com/product1/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://ozononix.com/contact' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card3_app.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: '業務効率化アプリ制作',
          text: 'お客様に合わせたアプリを一から制作 ¥500000〜',
          actions: [
            { type: 'uri', label: '詳しい資料', uri: 'https://ozononix.com/product3/' },
            { type: 'uri', label: 'お問い合わせ開始', uri: 'https://ozononix.com/contact' },
          ],
        },
      ],
    },
  });
  await sleep(1500);
  await client.pushMessage(userId, {
    type: 'text',
    text: 'すでにウェブよりお問い合わせいただいた方は、こちらからメールアドレスをご確認ください👇',
    quickReply: {
      items: [{
        type: 'action',
        action: { type: 'message', label: 'お問い合わせ済みの方', text: 'メール認証' },
      }],
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
      return replyText(event.replyToken, 'この度はお問い合わせいただきありがとうございます！\nメールアドレスのご確認はセキュリティ強化のためです。\nお問い合わせ時に入力したメールアドレスを教えてください📧');
    case '無料相談':
      return handleFreeConsultWelcome(event, lineUserId);
    case 'お問い合わせ開始':
      return handleInquiryContact(event, lineUserId);
    case '問合せ種別_質問':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'ご質問・ご相談の対応方法をお選びください😊',
        quickReply: makeQuickReply([
          ['担当者に直接相談', '問合せ対応_担当者'],
          ['キーワードで自動回答', '問合せ対応_キーワード'],
        ]),
      });
    case '問合せ対応_担当者':
      await Promise.all([
        client.replyMessage(event.replyToken, [
          { type: 'text', text: '担当者にお繋ぎいたします。\nこちらに直接メッセージをお送りください😊\n担当者または自動で返答いたします。' },
          { type: 'text', text: '💬 対応時間：平日 10:00〜18:00' },
        ]),
        sendEmail(lineUserId, 'お問い合わせ（ご質問・ご相談）から担当者対応が選ばれました。LINEで担当者対応をお願いします。'),
        notifyInternalGroup('inquiry_keyword', {
          message: 'お問い合わせから「担当者に直接相談」が選択されました。公式LINEアプリから対応してください。',
        }),
      ]);
      return;
    case '問合せ対応_キーワード':
      await gasPost('setConversationState', { lineUserId, state: 'FREE_CONSULT_KEYWORD', stateData: {} });
      return replyText(event.replyToken, 'ご相談の内容をキーワードで入力してください。\n（例：「料金」「機能」「セキュリティ」など）');
    case '問合せ種別_契約':
      return replyText(event.replyToken,
        'ご契約のお申し込みはこちらのフォームよりお願いいたします😊\n\nhttps://ozononix.com/contact\n\nフォーム送信後、このLINEに自動で戻ってきます。'
      );
    case '問合せ種別_追加契約':
      return handleAdditionalContractSelect(event, lineUserId);
    case '追加契約_シフトアプリ':
      return handleAdditionalContractShift(event, lineUserId);
    case '追加契約_HP作成':
      return handleAdditionalContractOther(event, lineUserId, 'HP作成');
    case '追加契約_アプリ制作':
      return handleAdditionalContractOther(event, lineUserId, 'アプリ制作');
    // ==================== 無料相談カテゴリ ====================
    case 'シフトアプリ': return handleConsultCategory(event, 'shift');
    case 'HP制作':       return handleConsultCategory(event, 'hp');
    case 'アプリ制作':   return handleConsultCategory(event, 'app');
    case '料金・費用':   return handleConsultCategory(event, 'price');
    case 'その他':       return handleConsultOther(event);
    case '担当者に相談':
    case 'fd_staff':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '担当者に直接ご連絡しますか？\n担当者または自動で返答いたします😊',
        quickReply: makeQuickReply([
          ['はい、お願いします', 'fc_staff_yes'],
          ['いいえ、大丈夫です', 'fc_staff_no'],
        ]),
      });
    case 'fc_staff_yes': return handleConsultStaff(event, lineUserId);
    case 'fc_staff_no': {
      await gasPost('setConversationState', { lineUserId, state: 'FREE_CONSULT_KEYWORD', stateData: {} });
      return replyText(event.replyToken, 'かしこまりました😊\nご相談の内容をメッセージで教えてください。\nキーワードでも構いません。\n（例：「料金」「機能」「セキュリティ」など）');
    }

    // --- シフトアプリ詳細 ---
    case 'fd_shift_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 料金・プラン】\n\n📱 ベーシック（〜19名・1店舗）：月額¥1,980\n📱 スタンダード（〜40名・店舗無制限）：月額¥2,980\n📱 プレミアム（無制限・優先サポート）：月額¥3,980\n\n初月1ヶ月間・全機能無料でお試しいただけます！\n完全カスタマイズも対応可能です😊' },
        { type: 'text', text: 'ご不明な点はありますか？', quickReply: makeQuickReply([
          ['📝 お申し込みへ',  'シフト申し込み'],
          ['📱 シフトアプリ',  'シフトアプリ'],
          ['担当者に相談',     '担当者に相談'],
        ]) },
      ]);
    case 'fd_shift_feat':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 主な機能】\n\n✅ シフト提出・作成・承認\n✅ 勤怠打刻（出勤・退勤・休憩）\n✅ 勤務時間集計\n✅ CSV出力\n✅ プッシュ通知\n✅ 修正申請機能\n✅ 完全カスタマイズ対応\n\nお客様専用に構築するため、必要な機能だけをシンプルに実装できます😊' },
        { type: 'text', text: 'ご希望の機能やカスタマイズがあればお気軽にお聞かせください😊\nご準備ができましたらお申し込みへどうぞ👇', quickReply: makeQuickReply([
          ['📝 お申し込みへ',  'シフト申し込み'],
          ['📱 シフトアプリ',  'シフトアプリ'],
          ['担当者に相談',     '担当者に相談'],
        ]) },
      ]);
    case 'fd_shift_trial':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【無料体験について】\n\n無料トライアルのご希望はお問い合わせよりご相談ください😊\n担当者がご案内いたします。' },
        { type: 'text', text: '担当者に直接ご連絡しますか？', quickReply: makeQuickReply([['はい、お願いします', 'fc_staff_yes'], ['他の質問をする', 'fc_staff_no']]) },
      ]);
    case 'fd_shift_users':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【スタッフ人数について】\n\n・ベーシック：〜19名（1店舗）\n・スタンダード：〜40名（店舗無制限）\n・プレミアム：無制限（店舗無制限）\n\nスタッフ数が増えても、プラン変更で柔軟に対応できます😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_shift_sec':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【セキュリティについて】\n\nお客様ごとに専用アプリを作成するため、部外者が干渉することはできない仕組みです🔒\nデータは世界水準のDBで暗号化して安全に管理しています。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);

    // --- シフトアプリ 申し込み・支払いフロー ---
    case 'シフト申し込み':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: 'シフト管理アプリのお申し込みをご検討いただきありがとうございます😊\n\nご希望の機能やカスタマイズがあれば、この画面でそのままメッセージをお送りください。\n担当者が確認のうえアプリに反映いたします！' },
        { type: 'text', text: 'ご希望のプランをお選びください👇\n\n📱 ベーシック（〜19名・1店舗）：月額¥1,980\n📱 スタンダード（〜40名・店舗無制限）：月額¥2,980\n📱 プレミアム（無制限・優先サポート）：月額¥3,980', quickReply: makeQuickReply([
          ['ベーシック ¥1,980/月',   'シフト支払い_ベーシック'],
          ['スタンダード ¥2,980/月', 'シフト支払い_スタンダード'],
          ['プレミアム ¥3,980/月',   'シフト支払い_プレミアム'],
          ['担当者に相談',           '担当者に相談'],
        ]) },
      ]);
    case 'シフト支払い_ベーシック':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【ベーシックプラン 月額¥1,980】\n対象：スタッフ〜19名・1店舗\n\nこちらからお支払いをお願いいたします👇\nhttps://buy.stripe.com/3cIaEPcF97mG5dHaAI0sU00' },
        { type: 'text', text: 'お支払い完了後、担当者よりアプリのセットアップについてご連絡いたします😊\nご不明な点があればお気軽にどうぞ！', quickReply: makeQuickReply([
          ['担当者に相談', '担当者に相談'],
          ['プランを変更', 'シフト申し込み'],
        ]) },
      ]);
    case 'シフト支払い_スタンダード':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【スタンダードプラン 月額¥2,980】\n対象：スタッフ〜40名・店舗数無制限\n\nこちらからお支払いをお願いいたします👇\nhttps://buy.stripe.com/aFa28j34z4aucG9aAI0sU01' },
        { type: 'text', text: 'お支払い完了後、担当者よりアプリのセットアップについてご連絡いたします😊\nご不明な点があればお気軽にどうぞ！', quickReply: makeQuickReply([
          ['担当者に相談', '担当者に相談'],
          ['プランを変更', 'シフト申し込み'],
        ]) },
      ]);
    case 'シフト支払い_プレミアム':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【プレミアムプラン 月額¥3,980】\n対象：スタッフ数・店舗数無制限・優先サポート\n\nこちらからお支払いをお願いいたします👇\nhttps://buy.stripe.com/bJe6ozfRlayS35zgZ60sU02' },
        { type: 'text', text: 'お支払い完了後、担当者よりアプリのセットアップについてご連絡いたします😊\nご不明な点があればお気軽にどうぞ！', quickReply: makeQuickReply([
          ['担当者に相談', '担当者に相談'],
          ['プランを変更', 'シフト申し込み'],
        ]) },
      ]);

    // --- HP詳細 ---
    case 'fd_hp_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 料金】\n\n¥50,000〜です。\nページ数・デザイン・機能によって異なります。まずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_hp_period':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 期間】\n\nご要望によって異なりますが、打ち合わせ後に目安をお伝えします。\nまずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_hp_mobile':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【スマホ対応について】\n\nすべてのHPをスマートフォン対応（レスポンシブ）で制作しています😊\nPC・スマホ・タブレットで最適に表示されます。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_hp_custom':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP カスタマイズ】\n\nお客様のご要望に合わせて柔軟に対応します😊\nご希望のデザインや機能をお伝えください。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);

    // --- アプリ制作詳細 ---
    case 'fd_app_price':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ制作 料金】\n\n¥500,000〜です。\n要件によって大きく異なります。まずはお気軽にご相談ください😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_app_period':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ開発 期間】\n\n・小規模：数週間〜\n・大規模：数ヶ月〜\n\n要件確認後に目安をお伝えします😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_app_ios':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【iOS・Android対応】\n\n両方に対応可能です😊\n要件に応じて最適な方法をご提案します。' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);

    // --- 料金詳細 ---
    case 'fd_price_shift':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【シフトアプリ 月額料金】\n・ベーシック（〜19名・1店舗）：¥1,980/月\n・スタンダード（〜40名・店舗無制限）：¥2,980/月\n・プレミアム（無制限・優先サポート）：¥3,980/月\n\n他社と比べて圧倒的にお得です😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_price_hp':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【HP制作 料金】\n¥50,000〜です。\nページ数・機能によって異なります😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_price_app':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【アプリ制作 料金】\n¥500,000〜です。\n要件によって異なります😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
      ]);
    case 'fd_price_payment':
      return client.replyMessage(event.replyToken, [
        { type: 'text', text: '【支払い方法】\nクレジットカードにてご契約専用サイトよりお支払いいただきます。\nご契約時に専用サイトのURLをご案内いたします😊' },
        { type: 'text', text: '他にご質問はありますか？', quickReply: consultFollowupQR() },
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
    case '返答_OK':
      await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
      return replyText(event.replyToken, 'お役に立てて良かったです😊\nまたいつでもお気軽にお声がけください！');
    case '返答_担当者':
      await Promise.all([
        gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
        sendEmail(lineUserId, '自動返答後に「担当者に相談」が選択されました。LINEアプリから対応をお願いします。'),
        notifyInternalGroup('inquiry_keyword', {
          message: 'キーワード自動返答後に「担当者に相談」が選択されました。公式LINEアプリから対応してください。',
        }),
      ]);
      return replyText(event.replyToken, '担当者にお繋ぎいたします。しばらくお待ちください🙏\n\n💬 対応時間：平日 10:00〜18:00\nお時間をいただく場合がございますが、担当者または自動で返答いたします。');
  }

  // --- FAQ カテゴリ選択 ---
  if (text.startsWith('FAQ_')) {
    return handleFaqCategory(event, text.replace('FAQ_', ''));
  }

  // --- お問い合わせサービス選択 ---
  if (text.startsWith('問い合わせ_')) {
    return handleInquiryService(event, text.replace('問い合わせ_', ''), lineUserId);
  }

  // --- 会話状態を先に確認（INQUIRY_EMAIL等のバグ修正のため順序変更）---
  const { state, stateData } = await gasPost('getConversationState', { lineUserId });

  switch (state) {
    case 'WAITING_EMAIL':
      return handleEmailInput(event, text, lineUserId);
    case 'INQUIRY_EMAIL':
      return handleInquiryEmail(event, text, lineUserId, stateData);
    case 'INQUIRY_NAME':
      return handleInquiryName(event, text, lineUserId, stateData);
    case 'INQUIRY_DETAILS':
      return handleInquiryDetails(event, text, lineUserId, stateData);
    case 'WAITING_CUSTOMIZATION':
      return handleCustomizationReply(event, text, lineUserId, stateData);
    case 'WAITING_CUSTOMIZATION_DETAILS':
      return handleCustomizationDetails(event, lineUserId, stateData);
    case 'WAITING_PLAN_CHANGE_SELECT':
      return handlePlanChangeSelect(event, text, lineUserId, stateData);
    case 'WAITING_PLAN_CHANGE_CONFIRM':
      return handlePlanChangeConfirm(event, text, lineUserId, stateData);
    case 'WAITING_INFO_FIELD_SELECT':
      return handleInfoFieldSelect(event, text, lineUserId);
    case 'WAITING_WITHDRAW_CONFIRM':
      return handleWithdrawConfirm(event, text, lineUserId);
    case 'FREE_CONSULT_KEYWORD':
      return handleFreeConsultKeyword(event, text, lineUserId);
    case 'KEYWORD_REPLIED':
      return handleKeywordRetry(event, text, lineUserId, stateData);
    default:
      if (state && state.startsWith('WAITING_INFO_CHANGE_VALUE:')) {
        return handleInfoChangeValue(event, text, lineUserId, state.split(':')[1]);
      }
  }

  // --- メールアドレス入力（状態なし時のみ）---
  if (text.includes('@') && text.includes('.')) {
    return handleEmailInput(event, text, lineUserId);
  }

  // --- キーワードマッチング → 満足度QR付き返答 ---
  const match = findKeyword(text);
  if (match) {
    return replyWithSatisfaction(event, match, lineUserId);
  }

  // --- 未判定メッセージ ---
  return handleUnknownFallback(event, text, lineUserId);
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
      ['他の商品も契約', '問合せ種別_追加契約'],
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
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  await Promise.all([
    gasPost('saveInquiry', {
      lineUserId,
      name: text,
      email: stateData.email,
      service: stateData.service,
      details: stateData.details,
    }),
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    gasPost('updateUserStatus', { lineUserId, status: '問い合わせ中' }),
    gasPost('updateLastAction', { lineUserId, action_label: `お問い合わせ完了（${stateData.service}）` }),
    sendEmail(lineUserId, `LINEお問い合わせが完了しました。\nお名前：${text}\nサービス：${stateData.service}\n内容：${stateData.details}`),
    // 社内グループへ全内容通知
    notifyInternalGroup('inquiry_full', {
      detail: {
        name: text,
        email: stateData.email,
        service: stateData.service,
        content: stateData.details,
        time: now,
      },
    }),
  ]);
  await client.replyMessage(event.replyToken, [
    { type: 'text', text: `${text}様、ありがとうございます！` },
    { type: 'text', text: '担当者が確認しておりますので、しばらくお待ちください。\nご連絡はいただいたメールアドレスにお送りします📧' },
  ]);
}

// ==================== 他サービスカルーセル ====================
function makeOtherServicesCarousel(currentInquiry) {
  const all = [
    {
      key: 'シフト',
      thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card1_shift.png',
      title: 'シフト管理アプリ',
      text: 'シフト管理・勤怠・集計まで完結 ¥1,980〜',
      detailUri: 'https://ozononix.com/product2/',
    },
    {
      key: 'HP',
      thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card2_hp.png',
      title: 'HP作成',
      text: '丁寧なカウンセリングと高いカスタマイズ ¥50,000〜',
      detailUri: 'https://ozononix.com/product1/',
    },
    {
      key: 'アプリ',
      thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card3_app.png',
      title: '業務効率化アプリ制作',
      text: 'お客様に合わせたアプリを一から制作 ¥500,000〜',
      detailUri: 'https://ozononix.com/product3/',
    },
  ];
  const filtered = currentInquiry
    ? all.filter(s => !currentInquiry.includes(s.key))
    : all;
  const columns = (filtered.length > 0 ? filtered : all).map(s => ({
    thumbnailImageUrl: s.thumbnailImageUrl,
    imageAspectRatio: 'rectangle',
    imageSize: 'cover',
    title: s.title,
    text: s.text,
    actions: [
      { type: 'uri', label: '詳しい資料', uri: s.detailUri },
      { type: 'uri', label: 'お問い合わせ', uri: 'https://ozononix.com/contact' },
    ],
  }));
  return {
    type: 'template',
    altText: '他のサービスのご紹介',
    template: { type: 'carousel', columns },
  };
}

// ==================== メール認証 → サービス判定 ====================
async function handleEmailInput(event, email, lineUserId) {
  // 現在の会話状態を取得（復帰ユーザーかどうか確認）
  const currentState = await gasPost('getConversationState', { lineUserId });
  const isReturning    = currentState?.stateData?.isReturning  || false;
  const prevLastAction = currentState?.stateData?.lastAction   || '';

  const result = await gasPost('linkUser', { email, lineUserId });

  if (!result.success) {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'メールアドレスが見つかりませんでした。\n\nまずウェブのお問い合わせフォームからお申し込みください👇\nhttps://ozononix.com/contact\n\nお申し込み後、こちらでメールアドレスをご入力ください。',
    });
  }
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });

  const { inquiry, plan, trial } = result;
  const isShift = (inquiry && inquiry.includes('シフト')) || result.service === 'shift';

  // ==================== 復帰ユーザー専用フロー ====================
  if (isReturning) {
    const prevState     = currentState?.stateData?.prevState     || '';
    const prevStateData = currentState?.stateData?.prevStateData || {};
    const savedStatus   = currentState?.stateData?.userStatus    || '';
    const savedWithdrawn = currentState?.stateData?.withdrawn    || false;

    // ---- パターン1: 手続き途中（前回の会話状態を復元）----
    const MID_PROCESS_STATES = ['WAITING_CUSTOMIZATION', 'WAITING_CUSTOMIZATION_DETAILS'];
    if (MID_PROCESS_STATES.includes(prevState)) {
      await gasPost('setConversationState', { lineUserId, state: prevState, stateData: prevStateData });
      const plan = prevStateData?.plan || '';
      const resumeMessages = [
        { type: 'text', text: '✅ 本人確認が完了しました😊\n\n以前の手続きの続きからご案内します。' },
      ];
      if (prevState === 'WAITING_CUSTOMIZATION') {
        const featuresUrl = `${GAS_URL}?page=shift-features&plan=${encodeURIComponent(plan)}`;
        resumeMessages.push({
          type: 'text',
          text: `シフトアプリの機能・プラン詳細はこちら👇\n${featuresUrl}`,
        });
        resumeMessages.push({
          type: 'text',
          text: '独自カスタマイズをご希望ですか？',
          quickReply: makeQuickReply([['はい', 'カスタマイズ_はい'], ['いいえ', 'カスタマイズ_いいえ']]),
        });
      } else if (prevState === 'WAITING_CUSTOMIZATION_DETAILS') {
        resumeMessages.push({
          type: 'text',
          text: 'カスタマイズの希望内容をメッセージでお送りください😊\n\n【記載例】\n・〇〇の機能を追加したい\n・画面デザインを変更したい',
        });
      }
      await client.replyMessage(event.replyToken, resumeMessages);
      return;
    }

    // ---- パターン2: 解約済み ----
    if (savedWithdrawn || savedStatus === '解約済み') {
      await client.replyMessage(event.replyToken, [
        { type: 'text', text: 'お戻りいただきありがとうございます！😊\n以前OZONONIXをご利用いただいておりました。\n\n他のサービスもご用意しておりますのでぜひご覧ください👇' },
        makeOtherServicesCarousel(''),
        {
          type: 'text',
          text: '何かご質問はございますか？',
          quickReply: makeQuickReply([
            ['よくあるQ&A', 'よくあるQ&A'],
            ['お問い合わせ', 'お問い合わせ開始'],
          ]),
        },
      ]);
      return;
    }

    // ---- パターン3: 支払い待ち ----
    if (savedStatus === '支払い待ち') {
      const paymentUrl = STRIPE_PAYMENT_URLS[plan] || '';
      const msgs = [
        {
          type: 'text',
          text: [
            '✅ 本人確認が完了しました😊',
            '',
            '【ご利用状況】',
            inquiry ? `📦 サービス: ${inquiry}` : '',
            plan    ? `📋 プラン: ${plan}（¥${(PLAN_INFO[plan]?.price || 0).toLocaleString()}/月）` : '',
            '⏳ ステータス: お支払い待ち',
          ].filter(Boolean).join('\n'),
        },
      ];
      if (paymentUrl) {
        msgs.push({ type: 'text', text: `お支払いはこちらから完了できます👇\n${paymentUrl}` });
      }
      msgs.push({
        type: 'text',
        text: 'ご不明な点はございますか？',
        quickReply: makeQuickReply([['担当者に相談', '担当者に相談'], ['よくあるQ&A', 'よくあるQ&A']]),
      });
      await client.replyMessage(event.replyToken, msgs);
      return;
    }

    // ---- パターン4: 問い合わせ中（担当者確認待ち）----
    if (savedStatus === '問い合わせ中') {
      await client.replyMessage(event.replyToken, [
        {
          type: 'text',
          text: [
            '✅ 本人確認が完了しました😊',
            '',
            '【ご利用状況】',
            inquiry ? `📦 サービス: ${inquiry}` : '',
            '⏳ ステータス: 担当者が確認中です',
          ].filter(Boolean).join('\n'),
        },
        {
          type: 'text',
          text: '追加のご質問はございますか？',
          quickReply: makeQuickReply([
            ['よくあるQ&A', 'よくあるQ&A'],
            ['担当者に相談', '担当者に相談'],
            ['お問い合わせ', 'お問い合わせ開始'],
          ]),
        },
      ]);
      return;
    }

    // ---- パターン5: 利用中 / その他（手続き完了ユーザー）----
    const welcomeText = [
      '✅ 本人確認が完了しました😊',
      '',
      '【ご利用中のサービス】',
      inquiry            ? `📦 ${inquiry}` : '',
      (isShift && plan)  ? `📋 プラン: ${plan}（¥${(PLAN_INFO[plan]?.price || 0).toLocaleString()}/月）` : '',
      prevLastAction     ? `🕐 最後の操作: ${prevLastAction}` : '',
    ].filter(Boolean).join('\n');

    const qrOptions = [
      ['よくあるQ&A', 'よくあるQ&A'],
      ['お問い合わせ', 'お問い合わせ開始'],
      ...(isShift ? [['プラン・規約を確認', '規約・プランを確認']] : []),
    ];

    await client.replyMessage(event.replyToken, [
      { type: 'text', text: welcomeText },
      { type: 'text', text: '他のサービスもご覧いただけます👇' },
      makeOtherServicesCarousel(inquiry || ''),
      { type: 'text', text: '何かご質問はございますか？', quickReply: makeQuickReply(qrOptions) },
    ]);
    return;
  }

  // ==================== 新規ユーザーフロー ====================
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
        { type: 'text', text: 'お問い合わせ内容をご確認の上、担当者よりカウンセリングのご連絡をいたします。\nしばらくお待ちください。' },
      ]),
      sendEmail(lineUserId, 'メール認証完了（HP/アプリ制作）。担当者からのカウンセリング対応をお願いします。'),
    ]);
  }
}

// ==================== カスタマイズフロー ====================
async function handleCustomizationReply(event, text, lineUserId, stateData) {
  const plan = stateData?.plan || '';
  const paymentUrl = STRIPE_PAYMENT_URLS[plan] || '';

  if (text === 'カスタマイズ_いいえ') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    const messages = [
      { type: 'text', text: 'カスタマイズについてのご質問ありがとうございます！' },
      { type: 'text', text: 'ありがとうございます。\n担当者にお繋ぎいたします。\n\n現在お客様専用のアプリを制作中でございます。\n完成次第、担当者よりご連絡いたします。\nどうぞよろしくお願いいたします😊' },
    ];
    if (paymentUrl) {
      messages.push({ type: 'text', text: `ご利用開始に向けてお支払いのご準備をお願いいたします👇\n${paymentUrl}` });
    }
    await Promise.all([
      client.replyMessage(event.replyToken, messages),
      gasPost('updateUserStatus', { lineUserId, status: '支払い待ち' }),
      gasPost('updateLastAction', { lineUserId, action_label: `カスタマイズ不要・支払い待ち（${plan}）` }),
      sendEmail(lineUserId, `シフトアプリ契約者がカスタマイズ不要と回答しました。専用アプリの制作を開始してください。プラン：${plan}`),
      notifyInternalGroup('customization', {
        message: `シフトアプリ契約者がカスタマイズ不要と回答しました。\nプラン：${plan}\nアプリ制作を開始してください。`,
      }),
    ]);
    return;
  }
  if (text === 'カスタマイズ_はい') {
    await gasPost('setConversationState', { lineUserId, state: 'WAITING_CUSTOMIZATION_DETAILS', stateData });
    return replyText(event.replyToken,
      'カスタマイズについてのご質問ありがとうございます！\n\nどのような変更・機能追加をご希望でしょうか？\nできる限り具体的にお教えいただけますと、よりスムーズに対応できます😊\n\n【記載例】\n・〇〇という機能を追加したい\n・画面のデザインを〇〇のようにしたい\n・〇〇の操作をもっと簡単にしたい\n\nご希望をそのままメッセージでお送りください👇'
    );
  }
}

async function handleCustomizationDetails(event, lineUserId, stateData) {
  const customText = event.message.text;
  const plan = stateData?.plan || '';
  const paymentUrl = STRIPE_PAYMENT_URLS[plan] || '';
  await Promise.all([
    gasPost('saveCustomization', { lineUserId, content: customText }),
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    gasPost('updateUserStatus', { lineUserId, status: '支払い待ち' }),
    gasPost('updateLastAction', { lineUserId, action_label: `カスタマイズ要望送信・支払い待ち（${plan}）` }),
    sendEmail(lineUserId, `シフトアプリ契約者からカスタマイズ要望が届きました。内容：${customText}\nプラン：${plan}`),
    notifyInternalGroup('customization', {
      message: `シフトアプリ契約者からカスタマイズ要望が届きました。\nプラン：${plan}\n内容：${customText}`,
    }),
  ]);
  const messages = [
    { type: 'text', text: 'ご要望を承りました。ありがとうございます😊\n担当者にお繋ぎいたします。しばらくお待ちください。' },
  ];
  if (paymentUrl) {
    messages.push({ type: 'text', text: `ご利用開始に向けてお支払いのご準備をお願いいたします👇\n${paymentUrl}` });
  }
  await client.replyMessage(event.replyToken, messages);
}

// ==================== 規約・プラン ====================
async function handlePlanCheck(event) {
  const lineUserId = event.source.userId;
  const result = await gasPost('getUserInfo', { lineUserId });

  if (!result.success) {
    return replyText(event.replyToken, '現在契約中のプランはありません。\nご利用をご希望の方は、お問い合わせボタンよりお申し込みください。');
  }

  const { email, inquiry, plan, trial, budget, withdrawn } = result;
  if (withdrawn) return replyText(event.replyToken, '退会済みのアカウントとなっております。');

  const isShift = inquiry && inquiry.includes('シフト');
  const infoText = [
    '【ご契約情報】',
    `📧 メール: ${email || '未設定'}`,
    `📦 サービス: ${inquiry || '未設定'}`,
    isShift && plan ? `📋 プラン: ${plan}` : '',
    trial ? `🆓 無料トライアル: ${trial}` : '',
    budget ? `💰 ご予算: ${budget}` : '',
  ].filter(Boolean).join('\n');

  const agreementsText = '【同意事項・規約】\n・個人情報保護方針\n・特定商取引法に基づく表記\n・利用規約\n\n詳細はこちらよりご確認ください👇\nhttps://ozononix.com/contact';

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
    type: 'text', text: '変更したい項目をお選びください。',
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
    return replyText(event.replyToken, 'キャンセルしました。またいつでもお気軽にご連絡ください。');
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
  const fieldLabel = { email: 'メールアドレス', budget: 'ご予算' }[field] || field;
  await Promise.all([
    gasPost('updateUserInfo', { lineUserId, field, value: text }),
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    sendEmail(lineUserId, `契約情報が変更されました。\n変更項目: ${fieldLabel}\n新しい値: ${text}`),
  ]);
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
    return replyText(event.replyToken, 'キャンセルしました。またいつでもお気軽にご連絡ください。');
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
    return replyText(event.replyToken, 'プラン変更をキャンセルしました。またいつでもお気軽にご連絡ください。');
  }
  if (text === '変更する') {
    const result = await gasPost('changePlan', { lineUserId, newPlan: stateData.newPlan });
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    if (result.success) {
      await Promise.all([
        sendEmail(lineUserId, `プランが変更されました。\n変更前: ${stateData.currentPlan}\n変更後: ${stateData.newPlan}\n翌月より新プランが適用されます。`),
        gasPost('updateUserStatus', { lineUserId, status: '利用中' }),
        gasPost('updateLastAction', { lineUserId, action_label: `プラン変更（${stateData.currentPlan}→${stateData.newPlan}）` }),
      ]);
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
    text: '⚠️ 退会処理を行います。\n退会されますと、すべてのサービスがご利用いただけなくなります。\n\n本当に退会されますか？',
    quickReply: makeQuickReply([['退会する', '退会する'], ['キャンセル', 'キャンセル_退会']]),
  });
}

async function handleWithdrawConfirm(event, text, lineUserId) {
  if (text === 'キャンセル_退会') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return replyText(event.replyToken, '退会をキャンセルしました。ご利用ありがとうございます。');
  }
  if (text === '退会する') {
    await Promise.all([
      gasPost('withdraw', { lineUserId }),
      gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
      gasPost('updateUserStatus', { lineUserId, status: '解約済み' }),
      gasPost('updateLastAction', { lineUserId, action_label: '退会手続き完了' }),
      sendEmail(lineUserId, `退会処理が完了しました。\nLINEユーザーID: ${lineUserId}\n対応が必要な場合はご確認ください。`),
    ]);
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

// キーワード回答後に満足度QRを表示
async function replyWithSatisfaction(event, match, lineUserId) {
  const originalText = event.message.text;
  await Promise.all([
    gasPost('setConversationState', {
      lineUserId,
      state: 'KEYWORD_REPLIED',
      stateData: { lastQuery: originalText, lastMatchWord: match.words[0] },
    }),
    client.replyMessage(event.replyToken, [
      { type: 'text', text: match.reply },
      {
        type: 'text',
        text: 'この回答はお役に立てましたか？',
        quickReply: makeQuickReply([
          ['✅ 解決しました', '返答_OK'],
          ['👤 担当者に相談', '返答_担当者'],
          ['🔄 別の方法で探す', '返答_再試行'],
        ]),
      },
    ]),
  ]);
}

// キーワード再試行（同じ回答にならないよう別のソースから検索）
async function handleKeywordRetry(event, text, lineUserId, stateData) {
  // 別のメッセージが来た場合（再試行ボタン以外）は新規扱い
  if (text !== '返答_再試行') {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    const newMatch = findKeyword(text);
    if (newMatch) return replyWithSatisfaction(event, newMatch, lineUserId);
    // キーワードにも合致しなければ担当者フロー
    return handleUnknownFallback(event, text, lineUserId);
  }

  const lastQuery  = stateData?.lastQuery     || '';
  const lastWord   = stateData?.lastMatchWord || '';

  // FAQから検索（キーワードルールとは別ソース）
  const faqMatch = findFaq(lastQuery);
  if (faqMatch) {
    await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: `【別の回答】\n\n${faqMatch.q}\n\n${faqMatch.a}` },
      {
        type: 'text',
        text: 'こちらはいかがでしょうか？',
        quickReply: makeQuickReply([
          ['✅ 解決しました', '返答_OK'],
          ['👤 担当者に相談', '返答_担当者'],
        ]),
      },
    ]);
  }

  // それでも見つからない場合は担当者へ
  await Promise.all([
    gasPost('setConversationState', { lineUserId, state: '', stateData: {} }),
    sendEmail(lineUserId, `自動返答の再試行で追加回答が見つかりませんでした。\n元の質問: ${lastQuery}`),
    notifyInternalGroup('inquiry_keyword', {
      message: `「${lastQuery}」について自動返答後に再試行されましたが追加回答がありません。担当者の対応をお願いします。`,
    }),
  ]);
  return client.replyMessage(event.replyToken, [
    { type: 'text', text: 'ご不便をおかけして申し訳ございません🙏\n他にご案内できる情報が見つかりませんでした。\n\n担当者より詳しくご案内いたします。\n担当者または自動で返答いたします。' },
    { type: 'text', text: '💬 対応時間：平日 10:00〜18:00' },
  ]);
}

// 未判定メッセージの共通処理（handleMessage・handleKeywordRetry から呼ぶ）
async function handleUnknownFallback(event, text, lineUserId) {
  (async () => {
    let displayName = '顧客';
    try {
      const profile = await client.getProfile(lineUserId);
      displayName = profile.displayName;
    } catch (e) {}
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    notifyInternalGroup('new_message', {
      message: `顧客名：${displayName}\nメッセージ：${text}\n🕐 ${now}\n👉 タスク管理アプリの「顧客対応」から返信してください`,
    }).catch(() => {});
    fetch(TASK_GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _source: 'liff', action: 'saveCustomerMessage', lineUserId, displayName, message: text }),
    }).catch(() => {});
  })();

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'メッセージありがとうございます😊\n\n以下よりご用件をお選びください。\n\n📋 よくあるQ&A：料金・解約・セキュリティなどのよくある質問\n💬 お問い合わせ：ご質問・ご相談または契約のお申し込み\n📄 規約・プラン：ご契約内容の確認・変更・退会',
    quickReply: makeQuickReply([
      ['よくあるQ&A', 'よくあるQ&A'],
      ['お問い合わせ', 'お問い合わせ開始'],
      ['規約・プランを確認', '規約・プランを確認'],
    ]),
  });
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

// ==================== 社内グループ通知 ====================
async function notifyInternalGroup(type, payload) {
  if (!INTERNAL_BOT_TOKEN) {
    console.error('[INTERNAL NOTIFY] INTERNAL_BOT_TOKEN が未設定です');
    return { ok: false, error: 'TOKEN_NOT_SET' };
  }
  let msg = '';
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  if (type === 'inquiry_keyword') {
    msg = `🔔【公式LINE 担当者接続依頼】\n─────────────────\n${payload.message || ''}\n🕐 受付：${now}\n👉 公式LINEアプリから対応してください`;
  } else if (type === 'inquiry_full') {
    const d = payload.detail || payload;
    msg = `📩【公式LINE お問い合わせ】\n─────────────────\n📛 氏名：${d.name || '未入力'}\n📧 メール：${d.email || '未入力'}\n📦 サービス：${d.service || '未入力'}\n📝 内容：${d.content || ''}\n🕐 受付：${now}\n─────────────────\n👉 公式LINEアプリから返信してください`;
  } else if (type === 'new_message') {
    msg = `💬【公式LINE 新着メッセージ】\n─────────────────\n${payload.message || ''}\n🕐 ${now}\n👉 公式LINEアプリから返信してください`;
  } else if (type === 'new_follow') {
    msg = `👤【公式LINE 新規友達追加】\n─────────────────\n${payload.message || '新しいユーザーが友達追加しました'}\n🕐 ${now}`;
  } else if (type === 'customization') {
    msg = `🔧【公式LINE カスタマイズ依頼】\n─────────────────\n${payload.message || ''}\n🕐 受付：${now}\n👉 担当者が対応してください`;
  }
  if (!msg) return { ok: false, error: 'UNKNOWN_TYPE' };
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${INTERNAL_BOT_TOKEN}` },
      body: JSON.stringify({ to: INTERNAL_GROUP_ID, messages: [{ type: 'text', text: msg }] }),
    });
    const resBody = await res.json();
    if (!res.ok) {
      console.error('[INTERNAL NOTIFY FAILED]', res.status, JSON.stringify(resBody));
      return { ok: false, status: res.status, body: resBody };
    }
    console.log('[INTERNAL NOTIFY OK]', type);
    return { ok: true };
  } catch (err) {
    console.error('[INTERNAL NOTIFY ERROR]', err.message);
    return { ok: false, error: err.message };
  }
}

// ==================== 無料相談フロー ====================
// 「他にご質問はありますか？」共通クイックリプライ（全カテゴリ表示）
function consultFollowupQR() {
  return makeQuickReply([
    ['📱 シフトアプリ', 'シフトアプリ'],
    ['🌐 HP制作',       'HP制作'],
    ['💻 アプリ制作',   'アプリ制作'],
    ['💰 料金・費用',   '料金・費用'],
    ['💬 その他',       'その他'],
    ['担当者に相談',    '担当者に相談'],
  ]);
}

async function handleFreeConsultWelcome(event, userId) {
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'こんにちは！OZONONIXでございます😊\n無料相談へのご登録ありがとうございます！',
  });
  await sleep(1200);
  await client.pushMessage(userId, {
    type: 'text',
    text: 'どのようなことについてご相談でしょうか？\nお気軽にお選びください👇',
    quickReply: makeQuickReply([
      ['📱 シフトアプリ', 'シフトアプリ'],
      ['🌐 HP制作',       'HP制作'],
      ['💻 アプリ制作',   'アプリ制作'],
      ['💰 料金・費用',   '料金・費用'],
      ['💬 その他',       'その他'],
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
        ['📝 お申し込みへ', 'シフト申し込み'],
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
    quickReply: consultFollowupQR(),
  });
}

async function handleConsultStaff(event, lineUserId) {
  await Promise.all([
    client.replyMessage(event.replyToken, [
      { type: 'text', text: '担当者にお取り次ぎいたします。しばらくお待ちください🙏' },
      { type: 'text', text: '💬 対応時間：平日 10:00〜18:00\n（時間外のお問い合わせは翌営業日に対応いたします）' },
    ]),
    sendEmail(lineUserId, '無料相談から担当者接続が選ばれました。LINEで担当者対応をお願いします。'),
    // 社内グループへキーワード通知（無料相談から担当者接続）
    notifyInternalGroup('inquiry_keyword', {
      message: '無料相談から「担当者に繋ぐ」が選択されました。公式LINEアプリから対応してください。',
    }),
  ]);
}

// ==================== キーワード自由入力 → 回答 → お問い合わせURL ====================
async function handleFreeConsultKeyword(event, text, lineUserId) {
  await gasPost('setConversationState', { lineUserId, state: '', stateData: {} });

  const contactUrl = 'https://ozononix.com/contact';
  const contactMsg = {
    type: 'text',
    text: '他にご不明な点がございましたらお気軽にどうぞ😊\n\n📩 お問い合わせはこちら\n' + contactUrl,
    quickReply: makeQuickReply([
      ['担当者に相談', 'fd_staff'],
      ['別のカテゴリ', 'fc_other'],
    ]),
  };

  // キーワードルールから検索
  const keyMatch = findKeyword(text);
  if (keyMatch) {
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: keyMatch.reply },
      contactMsg,
    ]);
  }

  // FAQから検索
  const faqMatch = findFaq(text);
  if (faqMatch) {
    return client.replyMessage(event.replyToken, [
      { type: 'text', text: `【${faqMatch.q}】\n\n${faqMatch.a}` },
      contactMsg,
    ]);
  }

  // 何もマッチしない場合
  return client.replyMessage(event.replyToken, [
    { type: 'text', text: 'ご質問ありがとうございます😊\nいただいた内容については担当者が詳しくご案内いたします。' },
    contactMsg,
  ]);
}

// ==================== 追加契約フロー ====================
async function handleAdditionalContractSelect(event, lineUserId) {
  await client.replyMessage(event.replyToken, {
    type: 'template',
    altText: '追加契約 サービス一覧',
    template: {
      type: 'carousel',
      columns: [
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card1_shift.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: 'シフト管理アプリ',
          text: 'シフト管理・勤怠・集計まで完結 ¥1500〜',
          actions: [
            { type: 'message', label: 'タッチしてください', message: '追加契約_シフトアプリ' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card2_hp.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: 'HP作成',
          text: '丁寧なカウンセリングと高いカスタマイズ ¥50000〜',
          actions: [
            { type: 'message', label: 'タッチしてください', message: '追加契約_HP作成' },
          ],
        },
        {
          thumbnailImageUrl: 'https://line-webhook-rho-one.vercel.app/card3_app.png',
          imageAspectRatio: 'rectangle', imageSize: 'cover',
          title: '業務効率化アプリ制作',
          text: 'お客様に合わせたアプリを一から制作 ¥500000〜',
          actions: [
            { type: 'message', label: 'タッチしてください', message: '追加契約_アプリ制作' },
          ],
        },
      ],
    },
  });
}

async function handleAdditionalContractShift(event, lineUserId) {
  await Promise.all([
    gasPost('appendService', { lineUserId, service: 'シフト管理アプリ' }),
    gasPost('setConversationState', {
      lineUserId, state: 'WAITING_CUSTOMIZATION',
      stateData: { inquiry: 'シフト管理アプリ', plan: '' },
    }),
  ]);
  await client.replyMessage(event.replyToken, [
    { type: 'text', text: 'シフト管理アプリのご契約をご希望いただきありがとうございます！' },
    {
      type: 'text',
      text: '【シフトアプリ プラン】\n📱 ベーシック（〜19名・1店舗）：¥1,980/月\n📱 スタンダード（〜40名・店舗無制限）：¥2,980/月\n📱 プレミアム（無制限・優先サポート）：¥3,980/月\n\nプランは担当者がご確認のうえご案内いたします。',
    },
    {
      type: 'text',
      text: '独自カスタマイズをご希望ですか？',
      quickReply: makeQuickReply([
        ['はい', 'カスタマイズ_はい'],
        ['いいえ', 'カスタマイズ_いいえ'],
      ]),
    },
  ]);
}

async function handleAdditionalContractOther(event, lineUserId, serviceName) {
  await Promise.all([
    gasPost('appendService', { lineUserId, service: serviceName }),
    sendEmail(lineUserId, `追加契約のご希望（${serviceName}）が届きました。担当者よりカウンセリングをお願いします。`),
  ]);
  await client.replyMessage(event.replyToken, [
    { type: 'text', text: `${serviceName}のご契約をご希望いただきありがとうございます！` },
    { type: 'text', text: 'お問い合わせ内容をご確認の上、担当者よりカウンセリングのご連絡をいたします。\nしばらくお待ちください。' },
  ]);
}

function findFaq(text) {
  const t = text.toLowerCase().replace(/\s/g, '');
  for (const items of Object.values(FAQ_DATA)) {
    for (const item of items) {
      const words = item.q.toLowerCase().replace(/[・。、\s]/g, '').split('');
      // 2文字以上の連続部分が一致すれば候補とする
      for (let i = 0; i < t.length - 1; i++) {
        const chunk = t.slice(i, i + 2);
        if (item.q.toLowerCase().includes(chunk) || item.a.toLowerCase().includes(chunk)) {
          return item;
        }
      }
    }
  }
  return null;
}

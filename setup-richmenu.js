const fs = require('fs');
const path = require('path');

const TOKEN = 'KhJqGebPb2xwuqgJDiz7Ka+q9wD4bK/oghGQNvl41xgG+dzw7yFlyD0UZDjse6o/G2Gz16eRt5/URuZp1m/5UVTq9BL+920KDPKgFa338SPvImv2RPGy32OCkmaPZveB1E5UyzbPzK6TECGIpV98+AdB04t89/1O/w1cDnyilFU=';

async function setup() {
  console.log('① リッチメニューを作成中...');

  const richMenuRes = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'OZONONIXメニュー',
      chatBarText: 'メニューを開く',
      areas: [
        {
          // A：お問い合わせ（左上）→ 担当者チャット開始
          bounds: { x: 22, y: 44, width: 1206, height: 798 },
          action: { type: 'message', text: 'お問い合わせ開始' },
        },
        {
          // B：よくあるQ&A（右上）
          bounds: { x: 1272, y: 44, width: 1206, height: 798 },
          action: { type: 'message', text: 'よくあるQ&A' },
        },
        {
          // C：商品紹介（左下）
          bounds: { x: 22, y: 844, width: 1206, height: 798 },
          action: { type: 'uri', uri: 'https://harurururun.github.io/company-OZONONIX/products' },
        },
        {
          // D：規約・プラン（右下）→ LINEチャットで表示
          bounds: { x: 1272, y: 844, width: 1206, height: 798 },
          action: { type: 'message', text: '規約・プランを確認' },
        },
      ],
    }),
  });

  const richMenu = await richMenuRes.json();

  if (!richMenu.richMenuId) {
    console.error('❌ リッチメニュー作成失敗:', richMenu);
    return;
  }

  console.log('✅ 作成成功 ID:', richMenu.richMenuId);

  console.log('② 画像をアップロード中...');
  const imageBuffer = fs.readFileSync(path.join(__dirname, 'richmenu_full.jpg'));

  const imageRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${richMenu.richMenuId}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    }
  );

  console.log('✅ 画像アップロード:', imageRes.status === 200 ? '成功' : `失敗(${imageRes.status})`);

  console.log('③ デフォルトに設定中...');
  const defaultRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${richMenu.richMenuId}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  );

  console.log('✅ デフォルト設定:', defaultRes.status === 200 ? '成功' : `失敗(${defaultRes.status})`);
  console.log('🎉 リッチメニューの設定が完了しました！');
}

setup().catch(console.error);

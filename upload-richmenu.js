const fs = require('fs');
const path = require('path');

const TOKEN = 'KhJqGebPb2xwuqgJDiz7Ka+q9wD4bK/oghGQNvl41xgG+dzw7yFlyD0UZDjse6o/G2Gz16eRt5/URuZp1m/5UVTq9BL+920KDPKgFa338SPvImv2RPGy32OCkmaPZveB1E5UyzbPzK6TECGIpV98+AdB04t89/1O/w1cDnyilFU=';
const RICH_MENU_ID = 'richmenu-08f44911cb218ce1118b19b4739bded0';

async function upload() {
  // 画像サイズ確認
  const stats = fs.statSync(path.join(__dirname, 'richmenu.jpg'));
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`画像サイズ: ${sizeMB}MB`);

  if (stats.size > 1024 * 1024) {
    console.error('❌ 画像が1MBを超えています。圧縮してから再実行してください。');
    return;
  }

  console.log('① 画像をアップロード中...');
  const imageBuffer = fs.readFileSync(path.join(__dirname, 'richmenu.jpg'));

  const imageRes = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${RICH_MENU_ID}/content`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    }
  );

  if (imageRes.status !== 200) {
    console.error('❌ 画像アップロード失敗:', imageRes.status);
    return;
  }
  console.log('✅ 画像アップロード成功');

  console.log('② デフォルトに設定中...');
  const defaultRes = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${RICH_MENU_ID}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
    }
  );

  if (defaultRes.status !== 200) {
    console.error('❌ デフォルト設定失敗:', defaultRes.status);
    return;
  }

  console.log('✅ デフォルト設定成功');
  console.log('🎉 リッチメニューの設定が完了しました！');
}

upload().catch(console.error);

// ================================================================
// テスト用エンドポイント
// GET /api/test-notify  →  社内グループへテストメッセージを送信して結果を返す
// ================================================================

const INTERNAL_BOT_TOKEN = process.env.INTERNAL_BOT_TOKEN || '';
const INTERNAL_GROUP_ID  = 'C4bfc1aee984b5f5e350dc8423885ce96';

module.exports = async (req, res) => {
  // 環境変数チェック
  if (!INTERNAL_BOT_TOKEN) {
    return res.status(500).json({
      ok: false,
      error: 'INTERNAL_BOT_TOKEN が Vercel の環境変数に設定されていません',
      fix: 'Vercel ダッシュボード → Settings → Environment Variables に INTERNAL_BOT_TOKEN を追加してください',
    });
  }

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const testMsg = `🧪【接続テスト】\n─────────────────\n公式LINEからの通知が\nこのグループに届いています✅\n🕐 ${now}`;

  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INTERNAL_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        to: INTERNAL_GROUP_ID,
        messages: [{ type: 'text', text: testMsg }],
      }),
    });

    const body = await lineRes.json();

    if (lineRes.ok) {
      return res.status(200).json({
        ok: true,
        message: 'グループLINEへの送信成功！グループを確認してください。',
        lineStatus: lineRes.status,
      });
    } else {
      return res.status(500).json({
        ok: false,
        error: 'LINE API がエラーを返しました',
        lineStatus: lineRes.status,
        lineBody: body,
        // よくあるエラーの原因
        hint: body.message?.includes('Invalid reply token')
          ? 'グループIDが間違っている可能性があります'
          : body.message?.includes('The access token')
          ? 'INTERNAL_BOT_TOKEN が無効です。Bot A のトークンを確認してください'
          : body.message || '不明なエラー',
      });
    }
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
};

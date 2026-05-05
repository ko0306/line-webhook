const crypto = require('crypto');

const BOT_A_TOKEN = process.env.TASK_BOT_A_TOKEN;
const BOT_B_TOKEN = process.env.TASK_BOT_B_TOKEN;
const BOT_A_SECRET = process.env.TASK_BOT_A_SECRET;
const LIFF_ID = process.env.TASK_LIFF_ID || '2009897115-OEC9F1K2';
const GAS_URL = process.env.TASK_GAS_URL || 'https://script.google.com/macros/s/AKfycbzQfzBWwsK1d6Ab3NFy3aDLHCpNALFd-xiIWzCT2CSpXpY0oO6-u-xNyzbU-R27fCPc/exec';

// ================================================================
// メッセージ送信
// ================================================================
async function replyMessage(replyToken, messages) {
  const token = await getActiveToken();
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages: Array.isArray(messages) ? messages : [messages] }),
  });
}

async function pushMessage(to, messages) {
  const token = await getActiveToken();
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages: Array.isArray(messages) ? messages : [messages] }),
  });
}

// 月ごとのpush数をGASで管理（簡易版：BOT_Aを基本とする）
async function getActiveToken() {
  // GASのpushカウントを参照する余裕がないため、BOT_Aをデフォルトに
  // 将来的にGASのカウントAPIを呼ぶ拡張が可能
  return BOT_A_TOKEN;
}

// ================================================================
// LIFFボタンを作るFlexメッセージ
// ================================================================
function makeLiffButton(label, page, altText) {
  const url = `https://liff.line.me/${LIFF_ID}?page=${page}`;
  return {
    type: 'flex',
    altText: altText || label,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: label,
              uri: url,
            },
            style: 'primary',
            color: '#1DB954',
          },
        ],
      },
    },
  };
}

// ================================================================
// コマンド処理
// ================================================================
const COMMANDS = {
  'タスク追加': { label: '📝 タスクを追加する', page: 'task-add' },
  'タスク確認': { label: '📋 タスク一覧を見る', page: 'task-list' },
  'タスク一覧': { label: '📋 タスク一覧を見る', page: 'task-list' },
  '罰金':       { label: '💰 罰金を確認・追加する', page: 'penalty' },
  '質問':       { label: '❓ 質問を送る', page: 'question' },
  'メニュー':   { label: '🏠 メニューを開く', page: 'menu' },
};

async function handleMessage(event) {
  const text = (event.message?.text || '').trim();
  const replyToken = event.replyToken;
  const source = event.source;

  // グループID取得コマンド
  if (text === 'グループID') {
    const groupId = source.groupId || source.roomId || source.userId || '取得できませんでした';
    await replyMessage(replyToken, {
      type: 'text',
      text: `グループID：${groupId}`,
    });
    return;
  }

  // ユーザーID取得コマンド
  if (text === 'ユーザーID') {
    await replyMessage(replyToken, {
      type: 'text',
      text: `あなたのユーザーID：${source.userId}`,
    });
    return;
  }

  // コマンドマッチ
  const cmd = COMMANDS[text];
  if (cmd) {
    await replyMessage(replyToken, makeLiffButton(cmd.label, cmd.page, text));
  }
}

async function handleJoin(event) {
  await replyMessage(event.replyToken, {
    type: 'text',
    text: '社内タスク管理Botが参加しました！\n\n使い方：\n📝 タスク追加\n📋 タスク確認\n💰 罰金\n❓ 質問\n🏠 メニュー\n\nと送信してください。',
  });
}

// ================================================================
// 署名検証
// ================================================================
function validateSignature(body, signature) {
  if (!BOT_A_SECRET) return true; // 環境変数未設定時はスキップ
  const hash = crypto
    .createHmac('SHA256', BOT_A_SECRET)
    .update(body)
    .digest('base64');
  return hash === signature;
}

// ================================================================
// Vercel エントリーポイント
// ================================================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('task-webhook ok');
  }

  const signature = req.headers['x-line-signature'];
  const rawBody = JSON.stringify(req.body);

  if (!validateSignature(rawBody, signature)) {
    return res.status(401).send('Invalid signature');
  }

  const events = req.body?.events || [];

  await Promise.all(
    events.map(async (event) => {
      try {
        if (event.type === 'message' && event.message?.type === 'text') {
          await handleMessage(event);
        } else if (event.type === 'join') {
          await handleJoin(event);
        }
      } catch (e) {
        console.error('event error:', e);
      }
    })
  );

  res.status(200).send('OK');
};

// ================================================================
// OZONOIX 社内グループLINE Bot - タスク管理・罰金・質問・通知
// ================================================================
// 【使い方】
// 1. Google Apps Script の新しいプロジェクトを開く
// 2. このコードを貼り付けて CONFIG を設定
// 3. ウェブアプリとして「全員（匿名含む）」でデプロイ
// 4. LINE Developers でWebhook URLに貼り付け
// ================================================================

// ===== CONFIG（★ここを設定する）=====
const TASK_CONFIG = {
  // 社内グループBot の Channel Access Token
  LINE_TOKEN: 'YOUR_INTERNAL_BOT_TOKEN',

  // 社内LINEグループのGroup ID
  // 取得方法: Botをグループに追加してメッセージを送ると
  // Webhookのevent.source.groupIdに届く
  GROUP_ID: 'YOUR_GROUP_ID',

  // スプレッドシートID
  SPREADSHEET_ID: '1bRyYkitvHbyhUsGWy_TQgH_YUASJzz6TPFEe-tpNxjg',

  // メンバー設定（LINE UserID: 表示名）
  // 取得方法: グループでメンバーがメッセージを送ると
  // event.source.userIdで取得できる
  MEMBERS: {
    'USER_ID_A': 'メンバーAの名前',
    'USER_ID_B': 'メンバーBの名前',
    'USER_ID_C': 'メンバーCの名前',
  },
};

// ===== doPost（LINEウェブフック受信） =====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    // 公式LINEからの通知リクエスト
    if (body._source === 'official_line') {
      return handleOfficialLineNotification(body);
    }

    // LINE Webhookイベント
    (body.events || []).forEach(handleEvent);
  } catch (err) {
    console.error('doPost error:', err);
  }
  return ContentService.createTextOutput('OK');
}

// ===== イベント振り分け =====
function handleEvent(event) {
  if (event.type === 'message' && event.message.type === 'text') {
    handleMessage(event);
  } else if (event.type === 'postback') {
    handlePostback(event);
  } else if (event.type === 'join') {
    // グループ参加時にGroup IDをログ
    console.log('Group ID:', event.source.groupId);
    replyLine(event.replyToken, [textMsg('グループに参加しました！\nGroup ID: ' + event.source.groupId)]);
  }
}

// ===== メッセージ処理 =====
function handleMessage(event) {
  const text = event.message.text.trim();
  const userId = event.source.userId;
  const groupId = event.source.groupId || TASK_CONFIG.GROUP_ID;

  // 未回答質問チェック（送信のたびに通知）
  notifyUnansweredQuestion(userId);

  // 会話状態確認
  const conv = getConvState(userId);
  if (conv.state) {
    return handleConvFlow(event, text, userId, groupId, conv.state, conv.data);
  }

  switch (text) {
    case 'タスク追加': case '追加':
      return startTaskAdd(event, userId, groupId);
    case 'タスク確認': case '確認': case 'タスク':
      return showTaskList(event, userId, groupId);
    case '罰金確認': case '罰金':
      return showPenaltyList(event, userId);
    case '罰金追加':
      return startPenaltyAdd(event, userId, groupId);
    case '入金':
      return startPayment(event, userId, groupId);
    case '質問':
      return startQuestion(event, userId, groupId);
    case 'ヘルプ': case 'help': case 'HELP':
      return showHelp(event);
    case 'グループID':
      replyLine(event.replyToken, [textMsg('Group ID: ' + groupId + '\nUser ID: ' + userId)]);
      break;
  }
}

// ===== ヘルプ =====
function showHelp(event) {
  replyLine(event.replyToken, [textMsg(
    '【コマンド一覧】\n\n' +
    '📋 タスク追加　→ タスクを追加\n' +
    '✅ タスク確認　→ タスク一覧表示\n' +
    '💰 罰金確認　　→ 罰金状況確認\n' +
    '💰 罰金追加　　→ 手動で罰金追加\n' +
    '💳 入金　　　　→ 罰金の入金記録\n' +
    '❓ 質問　　　　→ メンバーに質問\n\n' +
    '※ 朝9時に未完了タスクをリマインド\n' +
    '※ 期限当日に完了状況を通知'
  )]);
}

// ================================================================
// ===== タスク追加フロー =====
// ================================================================
function startTaskAdd(event, userId, groupId) {
  setConvState(userId, 'TASK_ASSIGNEE', {});
  const memberButtons = getMemberList().map(([id, name]) => ({
    type: 'button',
    action: { type: 'postback', label: name, data: 'task_assignee:' + id },
    style: 'secondary',
    margin: 'sm',
    height: 'sm',
  }));

  replyLine(event.replyToken, [{
    type: 'flex',
    altText: '📋 タスク追加：担当者を選択',
    contents: bubble(
      header('📋 タスク追加', '#2196F3'),
      box('vertical', [
        text('誰に割り当てますか？', 'md'),
        sep(),
        ...memberButtons,
      ])
    ),
  }]);
}

function handlePostback(event) {
  const data = (event.postback && event.postback.data) || '';
  const userId = event.source.userId;
  const groupId = event.source.groupId || TASK_CONFIG.GROUP_ID;

  const [action, value] = data.split(':');

  switch (action) {
    case 'task_assignee':
      return onTaskAssignee(event, userId, groupId, value);
    case 'task_complete':
      return onTaskComplete(event, userId, groupId, value);
    case 'penalty_target':
      return onPenaltyTarget(event, userId, groupId, value);
    case 'payment_target':
      return onPaymentTarget(event, userId, groupId, value);
    case 'question_target':
      return onQuestionTarget(event, userId, groupId, value);
    case 'question_answer':
      return onQuestionAnswer(event, userId, groupId, value);
  }
}

function onTaskAssignee(event, userId, groupId, assigneeId) {
  setConvState(userId, 'TASK_CONTENT', { assigneeId });
  const name = TASK_CONFIG.MEMBERS[assigneeId] || '不明';
  replyLine(event.replyToken, [textMsg('担当者：' + name + '\n\nタスクの内容を入力してください。')]);
}

function handleConvFlow(event, text, userId, groupId, state, data) {
  switch (state) {
    case 'TASK_CONTENT':
      setConvState(userId, 'TASK_DEADLINE', { ...data, content: text });
      return replyLine(event.replyToken, [textMsg('期限を入力してください。\n（例：2026/05/10）')]);

    case 'TASK_DEADLINE': {
      const deadline = parseDate(text);
      if (!deadline) {
        return replyLine(event.replyToken, [textMsg('日付の形式が正しくありません。\n例：2026/05/10')]);
      }
      setConvState(userId, 'TASK_PENALTY', { ...data, deadline });
      return replyLine(event.replyToken, [textMsg(
        '罰金を設定しますか？\n金額を入力（円）するか「なし」と入力してください。\n（例：500、なし）'
      )]);
    }

    case 'TASK_PENALTY': {
      const penalty = text === 'なし' ? 0 : parseInt(text.replace(/[^0-9]/g, ''));
      const penaltyVal = isNaN(penalty) ? 0 : penalty;
      const d = { ...data, penalty: penaltyVal };
      setConvState(userId, '', {});
      return saveTask(event, userId, groupId, d);
    }

    case 'PENALTY_AMOUNT': {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        return replyLine(event.replyToken, [textMsg('金額を数字で入力してください。（例：500）')]);
      }
      setConvState(userId, 'PENALTY_REASON', { ...data, amount });
      return replyLine(event.replyToken, [textMsg('理由を入力してください。')]);
    }

    case 'PENALTY_REASON': {
      const d = { ...data, reason: text };
      setConvState(userId, '', {});
      return savePenaltyManual(event, userId, groupId, d);
    }

    case 'PAYMENT_AMOUNT': {
      const amount = parseInt(text.replace(/[^0-9]/g, ''));
      if (isNaN(amount) || amount <= 0) {
        return replyLine(event.replyToken, [textMsg('金額を数字で入力してください。（例：1000）')]);
      }
      setConvState(userId, '', {});
      return savePayment(event, userId, groupId, data.targetId, amount);
    }

    case 'QUESTION_CONTENT': {
      setConvState(userId, '', {});
      return saveQuestion(event, userId, groupId, data.targetId, text);
    }

    case 'ANSWER_CONTENT': {
      const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
      const sheet = ss.getSheetByName('質問');
      if (!sheet) return;
      const qRows = sheet.getDataRange().getValues();
      for (let i = 1; i < qRows.length; i++) {
        if (qRows[i][0] === data.qId) {
          sheet.getRange(i + 1, 7).setValue(text);
          sheet.getRange(i + 1, 9).setValue(formatDate(new Date()));
          sheet.getRange(i + 1, 10).setValue('回答済');
          const answererName = TASK_CONFIG.MEMBERS[userId] || '不明';
          const content = qRows[i][5];
          pushLine(groupId, [textMsg(
            `✅ 質問に回答しました\n\n質問：${content}\n回答者：${answererName}\n回答：${text}`
          )]);
          setConvState(userId, '', {});
          return replyLine(event.replyToken, [textMsg('回答を送信しました！')]);
        }
      }
      return;
    }
  }
}

function saveTask(event, userId, groupId, d) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, 'タスク', ['ID', '担当者', '担当者ID', '内容', '期限', '罰金', '作成者', '作成日時', 'ステータス', '完了日時']);
  const id = 'T' + Date.now();
  const assigneeName = TASK_CONFIG.MEMBERS[d.assigneeId] || '不明';
  const creatorName = TASK_CONFIG.MEMBERS[userId] || '不明';
  sheet.appendRow([
    id,
    assigneeName,
    d.assigneeId,
    d.content,
    d.deadline,
    d.penalty,
    creatorName,
    formatDate(new Date()),
    '未完了',
    '',
  ]);

  const penaltyText = d.penalty > 0 ? `\n💰 罰金：¥${d.penalty.toLocaleString()}` : '';
  const msg = `✅ タスクを追加しました！\n\n担当：${assigneeName}\n内容：${d.content}\n期限：${d.deadline}${penaltyText}`;

  // グループに通知
  pushLine(groupId, [textMsg(msg)]);

  // 担当者に個別通知（色付きFlexで）
  if (d.assigneeId !== userId) {
    pushLine(d.assigneeId, [{
      type: 'flex',
      altText: '📋 新しいタスクが割り当てられました',
      contents: bubble(
        header('📋 あなたにタスクが追加されました', '#2196F3'),
        box('vertical', [
          row('内容', d.content),
          row('期限', d.deadline),
          d.penalty > 0 ? row('罰金', '¥' + d.penalty.toLocaleString()) : null,
          row('担当者', assigneeName),
        ].filter(Boolean))
      ),
    }]);
  }

  replyLine(event.replyToken, [textMsg('タスクを追加しました！')]);
}

// ================================================================
// ===== タスク確認 =====
// ================================================================
function showTaskList(event, userId, groupId) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('タスク');
  const today = new Date();

  if (!sheet || sheet.getLastRow() <= 1) {
    return replyLine(event.replyToken, [textMsg('タスクはまだありません。')]);
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues()
    .filter(r => r[8] === '未完了');

  if (rows.length === 0) {
    return replyLine(event.replyToken, [textMsg('✅ 未完了のタスクはありません！')]);
  }

  const myTasks = rows.filter(r => r[2] === userId);
  const otherTasks = rows.filter(r => r[2] !== userId);

  // グループ宛に一覧送信
  const groupMsg = buildTaskListFlex(rows, null, today);
  replyLine(event.replyToken, [groupMsg]);

  // 本人に個別カラー付き送信（自分→青, 他→グレー）
  const myMsg = buildTaskListFlex(rows, userId, today);
  pushLine(userId, [myMsg]);

  // 完遂率
  const allRows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  const total = allRows.length;
  const done = allRows.filter(r => r[8] === '完了').length;
  const statsMsg = buildStatsMsg(allRows, today);
  pushLine(userId, [statsMsg]);
}

function buildTaskListFlex(rows, viewerId, today) {
  const items = rows.map(r => {
    const isOwn = r[2] === viewerId;
    const deadline = new Date(r[4]);
    const isOverdue = deadline < today;
    const color = isOwn ? '#1565C0' : '#757575';
    const bgColor = isOwn ? '#E3F2FD' : '#F5F5F5';

    return {
      type: 'box',
      layout: 'vertical',
      backgroundColor: bgColor,
      cornerRadius: '8px',
      paddingAll: '12px',
      margin: 'sm',
      contents: [
        {
          type: 'box', layout: 'horizontal', contents: [
            text('🔵 ' + r[1], 'sm', 'bold', color),
            text(isOverdue ? '⚠️ 期限切れ' : r[4], 'xs', 'regular', isOverdue ? '#F44336' : '#9E9E9E'),
          ],
        },
        text(r[3], 'sm', 'regular', '#333333'),
        r[5] > 0 ? text('💰 罰金：¥' + Number(r[5]).toLocaleString(), 'xs', 'regular', '#E53935') : null,
        {
          type: 'button',
          action: { type: 'postback', label: '✅ 完了', data: 'task_complete:' + r[0] },
          style: 'primary',
          height: 'sm',
          color: isOwn ? '#2196F3' : '#9E9E9E',
          margin: 'sm',
        },
      ].filter(Boolean),
    };
  });

  return {
    type: 'flex',
    altText: '📋 タスク一覧',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: header('📋 タスク一覧（未完了：' + rows.length + '件）', '#1976D2'),
      body: box('vertical', items),
    },
  };
}

function buildStatsMsg(allRows, today) {
  const members = getMemberList();
  const lines = ['【タスク完遂率】\n'];

  members.forEach(([id, name]) => {
    const myAll = allRows.filter(r => r[2] === id);
    const myDone = myAll.filter(r => r[8] === '完了');
    const rate = myAll.length > 0 ? Math.round(myDone.length / myAll.length * 100) : 0;
    const bar = '█'.repeat(Math.round(rate / 10)) + '░'.repeat(10 - Math.round(rate / 10));
    lines.push(`${name}\n${bar} ${rate}%（${myDone.length}/${myAll.length}件）`);
  });

  return textMsg(lines.join('\n'));
}

function onTaskComplete(event, userId, groupId, taskId) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('タスク');
  if (!sheet) return;

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === taskId) {
      sheet.getRange(i + 1, 9).setValue('完了');
      sheet.getRange(i + 1, 10).setValue(formatDate(new Date()));

      const assigneeName = rows[i][1];
      const content = rows[i][3];
      const penalty = rows[i][5];

      // グループ通知
      pushLine(groupId, [textMsg(
        `🎉 タスク完了！\n\n担当：${assigneeName}\n内容：${content}\n完了日時：${formatDate(new Date())}`
      )]);

      replyLine(event.replyToken, [textMsg('✅ タスクを完了しました！')]);
      return;
    }
  }
  replyLine(event.replyToken, [textMsg('タスクが見つかりませんでした。')]);
}

// ================================================================
// ===== 罰金管理 =====
// ================================================================
function showPenaltyList(event, userId) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('罰金');

  if (!sheet || sheet.getLastRow() <= 1) {
    return replyLine(event.replyToken, [textMsg('罰金の記録はありません。')]);
  }

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();

  const members = getMemberList();
  const sections = members.map(([id, name]) => {
    const myRows = rows.filter(r => r[2] === id);
    const totalPenalty = myRows.reduce((s, r) => s + Number(r[3] || 0), 0);
    const totalPaid = myRows.reduce((s, r) => s + Number(r[7] || 0), 0);
    const balance = totalPenalty - totalPaid;

    const detail = myRows.map(r =>
      `・${r[4]}（${r[5]}）: ¥${Number(r[3]).toLocaleString()}`
    ).join('\n') || '　なし';

    return `【${name}】\n合計：¥${totalPenalty.toLocaleString()}\n入金済：¥${totalPaid.toLocaleString()}\n未払い：¥${balance.toLocaleString()}\n\n内訳：\n${detail}`;
  });

  replyLine(event.replyToken, [textMsg('💰 罰金状況\n\n' + sections.join('\n\n━━━━━━━━━━\n\n'))]);
}

function startPenaltyAdd(event, userId, groupId) {
  setConvState(userId, 'PENALTY_TARGET', {});
  const buttons = getMemberList().map(([id, name]) => ({
    type: 'button',
    action: { type: 'postback', label: name, data: 'penalty_target:' + id },
    style: 'secondary',
    margin: 'sm',
    height: 'sm',
  }));

  replyLine(event.replyToken, [{
    type: 'flex',
    altText: '💰 罰金追加：対象者を選択',
    contents: bubble(
      header('💰 罰金追加', '#E53935'),
      box('vertical', [text('対象者を選択してください'), sep(), ...buttons])
    ),
  }]);
}

function onPenaltyTarget(event, userId, groupId, targetId) {
  setConvState(userId, 'PENALTY_AMOUNT', { targetId });
  replyLine(event.replyToken, [textMsg('罰金の金額を入力してください。（例：500）')]);
}

function savePenaltyManual(event, userId, groupId, d) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, '罰金', ['ID', '対象者', '対象者ID', '金額', '理由', '追加者', '追加日時', '入金済額', '入金履歴']);

  const targetName = TASK_CONFIG.MEMBERS[d.targetId] || '不明';
  const adderName = TASK_CONFIG.MEMBERS[userId] || '不明';
  sheet.appendRow([
    'P' + Date.now(),
    targetName,
    d.targetId,
    d.amount,
    d.reason,
    adderName + '（手動）',
    formatDate(new Date()),
    0,
    '',
  ]);

  pushLine(groupId, [textMsg(
    `💰 罰金追加\n\n対象：${targetName}\n金額：¥${d.amount.toLocaleString()}\n理由：${d.reason}\n追加者：${adderName}`
  )]);

  replyLine(event.replyToken, [textMsg('罰金を追加しました。')]);
}

function startPayment(event, userId, groupId) {
  const buttons = getMemberList().map(([id, name]) => ({
    type: 'button',
    action: { type: 'postback', label: name, data: 'payment_target:' + id },
    style: 'secondary',
    margin: 'sm',
    height: 'sm',
  }));

  replyLine(event.replyToken, [{
    type: 'flex',
    altText: '💳 入金：対象者を選択',
    contents: bubble(
      header('💳 入金記録', '#388E3C'),
      box('vertical', [text('入金者を選択してください'), sep(), ...buttons])
    ),
  }]);
}

function onPaymentTarget(event, userId, groupId, targetId) {
  setConvState(userId, 'PAYMENT_AMOUNT', { targetId });
  replyLine(event.replyToken, [textMsg('入金額を入力してください。（例：1000）')]);
}

function savePayment(event, userId, groupId, targetId, amount) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('罰金');
  if (!sheet) return replyLine(event.replyToken, [textMsg('罰金データがありません。')]);

  // 対象者の未払い分に入金を充当
  const rows = sheet.getDataRange().getValues();
  let remaining = amount;
  let updated = 0;

  for (let i = 1; i < rows.length && remaining > 0; i++) {
    if (rows[i][2] !== targetId) continue;
    const penalty = Number(rows[i][3] || 0);
    const paid = Number(rows[i][7] || 0);
    const balance = penalty - paid;
    if (balance <= 0) continue;

    const pay = Math.min(remaining, balance);
    const newPaid = paid + pay;
    const history = (rows[i][8] ? rows[i][8] + '\n' : '') +
      `${formatDate(new Date())} ¥${pay.toLocaleString()} 入金`;

    sheet.getRange(i + 1, 8).setValue(newPaid);
    sheet.getRange(i + 1, 9).setValue(history);
    remaining -= pay;
    updated += pay;
  }

  const targetName = TASK_CONFIG.MEMBERS[targetId] || '不明';
  const adderName = TASK_CONFIG.MEMBERS[userId] || '不明';

  pushLine(groupId, [textMsg(
    `💳 入金記録\n\n入金者：${targetName}\n入金額：¥${amount.toLocaleString()}\n記録者：${adderName}`
  )]);

  replyLine(event.replyToken, [textMsg(`¥${amount.toLocaleString()} の入金を記録しました。`)]);
}

// ================================================================
// ===== 質問フロー =====
// ================================================================
function startQuestion(event, userId, groupId) {
  setConvState(userId, 'QUESTION_TARGET', {});
  const others = getMemberList().filter(([id]) => id !== userId);
  const buttons = others.map(([id, name]) => ({
    type: 'button',
    action: { type: 'postback', label: '@' + name, data: 'question_target:' + id },
    style: 'secondary',
    margin: 'sm',
    height: 'sm',
  }));

  replyLine(event.replyToken, [{
    type: 'flex',
    altText: '❓ 質問：宛先を選択',
    contents: bubble(
      header('❓ 質問する', '#FF6F00'),
      box('vertical', [text('誰に質問しますか？'), sep(), ...buttons])
    ),
  }]);
}

function onQuestionTarget(event, userId, groupId, targetId) {
  setConvState(userId, 'QUESTION_CONTENT', { targetId });
  const name = TASK_CONFIG.MEMBERS[targetId] || '不明';
  replyLine(event.replyToken, [textMsg('@' + name + ' への質問内容を入力してください。')]);
}

function saveQuestion(event, userId, groupId, targetId, content) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, '質問', ['ID', '質問者', '質問者ID', '宛先', '宛先ID', '内容', '回答', '質問日時', '回答日時', 'ステータス']);
  const qId = 'Q' + Date.now();
  const askerName = TASK_CONFIG.MEMBERS[userId] || '不明';
  const targetName = TASK_CONFIG.MEMBERS[targetId] || '不明';

  sheet.appendRow([qId, askerName, userId, targetName, targetId, content, '', formatDate(new Date()), '', '未回答']);

  // グループ通知（Flex Message で色付き）
  pushLine(groupId, [{
    type: 'flex',
    altText: `❓ @${targetName} への質問`,
    contents: bubble(
      header(`❓ @${targetName} に質問`, '#FF6F00'),
      box('vertical', [
        row('質問者', askerName),
        sep(),
        text(content, 'md', 'regular', '#333'),
        {
          type: 'button',
          action: { type: 'postback', label: '✏️ この質問に答える', data: 'question_answer:' + qId },
          style: 'primary',
          color: '#FF6F00',
          margin: 'md',
        },
      ])
    ),
  }]);

  // 宛先への個別通知
  pushLine(targetId, [{
    type: 'flex',
    altText: `❓ ${askerName}さんから質問が届きました`,
    contents: bubble(
      header(`📩 ${askerName}さんから質問`, '#FF6F00'),
      box('vertical', [
        text(content, 'md', 'regular', '#333'),
        {
          type: 'button',
          action: { type: 'postback', label: '✏️ 答える', data: 'question_answer:' + qId },
          style: 'primary',
          color: '#FF6F00',
          margin: 'md',
        },
      ])
    ),
  }]);

  replyLine(event.replyToken, [textMsg('質問を送信しました。')]);
}

function onQuestionAnswer(event, userId, groupId, qId) {
  setConvState(userId, 'ANSWER_CONTENT', { qId });
  replyLine(event.replyToken, [textMsg('回答内容を入力してください。')]);
}

// 会話フローに回答処理を追加
function handleConvFlow_extended(event, text, userId, groupId, state, data) {
  if (state === 'ANSWER_CONTENT') {
    const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName('質問');
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.qId) {
        sheet.getRange(i + 1, 7).setValue(text);
        sheet.getRange(i + 1, 9).setValue(formatDate(new Date()));
        sheet.getRange(i + 1, 10).setValue('回答済');

        const targetName = TASK_CONFIG.MEMBERS[userId] || '不明';
        const askerName = rows[i][1];
        const content = rows[i][5];

        // グループに回答を通知
        pushLine(groupId, [textMsg(
          `✅ 質問に回答しました\n\n質問：${content}\n回答者：${targetName}\n回答：${text}`
        )]);

        setConvState(userId, '', {});
        replyLine(event.replyToken, [textMsg('回答を送信しました！')]);
        return;
      }
    }
  }
}

// 未回答質問リマインド（メッセージ送信のたびに呼ぶ）
function notifyUnansweredQuestion(userId) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('質問');
  if (!sheet || sheet.getLastRow() <= 1) return;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  const unanswered = rows.filter(r => r[4] === userId && r[9] === '未回答');
  if (unanswered.length === 0) return;

  // 最新の未回答質問1件を通知
  const q = unanswered[unanswered.length - 1];
  pushLine(userId, [{
    type: 'flex',
    altText: '⚠️ 未回答の質問があります',
    contents: bubble(
      header('⚠️ 未回答の質問があります（' + unanswered.length + '件）', '#FF6F00'),
      box('vertical', [
        row('質問者', q[1]),
        text(q[5], 'sm'),
        {
          type: 'button',
          action: { type: 'postback', label: '✏️ 答える', data: 'question_answer:' + q[0] },
          style: 'primary',
          color: '#FF6F00',
          margin: 'md',
        },
      ])
    ),
  }]);
}

// ================================================================
// ===== 定期処理（トリガー設定が必要）=====
// ================================================================

// 毎朝9時に未完了タスクリマインド
function morningReminder() {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('タスク');
  if (!sheet || sheet.getLastRow() <= 1) return;

  const today = new Date();
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues()
    .filter(r => r[8] === '未完了');

  if (rows.length === 0) return;

  // 全員への一覧通知
  const lines = ['☀️ おはようございます！\n未完了タスクのリマインドです。\n'];
  const members = getMemberList();

  members.forEach(([id, name]) => {
    const myTasks = rows.filter(r => r[2] === id);
    if (myTasks.length === 0) return;
    lines.push(`【${name}】`);
    myTasks.forEach(t => {
      const deadline = new Date(t[4]);
      const isOverdue = deadline < today;
      lines.push(`${isOverdue ? '⚠️' : '・'} ${t[3]}（期限：${t[4]}）${isOverdue ? '【期限切れ】' : ''}`);
    });
    lines.push('');
  });

  pushLine(TASK_CONFIG.GROUP_ID, [textMsg(lines.join('\n'))]);

  // 個別に各担当者へも通知
  members.forEach(([id, name]) => {
    const myTasks = rows.filter(r => r[2] === id);
    if (myTasks.length === 0) return;
    const myLines = myTasks.map(t => {
      const deadline = new Date(t[4]);
      const isOverdue = deadline < today;
      return `${isOverdue ? '⚠️' : '・'} ${t[3]}（期限：${t[4]}）`;
    });
    pushLine(id, [textMsg(
      `☀️ ${name}さん、おはようございます！\n\nあなたの未完了タスク：\n${myLines.join('\n')}`
    )]);
  });
}

// 毎日0時：期限到来タスクのチェック
function deadlineCheck() {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName('タスク');
  if (!sheet || sheet.getLastRow() <= 1) return;

  const today = formatDateOnly(new Date());
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();

  rows.forEach((r, i) => {
    if (r[8] !== '未完了') return;
    const deadline = formatDateOnly(new Date(r[4]));
    if (deadline !== today) return;

    // 期限当日に通知
    pushLine(TASK_CONFIG.GROUP_ID, [textMsg(
      `📅 本日期限のタスク\n\n担当：${r[1]}\n内容：${r[3]}\n❌ 未完了です`
    )]);

    // 罰金がある場合は自動追加
    if (Number(r[5]) > 0) {
      addPenaltyAuto(r[2], r[1], Number(r[5]), r[3] + '（未完了）');
    }
  });
}

function addPenaltyAuto(targetId, targetName, amount, reason) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, '罰金', ['ID', '対象者', '対象者ID', '金額', '理由', '追加者', '追加日時', '入金済額', '入金履歴']);
  sheet.appendRow([
    'P' + Date.now(),
    targetName,
    targetId,
    amount,
    reason,
    'システム（自動）',
    formatDate(new Date()),
    0,
    '',
  ]);

  pushLine(TASK_CONFIG.GROUP_ID, [textMsg(
    `💰 罰金が自動追加されました\n\n対象：${targetName}\n金額：¥${amount.toLocaleString()}\n理由：${reason}`
  )]);
}

// ================================================================
// ===== 公式LINEからの通知受信 =====
// ================================================================
function handleOfficialLineNotification(body) {
  const { type, message, detail } = body;

  let msg = '';
  if (type === 'inquiry_full') {
    // お問い合わせ全内容
    msg = [
      '📩【公式LINE お問い合わせ】',
      '─────────────────',
      `📛 氏名：${detail.name || '未入力'}`,
      `📧 メール：${detail.email || '未入力'}`,
      `📦 サービス：${detail.service || '未入力'}`,
      `📝 内容：${detail.content || ''}`,
      `🕐 受付：${detail.time || formatDate(new Date())}`,
      '─────────────────',
      '👉 公式LINEアプリから返信してください',
    ].join('\n');
  } else if (type === 'inquiry_keyword') {
    // キーワード通知（担当者接続）
    msg = [
      '🔔【公式LINE 担当者接続依頼】',
      '─────────────────',
      `内容：${message}`,
      `🕐 受付：${formatDate(new Date())}`,
      '─────────────────',
      '👉 公式LINEアプリから対応してください',
    ].join('\n');
  }

  if (msg) {
    pushLine(TASK_CONFIG.GROUP_ID, [textMsg(msg)]);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// ===== トリガー設定（1回だけ実行）=====
// ================================================================
function setupTriggers() {
  // 既存トリガー削除
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // 毎朝9時リマインド
  ScriptApp.newTrigger('morningReminder')
    .timeBased().everyDays(1).atHour(9).create();

  // 毎日0時に期限チェック
  ScriptApp.newTrigger('deadlineCheck')
    .timeBased().everyDays(1).atHour(0).create();

  console.log('トリガーを設定しました。');
}

// ================================================================
// ===== LINE API ヘルパー =====
// ================================================================
function replyLine(replyToken, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TASK_CONFIG.LINE_TOKEN },
    payload: JSON.stringify({ replyToken, messages }),
    muteHttpExceptions: true,
  });
}

function pushLine(to, messages) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + TASK_CONFIG.LINE_TOKEN },
    payload: JSON.stringify({ to, messages }),
    muteHttpExceptions: true,
  });
}

// ================================================================
// ===== Flex Message ビルダー =====
// ================================================================
function textMsg(t) { return { type: 'text', text: t }; }

function bubble(headerComp, bodyComp) {
  return { type: 'bubble', header: headerComp, body: bodyComp };
}

function header(label, color) {
  return {
    type: 'box', layout: 'vertical', backgroundColor: color, paddingAll: '12px',
    contents: [{ type: 'text', text: label, color: '#FFFFFF', weight: 'bold', size: 'md' }],
  };
}

function box(layout, contents) {
  return { type: 'box', layout, contents: contents.filter(Boolean), paddingAll: '12px', spacing: 'sm' };
}

function text(t, size, weight, color) {
  return {
    type: 'text', text: String(t),
    size: size || 'sm',
    weight: weight || 'regular',
    color: color || '#333333',
    wrap: true,
  };
}

function row(label, value) {
  return {
    type: 'box', layout: 'horizontal', contents: [
      { type: 'text', text: label, size: 'sm', color: '#888888', flex: 2 },
      { type: 'text', text: String(value), size: 'sm', color: '#333333', flex: 3, wrap: true },
    ],
  };
}

function sep() { return { type: 'separator', margin: 'md' }; }

// ================================================================
// ===== スプレッドシートヘルパー =====
// ================================================================
function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ================================================================
// ===== 会話状態管理 =====
// ================================================================
function getConvState(userId) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, '会話状態', ['UserID', 'state', 'data', 'updatedAt']);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      return {
        state: rows[i][1] || '',
        data: rows[i][2] ? JSON.parse(rows[i][2]) : {},
      };
    }
  }
  return { state: '', data: {} };
}

function setConvState(userId, state, data) {
  const ss = SpreadsheetApp.openById(TASK_CONFIG.SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, '会話状態', ['UserID', 'state', 'data', 'updatedAt']);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId) {
      sheet.getRange(i + 1, 2).setValue(state);
      sheet.getRange(i + 1, 3).setValue(JSON.stringify(data));
      sheet.getRange(i + 1, 4).setValue(new Date());
      return;
    }
  }
  sheet.appendRow([userId, state, JSON.stringify(data), new Date()]);
}

// ================================================================
// ===== ユーティリティ =====
// ================================================================
function getMemberList() {
  return Object.entries(TASK_CONFIG.MEMBERS);
}

function getMemberName(userId) {
  return TASK_CONFIG.MEMBERS[userId] || '不明';
}

function getOtherMembers(userId) {
  return getMemberList().filter(([id]) => id !== userId);
}

function parseDate(str) {
  const m = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}/${m[2].padStart(2, '0')}/${m[3].padStart(2, '0')}`;
}

function formatDate(d) {
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
}

function formatDateOnly(d) {
  return Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd');
}

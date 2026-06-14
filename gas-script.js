// ================================================================
// OZONONIXシフトアプリ 公式LINE GASスクリプト（完全版）
// Google Apps Scriptのエディタにこのコードを貼り付けてください
// 既存のコードはすべて削除して置き換えてください
// ================================================================

const SS_ID = '1lDygFxhG1DdrWA-LKsAqUYVLOQfSc83KOf6Nr7hySs8';

const COL = {
  EMAIL:            4,
  SERVICE:          6,
  PLAN:             7,
  TRIAL:            8,
  BUDGET:           9,
  LINE_USER_ID:    14,
  LAST_PLAN_CHANGE:18,
  WITHDRAWN:       19,
  LAST_ACTION:     20,
  USER_STATUS:     21,
};

const PLANS = {
  'ベーシック':   { price: 1980, maxUsers: 19 },
  'スタンダード': { price: 2980, maxUsers: 40 },
  'プレミアム':   { price: 3980, maxUsers: null },
};

// ================================================================
// doPost
// ================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case 'saveUserService':       return saveUserService(data);
      case 'linkUser':              return linkUser(data);
      case 'getUserInfo':           return getUserInfo(data);
      case 'getUserPlan':           return getUserPlan(data);
      case 'changePlan':            return changePlan(data);
      case 'updateUserInfo':        return updateUserInfo(data);
      case 'withdraw':              return withdrawUser(data);
      case 'getConversationState':  return getConversationState(data);
      case 'setConversationState':  return setConversationState(data);
      case 'saveInquiry':           return saveInquiry(data);
      case 'saveCustomization':     return saveCustomization(data);
      case 'sendNotificationEmail': return sendNotificationEmail(data);
      case 'updateLastAction':      return updateLastAction(data);
      case 'updateUserStatus':     return updateUserStatus(data);
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ================================================================
// doGet
// ================================================================
function doGet(e) {
  const page = (e.parameter && e.parameter.page) || '';
  const plan  = (e.parameter && e.parameter.plan)  || '';
  if (page === 'shift-features') {
    return HtmlService.createHtmlOutput(buildShiftFeaturesHtml(plan))
      .setTitle('シフトアプリ 機能・プラン一覧')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createHtmlOutput('<p>ページが見つかりません</p>');
}

// ================================================================
// saveUserService
// ================================================================
function saveUserService(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sheet = ss.getSheetByName('LINE追跡');
  if (!sheet) {
    sheet = ss.insertSheet('LINE追跡');
    sheet.appendRow(['lineUserId', 'service', 'timestamp']);
  }
  sheet.appendRow([data.lineUserId, data.service, new Date()]);
  return jsonResponse({ success: true });
}

// ================================================================
// linkUser
// ================================================================
function linkUser(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  if (!sheet) return jsonResponse({ success: false, error: 'sheet not found' });

  const emailValues = sheet.getRange('D:D').getValues();

  let service = 'other';
  const trackingSheet = ss.getSheetByName('LINE追跡');
  if (trackingSheet) {
    const tracking = trackingSheet.getRange('A:B').getValues();
    for (let i = tracking.length - 1; i >= 0; i--) {
      if (tracking[i][0] === data.lineUserId) {
        service = tracking[i][1];
        break;
      }
    }
  }

  const inputEmail = String(data.email || '').trim().toLowerCase();
  for (let i = 0; i < emailValues.length; i++) {
    const cellEmail = String(emailValues[i][0] || '').trim().toLowerCase();
    if (cellEmail && cellEmail === inputEmail) {
      const row = i + 1;
      sheet.getRange(row, COL.LINE_USER_ID).setValue(data.lineUserId);
      const inquiry    = getLatestCellValue(sheet.getRange(row, COL.SERVICE));
      const plan       = getLatestCellValue(sheet.getRange(row, COL.PLAN));
      const trial      = getLatestCellValue(sheet.getRange(row, COL.TRIAL));
      const withdrawn  = sheet.getRange(row, COL.WITHDRAWN).getValue();
      const statusRaw  = sheet.getRange(row, COL.USER_STATUS).getValue() || '';
      const userStatus = statusRaw.split('  [')[0].trim();
      return jsonResponse({ success: true, service, inquiry, plan, trial, withdrawn: !!withdrawn, userStatus });
    }
  }
  return jsonResponse({ success: false, service });
}

// ================================================================
// getUserInfo
// ================================================================
function getUserInfo(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });

  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  const email    = getLatestCellValue(sheet.getRange(row, COL.EMAIL));
  const inquiry  = getLatestCellValue(sheet.getRange(row, COL.SERVICE));
  const plan     = getLatestCellValue(sheet.getRange(row, COL.PLAN));
  const trial    = getLatestCellValue(sheet.getRange(row, COL.TRIAL));
  const budget   = getLatestCellValue(sheet.getRange(row, COL.BUDGET));
  const withdrawn = sheet.getRange(row, COL.WITHDRAWN).getValue();
  const lastPlanChange = sheet.getRange(row, COL.LAST_PLAN_CHANGE).getValue();
  const lastActionRaw = sheet.getRange(row, COL.LAST_ACTION).getValue() || '';
  const userStatusRaw = sheet.getRange(row, COL.USER_STATUS).getValue() || '';
  // ステータス文字列から日時部分を除去して返す
  const lastAction = lastActionRaw.split('  [')[0].trim();
  const userStatus = userStatusRaw.split('  [')[0].trim();

  return jsonResponse({
    success: true, email, inquiry, plan, trial, budget,
    withdrawn: !!withdrawn,
    lastAction,
    userStatus,
    lastPlanChange: lastPlanChange
      ? Utilities.formatDate(new Date(lastPlanChange), 'Asia/Tokyo', 'yyyy/MM/dd')
      : null,
  });
}

// ================================================================
// getUserPlan
// ================================================================
function getUserPlan(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false });
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  const plan = getLatestCellValue(sheet.getRange(row, COL.PLAN));
  return jsonResponse({ success: true, plan });
}

// ================================================================
// changePlan
// ================================================================
function changePlan(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });

  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  const lastChangeVal = sheet.getRange(row, COL.LAST_PLAN_CHANGE).getValue();
  if (lastChangeVal) {
    const lastDate = new Date(lastChangeVal);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
    if (diffMonths < 2) {
      const next = new Date(lastDate);
      next.setMonth(next.getMonth() + 2);
      return jsonResponse({
        success: false,
        reason: 'too_soon',
        nextAvailable: Utilities.formatDate(next, 'Asia/Tokyo', 'yyyy/MM/dd'),
      });
    }
  }
  updateCellWithHistory(sheet.getRange(row, COL.PLAN), data.newPlan);
  sheet.getRange(row, COL.LAST_PLAN_CHANGE).setValue(new Date());
  return jsonResponse({ success: true });
}

// ================================================================
// updateUserInfo
// ================================================================
function updateUserInfo(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });
  const colMap = { email: COL.EMAIL, budget: COL.BUDGET };
  const col = colMap[data.field];
  if (!col) return jsonResponse({ success: false, error: 'invalid field' });
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  updateCellWithHistory(sheet.getRange(row, col), data.value);
  return jsonResponse({ success: true });
}

// ================================================================
// withdrawUser
// ================================================================
function withdrawUser(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  sheet.getRange(row, COL.WITHDRAWN).setValue(
    Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm')
  );
  return jsonResponse({ success: true });
}

// ================================================================
// saveInquiry
// ================================================================
function saveInquiry(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sheet = ss.getSheetByName('LINEお問い合わせ');
  if (!sheet) {
    sheet = ss.insertSheet('LINEお問い合わせ');
    sheet.appendRow(['受付日時', 'lineUserId', 'お名前', 'メール', 'サービス', '内容']);
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    data.lineUserId || '',
    data.name || '',
    data.email || '',
    data.service || '',
    data.details || '',
  ]);
  return jsonResponse({ success: true });
}

// ================================================================
// sendNotificationEmail
// ================================================================
function sendNotificationEmail(data) {
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  const body = [
    'OZONONIXの公式LINEにお問い合わせが届きました。',
    '',
    '■ 受付日時: ' + now,
    '■ LINE ユーザーID: ' + (data.lineUserId || '不明'),
    '■ 内容: ' + (data.message || 'お問い合わせボタンが押されました'),
    '',
    '▼ LINE公式アカウントマネージャーから返信してください',
    'https://manager.line.biz/',
  ].join('\n');

  try {
    const ss = SpreadsheetApp.openById(SS_ID);
    let logSheet = ss.getSheetByName('通知ログ');
    if (!logSheet) {
      logSheet = ss.insertSheet('通知ログ');
      logSheet.appendRow(['日時', 'lineUserId', '内容', 'メール送信結果']);
    }
    logSheet.appendRow([now, data.lineUserId || '', data.message || '', '送信中...']);
    const lastRow = logSheet.getLastRow();

    MailApp.sendEmail({
      to: 'joudencompany@gmail.com',
      subject: '【OZONOIX LINE】お問い合わせが届きました',
      body: body,
    });

    logSheet.getRange(lastRow, 4).setValue('送信成功');
    return jsonResponse({ success: true });
  } catch (err) {
    try {
      const ss2 = SpreadsheetApp.openById(SS_ID);
      const logSheet2 = ss2.getSheetByName('通知ログ');
      if (logSheet2) logSheet2.getRange(logSheet2.getLastRow(), 4).setValue('失敗: ' + err.message);
    } catch (_) {}
    return jsonResponse({ success: false, error: err.message });
  }
}

// ================================================================
// saveCustomization
// ================================================================
function saveCustomization(data) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sheet = ss.getSheetByName('カスタマイズ要望');
  if (!sheet) {
    sheet = ss.insertSheet('カスタマイズ要望');
    sheet.appendRow(['受付日時', 'lineUserId', 'カスタマイズ内容']);
  }
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    data.lineUserId || '',
    data.content || '',
  ]);
  return jsonResponse({ success: true });
}

// ================================================================
// 会話状態管理
// ================================================================
function getConversationState(data) {
  const sheet = getOrCreateStateSheet();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.lineUserId) {
      return jsonResponse({
        success: true,
        state: values[i][1] || '',
        stateData: values[i][2] ? JSON.parse(values[i][2]) : {},
      });
    }
  }
  return jsonResponse({ success: true, state: '', stateData: {} });
}

function setConversationState(data) {
  const sheet = getOrCreateStateSheet();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.lineUserId) {
      sheet.getRange(i + 1, 2).setValue(data.state);
      sheet.getRange(i + 1, 3).setValue(JSON.stringify(data.stateData || {}));
      sheet.getRange(i + 1, 4).setValue(new Date());
      return jsonResponse({ success: true });
    }
  }
  sheet.appendRow([data.lineUserId, data.state, JSON.stringify(data.stateData || {}), new Date()]);
  return jsonResponse({ success: true });
}

function getOrCreateStateSheet() {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sheet = ss.getSheetByName('会話状態');
  if (!sheet) {
    sheet = ss.insertSheet('会話状態');
    sheet.appendRow(['lineUserId', 'state', 'stateData', 'updatedAt']);
  }
  return sheet;
}

// ================================================================
// updateLastAction
// ================================================================
function updateLastAction(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sheet.getRange(row, COL.LAST_ACTION).setValue(data.action_label + '  [' + now + ']');
  return jsonResponse({ success: true });
}

// ================================================================
// updateUserStatus
// ================================================================
function updateUserStatus(data) {
  const row = findUserRow(data.lineUserId);
  if (!row) return jsonResponse({ success: false, error: 'user not found' });
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  const now = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  sheet.getRange(row, COL.USER_STATUS).setValue(data.status + '  [' + now + ']');
  return jsonResponse({ success: true });
}

// ================================================================
// ヘルパー関数
// ================================================================
function findUserRow(lineUserId) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheetByName('お問い合わせ');
  if (!sheet) return null;
  const col = sheet.getRange(1, COL.LINE_USER_ID, sheet.getLastRow()).getValues();
  for (let i = 0; i < col.length; i++) {
    if (col[i][0] === lineUserId) return i + 1;
  }
  return null;
}

function getLatestCellValue(range) {
  const value = String(range.getValue() || '').trim();
  if (!value) return '';
  const lines = value.split('\n');
  return lines[lines.length - 1].trim();
}

function updateCellWithHistory(range, newValue) {
  const oldText = String(range.getValue() || '').trim();
  if (!oldText) {
    range.setValue(newValue);
    return;
  }
  const changeDate = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  const dateSuffix = '  [変更日:' + changeDate + ']';
  const fullText = oldText + dateSuffix + '\n' + newValue;
  const strikeStyle = SpreadsheetApp.newTextStyle().setStrikethrough(true).build();
  const redStyle    = SpreadsheetApp.newTextStyle().setForegroundColor('#FF0000').setStrikethrough(false).build();
  const normalStyle = SpreadsheetApp.newTextStyle().setStrikethrough(false).setForegroundColor('#000000').build();
  const oldEnd    = oldText.length;
  const suffixEnd = oldEnd + dateSuffix.length;
  const newStart  = suffixEnd + 1;
  try {
    const richText = SpreadsheetApp.newRichTextValue()
      .setText(fullText)
      .setTextStyle(0, oldEnd, strikeStyle)
      .setTextStyle(oldEnd, suffixEnd, redStyle)
      .setTextStyle(newStart, fullText.length, normalStyle)
      .build();
    range.setRichTextValue(richText);
  } catch (_) {
    range.setValue(fullText);
  }
  range.setWrap(true);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================================================================
// シフトアプリ機能ページ HTML
// ================================================================
function buildShiftFeaturesHtml(currentPlan) {
  var commonFeatures = [
    { icon: '📅', title: 'シフト閲覧', desc: 'カレンダー＆タイムライン形式で確認' },
    { icon: '⏰', title: '勤怠打刻', desc: '出勤・退勤・休憩開始・休憩終了をスマホから記録' },
    { icon: '📊', title: '勤務時間確認', desc: '月次・週次・日次・時間帯別の統計を表示' },
    { icon: '📱', title: 'スマホアプリ化', desc: 'ホーム画面に追加してアプリとして使用可能（PWA）' },
    { icon: '👤', title: 'スタッフ管理', desc: '名前・役職・パスワードの登録・変更' },
    { icon: '✏️', title: '修正申請', desc: '打刻ミスをスマホから申請・承認' },
    { icon: '🚃', title: '交通費記録', desc: '出勤ごとの交通費を記録・集計' },
  ];
  var planFeatures = {
    'ベーシック': [
      { ok: true,  text: 'スタッフ数：〜19名' },
      { ok: true,  text: '1店舗' },
      { ok: true,  text: 'プッシュ通知' },
      { ok: true,  text: '公式LINE対応' },
      { ok: false, text: '店舗数無制限' },
      { ok: false, text: '優先サポート' },
    ],
    'スタンダード': [
      { ok: true,  text: 'スタッフ数：〜40名' },
      { ok: true,  text: '店舗数無制限' },
      { ok: true,  text: 'プッシュ通知' },
      { ok: true,  text: '公式LINE対応' },
      { ok: false, text: '優先サポート' },
    ],
    'プレミアム': [
      { ok: true, text: 'スタッフ数：無制限' },
      { ok: true, text: '店舗数無制限' },
      { ok: true, text: 'プッシュ通知' },
      { ok: true, text: '公式LINE対応' },
      { ok: true, text: '優先サポート' },
    ],
  };
  var commonHtml = commonFeatures.map(function(f) {
    return '<div class="feat"><span class="ficon">' + f.icon + '</span>'
      + '<div><div class="ftitle">' + f.title + '</div>'
      + '<div class="fdesc">' + f.desc + '</div></div></div>';
  }).join('');
  var planCards = Object.entries(PLANS).map(function(entry) {
    var name = entry[0];
    var info = entry[1];
    var isCurrent = name === currentPlan;
    var maxUsers = info.maxUsers ? '最大' + info.maxUsers + '名' : '人数無制限';
    var rows = (planFeatures[name] || []).map(function(f) {
      return '<tr><td class="' + (f.ok ? 'ok' : 'ng') + '">' + (f.ok ? '✅' : '❌') + '</td><td>' + f.text + '</td></tr>';
    }).join('');
    return '<div class="card' + (isCurrent ? ' current' : '') + '">'
      + (isCurrent ? '<div class="badge">現在のプラン</div>' : '')
      + '<div class="pname">' + name + '</div>'
      + '<div class="price">¥' + info.price.toLocaleString() + '<span>/月</span></div>'
      + '<div class="users">' + maxUsers + '</div>'
      + '<table>' + rows + '</table>'
      + '</div>';
  }).join('');
  var css = '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Hiragino Kaku Gothic ProN",sans-serif;background:#f0f4f8;color:#333;padding:16px 12px 40px}'
    + 'h1{text-align:center;color:#06C755;font-size:20px;margin-bottom:4px}'
    + '.hero-sub{text-align:center;color:#888;font-size:12px;margin-bottom:20px}'
    + 'h2{font-size:15px;font-weight:bold;margin:20px 0 10px;color:#444}'
    + '.features{display:flex;flex-direction:column;gap:8px;max-width:480px;margin:0 auto}'
    + '.feat{display:flex;align-items:flex-start;gap:10px;background:#fff;border-radius:10px;padding:12px;box-shadow:0 1px 4px rgba(0,0,0,.06)}'
    + '.ficon{font-size:22px;flex-shrink:0}'
    + '.ftitle{font-size:14px;font-weight:bold;margin-bottom:2px}'
    + '.fdesc{font-size:12px;color:#666}'
    + '.cards{display:flex;flex-direction:column;gap:14px;max-width:480px;margin:0 auto}'
    + '.card{background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,.08);border:2px solid transparent;position:relative}'
    + '.card.current{border-color:#06C755}'
    + '.badge{position:absolute;top:-10px;right:14px;background:#06C755;color:#fff;padding:2px 12px;border-radius:20px;font-size:11px;font-weight:bold}'
    + '.pname{font-size:18px;font-weight:bold;margin-bottom:4px}'
    + '.price{font-size:24px;font-weight:bold;color:#06C755;margin-bottom:2px}'
    + '.price span{font-size:13px;color:#888}'
    + '.users{font-size:12px;color:#999;margin-bottom:10px}'
    + 'table{width:100%;border-collapse:collapse}'
    + 'td{font-size:13px;padding:5px 4px;border-bottom:1px solid #f5f5f5}'
    + 'td.ok,td.ng{width:28px;text-align:center}'
    + 'tr:last-child td{border-bottom:none}'
    + '.note{text-align:center;font-size:12px;color:#888;margin:16px auto 0;padding:14px;background:#fff;border-radius:10px;max-width:480px;line-height:1.7}'
    + '.wrap{max-width:480px;margin:0 auto}';
  return '<!DOCTYPE html><html lang="ja"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>OZOSHIFT 機能・プラン一覧</title>'
    + '<style>' + css + '</style>'
    + '</head><body>'
    + '<h1>OZOSHIFT</h1>'
    + '<p class="hero-sub">OZONOIX シフト・勤怠管理アプリ</p>'
    + '<div class="wrap">'
    + '<h2>📋 全プラン共通の機能</h2>'
    + '<div class="features">' + commonHtml + '</div>'
    + '<h2>💎 プラン別の機能</h2>'
    + '<div class="cards">' + planCards + '</div>'
    + '<div class="note">これら以外にも<strong>独自カスタマイズ</strong>が可能です。<br>希望機能はLINEにてご相談ください。</div>'
    + '</div>'
    + '</body></html>';
}

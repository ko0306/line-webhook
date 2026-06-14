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
  var features = [
    { icon: '📅', title: 'シフト作成・管理',    desc: '管理者がカレンダー形式でシフトを作成。スタッフはスマホでいつでも確認できます。' },
    { icon: '⏰', title: '勤怠打刻',            desc: '出勤・退勤・休憩を1タップで記録。時刻・GPS情報も自動保存されます。' },
    { icon: '📊', title: '勤務時間の自動集計',  desc: '月次・週次の労働時間・残業時間を自動計算。給与計算にそのまま活用できます。' },
    { icon: '📋', title: 'CSV出力',             desc: '勤怠データをCSV形式でダウンロード。Excelや給与計算ソフトとの連携も簡単。' },
    { icon: '📱', title: 'スマホアプリとして使用', desc: 'ホーム画面に追加するだけでアプリとして起動（PWA）。インストール不要・すぐ使えます。' },
    { icon: '🔔', title: 'プッシュ通知',         desc: 'シフト公開・変更をスタッフのスマホにリアルタイム通知。見落としゼロへ。' },
    { icon: '✏️', title: '打刻修正申請',         desc: '打刻ミスをスタッフがスマホから申請→管理者が承認。手書き修正が不要になります。' },
    { icon: '👥', title: 'スタッフ管理',         desc: 'スタッフの登録・削除・役職設定・パスワード変更がブラウザから簡単操作。' },
    { icon: '🚃', title: '交通費記録',           desc: '出勤ごとの交通費を記録し月次集計。交通費精算の手間を大幅に削減できます。' },
    { icon: '🔒', title: '高いセキュリティ',     desc: 'お客様専用の独立したアプリを構築。他社データと混在せず安心してご利用いただけます。' },
  ];

  var planData = [
    {
      name: 'ベーシック',
      price: 1980,
      popular: false,
      summary: '小規模店舗向け',
      items: [
        { ok: true,  text: '従業員数 〜19名' },
        { ok: true,  text: '1店舗' },
        { ok: true,  text: 'プッシュ通知' },
        { ok: true,  text: '公式LINE対応' },
        { ok: false, text: '多店舗管理' },
        { ok: false, text: '優先サポート' },
      ],
    },
    {
      name: 'スタンダード',
      price: 2980,
      popular: true,
      summary: '中規模・多店舗向け',
      items: [
        { ok: true,  text: '従業員数 〜40名' },
        { ok: true,  text: '店舗数 無制限' },
        { ok: true,  text: 'プッシュ通知' },
        { ok: true,  text: '公式LINE対応' },
        { ok: false, text: '優先サポート' },
      ],
    },
    {
      name: 'プレミアム',
      price: 3980,
      popular: false,
      summary: '大規模・優先対応',
      items: [
        { ok: true, text: '従業員数 無制限' },
        { ok: true, text: '店舗数 無制限' },
        { ok: true, text: 'プッシュ通知' },
        { ok: true, text: '公式LINE対応' },
        { ok: true, text: '優先サポート' },
      ],
    },
  ];

  var featHtml = features.map(function(f) {
    return '<div class="feat">'
      + '<span class="ficon">' + f.icon + '</span>'
      + '<div><div class="ftitle">' + f.title + '</div>'
      + '<div class="fdesc">' + f.desc + '</div></div>'
      + '</div>';
  }).join('');

  var planHtml = planData.map(function(p) {
    var isCurrent = p.name === currentPlan;
    var rowsHtml = p.items.map(function(item) {
      return '<div class="prow' + (item.ok ? '' : ' ng') + '">'
        + '<span class="chk">' + (item.ok ? '✅' : '❌') + '</span>'
        + '<span>' + item.text + '</span>'
        + '</div>';
    }).join('');
    var badges = '';
    if (p.popular && !isCurrent) badges += '<div class="badge pop">人気 No.1</div>';
    if (isCurrent)               badges += '<div class="badge cur">現在のプラン</div>';
    return '<div class="card' + (isCurrent ? ' current' : '') + (p.popular ? ' popular' : '') + '">'
      + badges
      + '<div class="pname">' + p.name + 'プラン</div>'
      + '<div class="psummary">' + p.summary + '</div>'
      + '<div class="pprice">¥' + p.price.toLocaleString() + '<span class="pmo">/月（税込）</span></div>'
      + '<div class="divider"></div>'
      + '<div class="prows">' + rowsHtml + '</div>'
      + '</div>';
  }).join('');

  var css = [
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif;background:#f0f4f8;color:#333;padding-bottom:48px}',
    '.hero{background:linear-gradient(135deg,#06C755 0%,#00a040 100%);color:#fff;text-align:center;padding:28px 16px 22px}',
    '.hero-title{font-size:24px;font-weight:bold;letter-spacing:.08em}',
    '.hero-sub{font-size:12px;opacity:.85;margin-top:4px}',
    '.hero-note{display:inline-block;background:rgba(255,255,255,.2);border-radius:20px;font-size:11px;padding:4px 14px;margin-top:10px}',
    '.wrap{max-width:480px;margin:0 auto;padding:0 12px}',
    'h2{font-size:15px;font-weight:bold;margin:24px 0 12px;color:#444;display:flex;align-items:center;gap:6px}',
    '.feats{display:flex;flex-direction:column;gap:8px}',
    '.feat{display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:12px;padding:13px 14px;box-shadow:0 1px 5px rgba(0,0,0,.07)}',
    '.ficon{font-size:22px;flex-shrink:0;margin-top:1px}',
    '.ftitle{font-size:14px;font-weight:bold;margin-bottom:3px;color:#222}',
    '.fdesc{font-size:12px;color:#666;line-height:1.65}',
    '.plans{display:flex;flex-direction:column;gap:16px}',
    '.card{background:#fff;border-radius:14px;padding:20px 16px 16px;box-shadow:0 2px 10px rgba(0,0,0,.09);border:2.5px solid transparent;position:relative;overflow:hidden}',
    '.card.current{border-color:#06C755}',
    '.card.popular:not(.current){border-color:#ff9500}',
    '.badge{display:inline-block;font-size:11px;font-weight:bold;border-radius:20px;padding:3px 12px;margin-bottom:10px}',
    '.badge.pop{background:#ff9500;color:#fff}',
    '.badge.cur{background:#06C755;color:#fff}',
    '.pname{font-size:19px;font-weight:bold;color:#222;margin-bottom:2px}',
    '.psummary{font-size:12px;color:#888;margin-bottom:10px}',
    '.pprice{font-size:30px;font-weight:bold;color:#06C755;line-height:1}',
    '.pmo{font-size:13px;color:#888;font-weight:normal}',
    '.divider{height:1px;background:#f0f0f0;margin:14px 0}',
    '.prows{display:flex;flex-direction:column;gap:7px}',
    '.prow{display:flex;align-items:center;gap:8px;font-size:13px;color:#333}',
    '.prow.ng{color:#bbb}',
    '.chk{width:22px;text-align:center;flex-shrink:0}',
    '.note-box{background:#fff;border-radius:12px;padding:16px;text-align:center;font-size:12px;color:#666;line-height:1.85;margin-top:8px;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    '.note-box strong{color:#06C755}',
    '.cta{display:block;background:#06C755;color:#fff;text-align:center;padding:15px;border-radius:13px;font-size:15px;font-weight:bold;text-decoration:none;margin-top:16px;box-shadow:0 4px 12px rgba(6,199,85,.35);letter-spacing:.04em}',
  ].join('');

  return '<!DOCTYPE html><html lang="ja"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>OZOSHIFT 機能・プラン一覧</title>'
    + '<style>' + css + '</style>'
    + '</head><body>'
    + '<div class="hero">'
    + '<div class="hero-title">⚡ OZOSHIFT</div>'
    + '<div class="hero-sub">OZONOIX シフト・勤怠管理アプリ</div>'
    + '<div class="hero-note">🎉 初月まるごと無料トライアル実施中</div>'
    + '</div>'
    + '<div class="wrap">'
    + '<h2>📋 全プラン共通の機能</h2>'
    + '<div class="feats">' + featHtml + '</div>'
    + '<h2>💎 プラン比較</h2>'
    + '<div class="plans">' + planHtml + '</div>'
    + '<div class="note-box">'
    + '✅ 初月は<strong>全プラン・全機能が無料</strong>でお試しいただけます<br>'
    + '✅ <strong>独自カスタマイズ</strong>にも対応しています<br>'
    + 'ご希望の機能があればお気軽にLINEでご相談ください😊'
    + '</div>'
    + '</div>'
    + '</body></html>';
}

// ================================================================
// OZONOIX タスク管理アプリ - HTMLサーバー（Vercel）
// GASのリダイレクト問題を回避するためVercelからHTMLを直接配信
// ================================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwGbrUkII2BdnwlH43L5O6FWJQ2jOijKHCOpTeVqAVIY3OGPxKu0r-N_aeRcSIQcEw/exec';

const MEMBERS = {
  'U0865b02870c6e6dc2ef667678ea18818': '小田晃生',
  'Ub90c13e29307640e4e61594b85eb29b5': '鬼塚朔誠',
  'U81b486c6b0054cb5dfbefe5acdac2a64': '大高',
};

function buildHTML(initialPage, initialUid) {
  const memberOptions = Object.entries(MEMBERS)
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join(''); // タスク追加・罰金・質問フォームで使用

  const today = new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).replace(/\//g, '-');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OZONOIX タスク管理</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Hiragino Kaku Gothic ProN",sans-serif;background:#f5f5f5;color:#333;padding-bottom:40px}
.page{display:none}
.header{padding:14px 16px;font-size:17px;font-weight:bold;text-align:center;color:#fff}
.back-btn{display:flex;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid #eee;font-size:14px;color:#2196F3;cursor:pointer}
.card{background:#fff;border-radius:12px;padding:16px;margin:12px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
label{display:block;font-size:13px;color:#888;margin-bottom:4px;margin-top:12px}
input,select,textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:15px;font-family:inherit}
textarea{height:80px;resize:none}
.btn{display:block;width:100%;padding:14px;border:none;border-radius:8px;font-size:16px;font-weight:bold;color:#fff;cursor:pointer;margin-top:12px}
.btn-blue{background:#2196F3}.btn-dark{background:#1565C0}.btn-red{background:#E53935}.btn-green{background:#43A047}.btn-orange{background:#FF6F00}.btn-grey{background:#9E9E9E}
.section-title{font-size:14px;font-weight:bold;color:#555;padding:12px 12px 4px}
.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;margin-left:4px}
.tag-blue{background:#E3F2FD;color:#1565C0}.tag-red{background:#FFEBEE;color:#C62828}
.task-card{background:#fff;border-radius:10px;padding:12px;margin:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-left:4px solid #ddd}
.task-card.own{border-left-color:#2196F3;background:#F0F8FF}
.task-card.overdue{border-left-color:#F44336}
.task-name{font-size:15px;font-weight:bold;margin-bottom:4px}
.task-meta{font-size:12px;color:#888}
.penalty-card{background:#fff;border-radius:10px;padding:14px;margin:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.q-card{background:#fff;border-radius:10px;padding:12px;margin:8px 12px;box-shadow:0 1px 4px rgba(0,0,0,.08);border-left:4px solid #FF6F00}
.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;display:none;z-index:999}
.spinner{text-align:center;padding:40px;color:#888}
</style>
<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
</head>
<body>

<!-- ローディング -->
<div id="loading" style="text-align:center;padding:60px 20px;color:#888">
  <div style="font-size:36px;margin-bottom:12px">⌛</div>
  <div style="font-size:14px">読み込み中...</div>
</div>

<!-- メニュー -->
<div id="page-menu" class="page">
  <div class="header" style="background:#37474F">📱 OZONOIX タスク管理</div>
  <div class="card">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <button class="btn btn-blue" style="margin:0" onclick="showPage('task-add')">📋<br>タスク追加</button>
      <button class="btn btn-dark" style="margin:0" onclick="showPage('task-list')">✅<br>タスク確認</button>
      <button class="btn btn-red"  style="margin:0" onclick="showPage('penalty')">💰<br>罰金管理</button>
      <button class="btn btn-orange" style="margin:0" onclick="showPage('question')">❓<br>質問</button>
    </div>
  </div>
</div>

<!-- タスク追加 -->
<div id="page-task-add" class="page">
  <div class="header" style="background:#2196F3">📋 タスク追加</div>
  <div class="back-btn" onclick="showPage('menu')">← メニューに戻る</div>
  <div class="card">
    <label>担当者</label><select id="assignee">${memberOptions}</select>
    <label>タスク内容</label><textarea id="content" placeholder="例：〇〇の資料を作成する"></textarea>
    <label>期限</label><input type="date" id="deadline" value="${today}">
    <label>罰金（円）※任意</label><input type="number" id="penalty-amount" placeholder="なし（0）" min="0" step="100">
    <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
      <input type="checkbox" id="notify" checked style="width:18px;height:18px">
      <span style="font-size:14px">グループに@メンションで通知する</span>
    </div>
    <button class="btn btn-blue" id="submitBtn" onclick="submitTask()">追加する</button>
    <div id="task-toast" style="margin-top:10px;padding:10px;background:#E8F5E9;border-radius:8px;color:#2E7D32;font-size:14px;display:none">✅ タスクを追加しました</div>
  </div>
</div>

<!-- タスク一覧 -->
<div id="page-task-list" class="page">
  <div class="header" style="background:#1976D2">✅ タスク一覧</div>
  <div class="back-btn" onclick="showPage('menu')">← メニューに戻る</div>
  <div id="taskListContent"><div class="spinner">読み込み中...</div></div>
</div>

<!-- 罰金管理 -->
<div id="page-penalty" class="page">
  <div class="header" style="background:#E53935">💰 罰金管理</div>
  <div class="back-btn" onclick="showPage('menu')">← メニューに戻る</div>
  <div id="penaltyListContent"><div class="spinner">読み込み中...</div></div>
  <div class="section-title">➕ 罰金追加</div>
  <div class="card">
    <label>対象者</label><select id="penaltyTarget">${memberOptions}</select>
    <label>金額（円）</label><input type="number" id="penaltyAmount" placeholder="例：500" min="1" step="100">
    <label>理由</label><input type="text" id="penaltyReason" placeholder="例：遅刻">
    <button class="btn btn-red" onclick="addPenalty()">罰金を追加する</button>
  </div>
  <div class="section-title">💳 入金記録</div>
  <div class="card">
    <label>入金者</label><select id="paymentTarget">${memberOptions}</select>
    <label>入金額（円）</label><input type="number" id="paymentAmount" placeholder="例：1000" min="1" step="100">
    <button class="btn btn-green" onclick="addPayment()">入金を記録する</button>
  </div>
</div>

<!-- 質問 -->
<div id="page-question" class="page">
  <div class="header" style="background:#FF6F00">❓ 質問</div>
  <div class="back-btn" onclick="showPage('menu')">← メニューに戻る</div>
  <div id="questionListContent"><div class="spinner">読み込み中...</div></div>
  <div class="section-title">✉️ 新しい質問を送る</div>
  <div class="card">
    <label>宛先</label><select id="questionTarget">${memberOptions}</select>
    <label>質問内容</label><textarea id="questionContent" placeholder="質問内容を入力..."></textarea>
    <button class="btn btn-orange" onclick="sendQuestion()">送信する</button>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
var GAS_URL = "${GAS_URL}";
var MEMBERS = ${JSON.stringify(MEMBERS)};
var uid = "${initialUid}";
var initPage = "${initialPage}";
var LIFF_ID = "2009897115-OEC9F1K2";

function showPage(name) {
  document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });
  document.getElementById('page-' + name).style.display = 'block';
  if (name === 'task-list') loadTasks();
  if (name === 'penalty') loadPenalties();
  if (name === 'question') loadQuestions();
}

function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 2500);
}

function submitTask() {
  var assigneeId = document.getElementById('assignee').value;
  var content = document.getElementById('content').value.trim();
  var deadline = document.getElementById('deadline').value;
  var penalty = parseInt(document.getElementById('penalty-amount').value) || 0;
  var notify = document.getElementById('notify').checked;
  if (!content) { alert('タスク内容を入力してください'); return; }
  if (!deadline) { alert('期限を入力してください'); return; }
  document.getElementById('task-toast').style.display = 'block';
  document.getElementById('submitBtn').disabled = true;
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ _source: 'liff', action: 'addTask',
      userId: uid, assigneeId: assigneeId, content: content,
      deadline: deadline.replace(/-/g, '/'), penalty: penalty, notify: notify })
  }).catch(function() {});
  setTimeout(function() {
    showPage('menu');
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('task-toast').style.display = 'none';
    document.getElementById('content').value = '';
  }, 1500);
}

function loadTasks() {
  document.getElementById('taskListContent').innerHTML = '<div class="spinner">読み込み中...</div>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'getTaskList', userId: uid }) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var el = document.getElementById('taskListContent');
      if (!data.tasks || data.tasks.length === 0) {
        el.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:#888">✅ 未完了のタスクはありません</div>';
        renderStats(data.stats || []);
        return;
      }
      var myTasks = data.tasks.filter(function(t) { return t.isOwn; });
      var otherTasks = data.tasks.filter(function(t) { return !t.isOwn; });
      var html = '';
      if (myTasks.length > 0) {
        html += '<div class="section-title" style="color:#1565C0">📌 自分のタスク</div>';
        myTasks.forEach(function(t) { html += taskCard(t); });
      }
      if (otherTasks.length > 0) {
        html += '<div class="section-title" style="color:#757575">👥 他のメンバーのタスク</div>';
        otherTasks.forEach(function(t) { html += taskCard(t); });
      }
      el.innerHTML = html;
      renderStats(data.stats || []);
    })
    .catch(function() {
      document.getElementById('taskListContent').innerHTML = '<div class="card" style="color:#E53935">読み込みに失敗しました</div>';
    });
}

function taskCard(t) {
  var cls = t.isOwn ? 'own' : (t.isOverdue ? 'overdue' : '');
  var badge = t.isOwn ? '<span class="tag tag-blue">自分</span>' : '';
  var overdue = t.isOverdue ? '<span class="tag tag-red">期限切れ</span>' : '';
  var pen = t.penalty > 0 ? '<span class="tag tag-red">💰¥' + Number(t.penalty).toLocaleString() + '</span>' : '';
  var btn = t.isOwn ? '<button class="btn btn-blue" style="margin-top:8px;padding:8px" onclick="complete(\'' + t.id + '\')">✅ 完了にする</button>' : '';
  return '<div class="task-card ' + cls + '"><div class="task-name">' + t.content + badge + overdue + pen + '</div><div class="task-meta">担当：' + t.assignee + '　期限：' + t.deadline + '</div>' + btn + '</div>';
}

function renderStats(stats) {
  if (!stats.length) return;
  var html = '<div class="section-title">📊 完遂率</div><div class="card">';
  stats.forEach(function(s) {
    html += '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>' + s.name + '</span><span>' + s.done + '/' + s.total + '件 ' + s.rate + '%</span></div><div style="background:#eee;border-radius:4px;height:8px"><div style="background:#2196F3;width:' + s.rate + '%;height:8px;border-radius:4px"></div></div></div>';
  });
  html += '</div>';
  document.getElementById('taskListContent').insertAdjacentHTML('beforeend', html);
}

function complete(taskId) {
  if (!confirm('このタスクを完了にしますか？')) return;
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'completeTask', userId: uid, taskId: taskId }) }).catch(function() {});
  showToast('🎉 タスクを完了しました！');
  setTimeout(function() { loadTasks(); }, 3000);
}

function loadPenalties() {
  document.getElementById('penaltyListContent').innerHTML = '<div class="spinner">読み込み中...</div>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'getPenaltyList', userId: uid }) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var el = document.getElementById('penaltyListContent');
      if (!data.members || data.members.every(function(m) { return m.total === 0; })) {
        el.innerHTML = '<div class="card" style="text-align:center;color:#888">罰金の記録はありません</div>';
        return;
      }
      var html = '';
      data.members.forEach(function(m) {
        var border = m.isOwn ? '2px solid #E53935' : '1px solid #eee';
        var dets = m.details.map(function(d) {
          return '<div style="padding:4px 0;border-bottom:1px solid #f5f5f5">・' + d.reason + '（' + d.adder + '）：¥' + Number(d.amount).toLocaleString() + (d.paid > 0 ? '　入金済：¥' + Number(d.paid).toLocaleString() : '') + '</div>';
        }).join('');
        html += '<div class="penalty-card" style="border:' + border + '"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:16px;font-weight:bold">' + m.name + (m.isOwn ? '<span class="tag tag-blue">自分</span>' : '') + '</div><div style="font-size:22px;font-weight:bold;color:#E53935">¥' + m.balance.toLocaleString() + '</div></div><div style="font-size:12px;color:#888;margin-top:4px">合計：¥' + m.total.toLocaleString() + '　入金済：¥' + m.paid.toLocaleString() + '</div>' + (m.details.length > 0 ? '<div style="margin-top:8px;font-size:12px;border-top:1px solid #eee;padding-top:8px">' + dets + '</div>' : '') + '</div>';
      });
      el.innerHTML = html;
    })
    .catch(function() {});
}

function addPenalty() {
  var targetId = document.getElementById('penaltyTarget').value;
  var amount = parseInt(document.getElementById('penaltyAmount').value);
  var reason = document.getElementById('penaltyReason').value.trim();
  if (!amount || amount <= 0) { alert('金額を入力してください'); return; }
  if (!reason) { alert('理由を入力してください'); return; }
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'addPenalty', userId: uid, targetId: targetId, amount: amount, reason: reason }) }).catch(function() {});
  showToast('💰 罰金を追加しました');
  document.getElementById('penaltyAmount').value = '';
  document.getElementById('penaltyReason').value = '';
  setTimeout(function() { loadPenalties(); }, 3000);
}

function addPayment() {
  var targetId = document.getElementById('paymentTarget').value;
  var amount = parseInt(document.getElementById('paymentAmount').value);
  if (!amount || amount <= 0) { alert('金額を入力してください'); return; }
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'addPayment', userId: uid, targetId: targetId, amount: amount }) }).catch(function() {});
  showToast('💳 入金を記録しました');
  document.getElementById('paymentAmount').value = '';
  setTimeout(function() { loadPenalties(); }, 3000);
}

function loadQuestions() {
  document.getElementById('questionListContent').innerHTML = '<div class="spinner">読み込み中...</div>';
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'getQuestionList', userId: uid }) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var el = document.getElementById('questionListContent');
      var html = '';
      if (data.toMe && data.toMe.length > 0) {
        html += '<div class="section-title" style="color:#E65100">⚠️ あなたへの未回答質問</div>';
        data.toMe.forEach(function(q) {
          html += '<div class="q-card"><div style="font-size:12px;color:#888">' + q.from + 'さんから</div><div style="font-size:15px;margin:6px 0">' + q.content + '</div><div style="display:flex;gap:8px;align-items:center"><input type="text" id="ans_' + q.id + '" placeholder="回答を入力..." style="flex:1;padding:8px;border:1px solid #ddd;border-radius:6px"><button onclick="answer(\'' + q.id + '\')" style="background:#FF6F00;color:#fff;border:none;padding:8px 12px;border-radius:6px;font-weight:bold">返信</button></div></div>';
        });
      }
      if (data.fromMe && data.fromMe.length > 0) {
        html += '<div class="section-title" style="color:#757575">📤 自分が送った未回答の質問</div>';
        data.fromMe.forEach(function(q) {
          html += '<div class="q-card" style="border-left-color:#9E9E9E"><div style="font-size:12px;color:#888">' + q.to + 'さんへ</div><div style="font-size:15px;margin:4px 0">' + q.content + '</div><div style="font-size:11px;color:#aaa">未回答</div></div>';
        });
      }
      if (!data.toMe.length && !data.fromMe.length) {
        html += '<div class="card" style="text-align:center;color:#888">未回答の質問はありません</div>';
      }
      if (data.answered && data.answered.length > 0) {
        html += '<div class="section-title" style="color:#757575">✅ 最近の回答済み質問</div>';
        data.answered.forEach(function(q) {
          html += '<div class="q-card" style="border-left-color:#43A047;opacity:.7"><div style="font-size:12px;color:#888">' + q.from + '→' + q.to + '</div><div style="font-size:13px;margin:4px 0">Q: ' + q.content + '</div><div style="font-size:13px;color:#388E3C">A: ' + q.answer + '</div></div>';
        });
      }
      el.innerHTML = html;
    })
    .catch(function() {});
}

function answer(qId) {
  var input = document.getElementById('ans_' + qId);
  var ans = input.value.trim();
  if (!ans) { alert('回答を入力してください'); return; }
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'answerQuestion', userId: uid, qId: qId, answer: ans }) }).catch(function() {});
  showToast('✅ 回答を送信しました');
  setTimeout(function() { loadQuestions(); }, 3000);
}

function sendQuestion() {
  var targetId = document.getElementById('questionTarget').value;
  var content = document.getElementById('questionContent').value.trim();
  if (!content) { alert('質問内容を入力してください'); return; }
  fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ _source: 'liff', action: 'sendQuestion', userId: uid, targetId: targetId, content: content }) }).catch(function() {});
  showToast('✉️ 質問を送信しました');
  document.getElementById('questionContent').value = '';
  setTimeout(function() { loadQuestions(); }, 3000);
}

// URLパラメータ検出（liff.stateにも対応）
function detectPage() {
  var params = new URLSearchParams(window.location.search);
  var page = params.get('page');
  if (!page) {
    var liffState = params.get('liff.state');
    if (liffState) {
      var sp = new URLSearchParams(liffState.replace(/^\?/, ''));
      page = sp.get('page');
    }
  }
  return page || initPage || 'menu';
}

// 初期化
(function init() {
  var targetPage = detectPage();

  function showApp() {
    document.getElementById('loading').style.display = 'none';
    showPage(targetPage);
  }

  // 安全タイムアウト: 6秒後も読み込み中なら強制表示
  setTimeout(function() {
    if (document.getElementById('loading').style.display !== 'none') {
      showApp();
    }
  }, 6000);

  try {
    liff.init({ liffId: LIFF_ID })
      .then(function() {
        if (liff.isLoggedIn()) {
          return liff.getProfile().then(function(profile) {
            if (MEMBERS[profile.userId]) {
              uid = profile.userId;
              try { localStorage.setItem('oz_uid', uid); } catch(e) {}
            }
          }).catch(function() {});
        }
      })
      .catch(function() {})
      .then(function() { showApp(); });
  } catch(e) {
    showApp();
  }
})();
</script>
</body>
</html>`;
}

module.exports = (req, res) => {
  const page = req.query.page || 'menu';
  const uid = req.query.uid || '';
  const html = buildHTML(page, uid);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).send(html);
};

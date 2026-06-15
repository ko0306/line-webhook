# コンタクトフォーム修正依頼

## 概要

`https://harurururun.github.io/company-OZONONIX/contact` のお問い合わせフォームに、
**送信完了後に3つのLINEボタンを表示する処理**を追加してください。

---

## 表示する3つのボタン

| ボタン名 | 説明 | リンク先 |
|---------|------|---------|
| ① 無料相談を申し込む | 公式LINEで無料相談フローを開始 | `https://liff.line.me/2009734205-wWWdTXIP?page=free` |
| ② LINEに戻る（登録済みの方） | すでに公式LINEを登録済みの方 | `https://liff.line.me/2009734205-wWWdTXIP` |
| ③ 公式LINEに登録する（未登録の方） | はじめて登録する方 | `https://line.me/R/ti/p/@152nnfoc` |

---

## 動作説明

### ① 無料相談を申し込む
- LIFFアプリが開き、自動で「無料相談」メッセージを送信
- LINEボットが無料相談フローを開始（サービス選択 → 詳細質問）

### ② LINEに戻る（登録済みの方）
- LIFFアプリが開き、自動で「メール認証」メッセージを送信
- LINEボットがメールアドレスを確認し、契約情報と照合

### ③ 公式LINEに登録する（未登録の方）
- LINE公式アカウントの友達追加ページへ遷移
- 登録後、自動でメールアドレスを確認するメッセージが届く

---

## 実装コード例

### HTML（送信完了後に表示）

```html
<div id="line-buttons" style="display:none; text-align:center; margin-top:24px;">
  <p style="margin-bottom:16px; font-weight:bold;">送信が完了しました！<br>次のステップをお選びください。</p>

  <a href="https://liff.line.me/2009734205-wWWdTXIP?page=free"
     style="display:block; background:#06C755; color:#fff; padding:14px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:10px;">
    ① 無料相談を申し込む
  </a>

  <a href="https://liff.line.me/2009734205-wWWdTXIP"
     style="display:block; background:#fff; color:#06C755; border:2px solid #06C755; padding:14px; border-radius:8px; text-decoration:none; font-weight:bold; margin-bottom:10px;">
    ② LINEに戻る（登録済みの方）
  </a>

  <a href="https://line.me/R/ti/p/@152nnfoc"
     style="display:block; background:#fff; color:#06C755; border:2px solid #06C755; padding:14px; border-radius:8px; text-decoration:none; font-weight:bold;">
    ③ 公式LINEに登録する（未登録の方）
  </a>
</div>
```

### JavaScript（フォーム送信後にボタンを表示）

```javascript
fetch(GAS_URL, {
  method: 'POST',
  body: JSON.stringify(formData),
})
  .then(response => response.json())
  .then(data => {
    // 既存の完了処理（あれば残す）

    // ★ 3つのLINEボタンを表示
    document.getElementById('line-buttons').style.display = 'block';
    // フォームを非表示にする場合
    // document.getElementById('contact-form').style.display = 'none';
  });
```

---

## 注意事項

- ①②は既存のLINEユーザー向け（LIFFアプリが開く）
- ③は新規登録者向け（LINEの友達追加ページへ遷移）
- エラー時（送信失敗）はボタンを表示しないでください

---

## 3つのURLコピー用

```
① 無料相談：
https://liff.line.me/2009734205-wWWdTXIP?page=free

② 登録済み（LINEに戻る）：
https://liff.line.me/2009734205-wWWdTXIP

③ 未登録（友達追加）：
https://line.me/R/ti/p/@152nnfoc
```

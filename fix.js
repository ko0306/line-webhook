const fs = require('fs');
let content = fs.readFileSync('api/webhook.js', 'utf8');

// シングルクォート文字列内の実際の改行を \n に置換
let fixed = '';
let inSingleQuote = false;
for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const prev = i > 0 ? content[i-1] : '';
  if (ch === "'" && prev !== '\') {
    inSingleQuote = !inSingleQuote;
    fixed += ch;
  } else if (inSingleQuote && ch === '\n') {
    fixed += '\n';
  } else if (inSingleQuote && ch === '\r') {
    // skip
  } else {
    fixed += ch;
  }
}

fs.writeFileSync('api/webhook.js', fixed, 'utf8');
console.log('Done');

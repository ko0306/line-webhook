@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ロックファイルを削除中...
if exist ".git\index.lock" del /f ".git\index.lock"
echo ファイルをステージング中...
git add gas-script.js richmenu.png setup-richmenu.js card1_shift.png card2_hp.png card3_app.png package-lock.json .gitignore
echo コミット中...
git commit -m "コードの変更をVercelに反映"
echo GitHubにプッシュ中...
git push origin main
echo.
echo 完了しました！このウィンドウを閉じてください。
pause

# 專注樂坊

為 ADHD 設計的專注音樂生成器。在瀏覽器裡即時自動編曲，每次都不一樣，長度不限，沒有歌詞。

## 使用方式

使用 Safari 或 Chrome 開啟 [專注樂坊線上版](https://uktwanimatorcodeps.github.io/Generative-music-tool/)，點「播放」即可使用。網站的「調整 → 版本更新」可查看目前發布版本。

直接用瀏覽器開啟 `index.html`，按播放即可。不需要安裝任何東西。

也可以啟動內建的靜態伺服器：

```bash
node tools/serve.mjs
```

然後開啟 http://localhost:8765 。

## 功能

- **五個分類、十三種風格**：古典（巴赫、莫札特、蕭邦、薩提、德布西）、日本現代（坂本龍一、久石讓）、極簡氛圍（佩爾特、萊許、葛拉斯、伊諾）、Lo-fi、白噪音。風格取法的是作曲手法，不是重現任何既有作品。
- **張力弧線**：每首曲子會走「鋪陳 → 發展 → 推進 → 高點 → 回落 → 餘韻」，同時控制強弱、音域、層數與速度。
- **情緒與曲名**：每首曲子有一種情緒（平靜、思念、希望、憂鬱、溫暖、漂流），並依該音樂家的命名習慣產生曲名。
- **旋律評審**：每小節寫出多個候選版本，評分後取最佳，評分權重會依近期成果自動調整。
- **自動配器**：依樂段加入長音、對旋律、旋律重疊與點綴。
- **真實樂器取樣**：二十種樂器，載不到取樣時自動退回合成音色。
- **樂譜畫面**：掃描線、分層配色的音符方條、張力曲線與各層強度。
- **專注計時**、背景噪音（棕、粉紅、白）、MIDI 匯出。

## 檔案

| 路徑 | 內容 |
|---|---|
| `index.html` | 編曲引擎與介面，單一檔案 |
| `samples/*.js` | 樂器取樣（mp3 以 base64 包成腳本，讓 `file://` 也能載入） |
| `tools/fetch-samples.mjs` | 重新下載並打包取樣 |
| `tools/serve.mjs` | 靜態伺服器 |

## 音色來源與授權

`samples/` 裡的錄音不是本專案的原創內容，各自依原授權釋出：

| 樂器 | 來源 | 授權 |
|---|---|---|
| 鋼琴 | [Salamander Grand Piano](https://sfzinstruments.github.io/pianos/salamander/)（Yamaha C5，Alexander Holm 錄製），取自 [Tone.js](https://tonejs.github.io/) 的音檔 | CC BY 3.0 |
| 大提琴、小提琴、長笛、單簧管、法國號、豎琴、古典吉他、管風琴 | [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) | CC BY 3.0 |
| 電鋼琴、大鍵琴、馬林巴、鋼片琴、顫音琴、音樂盒、箏、撥弦、低音提琴、弦樂群、合唱 | [gleitz/midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) 的 MusyngKite | CC BY-SA 3.0 |

取樣經過的處理：轉成 base64、載入時去除開頭空白、長音樂器製作循環段。

## 行動裝置與回歸測試

同一個頁面支援直向和橫向。短螢幕可以捲到播放列，調整面板也能獨立捲動。手機離開頁面或音訊中斷時會暫停。回到頁面後，點「繼續播放」即可重新啟動音訊。專注計時以實際時間運作。計時到點時，頁面需在前景且音訊可用才能播放提示音。

樂器出現在樂譜時才會請求對應取樣。取樣準備前或載入失敗時，該樂器會使用原有的合成音色。載入失敗的取樣可在 30 秒後、下次演奏該樂器時重試。開發者工具會記錄播放狀態、失敗的取樣包與解碼音名。

需有 Node.js 20 以上。從專案根目錄執行：

```sh
npm ci
npx playwright install chromium webkit
npm test
```

測試會檢查 iPhone 尺寸的 WebKit、Android 尺寸的 Chromium、桌面 Chrome for Testing、取樣錯誤回復、`file://` 相容性，以及 Pages 子路徑下全部 20 個取樣包。若已安裝 Microsoft Edge，設 `TEST_EDGE=1` 後再執行 `npm test`，即可加入 Edge 測試。在 Windows PowerShell 可用 `$env:TEST_EDGE = '1'` 設定。

真機驗收請分別在 iPhone Safari 和 Android Chrome 檢查直向、橫向、雙指縮放、捲動、設定面板、播放與停止、換曲和音量。播放中切到背景、鎖定再解鎖，以及接到電話或切換音訊輸出時，請確認回到頁面後能點「繼續播放」，且聲音沒有重疊。Playwright 使用模擬的可見性與中斷事件。若使用的 WebKit 建置未提供 Web Audio，測試會標示僅驗證介面、編曲及缺少音訊功能時的提示。

## 版本更新

### 2026.11.16（2026 年 11 月 16 日）

- 手機支援直向與橫向，改善安全區域、捲動和觸控操作。
- 新增停止按鈕，手機切到背景或音訊中斷後可回到頁面手動繼續播放。
- 樂器取樣按需載入，沿用原始錄音。Android Chromium 模擬及桌面 Chrome、Edge 已驗證音訊輸出，iPhone Safari 真機驗收待完成。

## GitHub Pages 部署

1. 目前 iPhone 驗收版本由 `fix/mobile-compatibility` 的 `/ (root)` 發布。
2. 完成驗收並合併 PR 後，在 **Settings → Pages** 將發布來源切到 `main` 的 `/ (root)`。專案根目錄的 `.nojekyll` 讓 Pages 直接提供靜態 HTML 和取樣檔。
3. 在 **Actions** 確認 Pages 部署成功。開啟 [GitHub Pages 網頁](https://uktwanimatorcodeps.github.io/Generative-music-tool/)，按下播放並在 Network 確認請求路徑為 `/Generative-music-tool/samples/…`、回傳 200。
4. 發布前可用 `node tools/serve.mjs` 啟動靜態伺服器，開啟 `http://localhost:8765/Generative-music-tool/` 檢查相同的子路徑。此靜態網站無需打包。

# 專注樂坊

為 ADHD 設計的專注音樂生成器。在瀏覽器裡即時自動編曲，每次都不一樣，長度不限，沒有歌詞。

## 使用方式

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

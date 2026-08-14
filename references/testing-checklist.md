# Kiểm thử 3 lớp — script mẫu

Nguyên tắc: rẻ nhất trước, tốn nhất sau; dừng sớm nếu lớp trước đã lộ lỗi thay vì chạy hết cả 3 lớp mỗi lần sửa nhỏ.

## Lớp 1 — Đối chiếu bằng chính engine, chạy trong Node (không cần trình duyệt)

Cài engine qua npm (dùng đúng package chạy trong trình duyệt, vd `sql.js`), viết script chạy lại toàn bộ `solutionSql` của mọi câu hỏi và so với `expected` đã lưu, bằng ĐÚNG hàm so sánh sẽ dùng trong `app.js` (copy y nguyên, đừng viết lại phiên bản khác — dễ lệch logic).

```bash
mkdir -p /tmp/engine_test && cd /tmp/engine_test
npm init -y --silent && npm install <engine-npm-package> --silent
```

```js
// test_all.js
const fs = require("fs"), path = require("path");
const initEngine = require("<engine-npm-package>");
// ... copy normalizeVal/rowsEqual y hệt app.js ...
(async () => {
  const ENGINE = await initEngine();
  const questions = JSON.parse(fs.readFileSync(".../data/questions.json", "utf-8"));
  let pass = 0, fail = 0;
  for (const q of questions) {
    try {
      const db = /* load fresh db bytes cho q.db */;
      let table;
      if (q.type === "dml") { db.run(q.solutionSql); table = execLast(db, q.verifySql); }
      else table = execLast(db, q.solutionSql);
      const ok = /* dùng logic ok giống hệt gradeAndShow trong app.js, kể cả case rỗng */;
      ok ? pass++ : (fail++, console.log("FAIL", q.id));
    } catch (e) { fail++; console.log("FAIL", q.id, e.message); }
  }
  console.log(`${pass} PASS / ${fail} FAIL / ${questions.length} TỔNG`);
  process.exit(fail > 0 ? 1 : 0);
})();
```

Chạy `node test_all.js` — phải ra 100% pass trước khi sang lớp 2. Nếu fail, thường là bug thật trong dữ liệu hoặc logic chấm (không phải bug UI) — sửa ở đây trước, rẻ hơn debug qua UI nhiều.

## Lớp 2 — Tương tác thật trong Chrome đã cài sẵn (không cần Claude-in-Chrome extension)

Nếu extension `claude-in-chrome` không kết nối được (thường gặp trong môi trường CI/headless), dùng `puppeteer-core` điều khiển thẳng Chrome đã cài trên máy — không cần tải Chromium riêng:

```bash
npm install puppeteer-core --silent
```

```js
const puppeteer = require("puppeteer-core");
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", // macOS; Linux: which google-chrome-stable
  headless: "new", args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", e => console.log("[pageerror]", e.message));
page.on("console", m => { if (m.type()==="error") console.log("[console.error]", m.text()); });

await page.goto("http://localhost:PORT/index.html#/<id_cau_hoi>", { waitUntil: "networkidle0" });
await page.waitForSelector(".CodeMirror", { timeout: 10000 });

// LƯU Ý: page.click() bằng toạ độ chuột thật có thể "flaky" quanh CodeMirror
// (layout đổi sau setValue). Dùng evaluate + .click() cho các bước phụ:
await page.evaluate((sql) => { state.editor.setValue(sql); }, "SELECT ...");
await page.evaluate(() => document.getElementById("btn-submit").click());
await page.waitForSelector(".verdict", { timeout: 5000 });
const verdict = await page.$eval(".verdict", el => el.textContent.trim());
```

Việc cần test tối thiểu ở lớp này: (a) trang landing render đúng số câu hỏi, (b) nộp lời giải ĐÚNG → verdict "Chính xác", (c) nộp lời giải SAI → verdict "Chưa đúng", (d) câu DML chấm đúng, (e) toggle hint/schema hoạt động, (f) giả lập một resource 404 (`page.setRequestInterception`) → overlay lỗi hiện ra, không treo, (g) không có console error nào trong toàn bộ quá trình.

Phục vụ server local trước khi test: `python3 -m http.server <port>` chạy nền (`&`), nhớ `pkill` sau khi xong.

## Lớp 3 — Test lại trên URL production sau deploy

Chạy lại đúng script lớp 2 nhưng trỏ vào URL thật đã deploy thay vì `localhost`. Môi trường hosting thật có thể lộ lỗi mà local không có: đường dẫn tuyệt đối bị sai do subpath, header cache/CORS khác, case-sensitivity khác giữa hệ điều hành dev (macOS, không phân biệt hoa thường) và server thật (Linux, phân biệt hoa thường) — kiểm tra kỹ tên file/thư mục nếu lớp 3 fail mà lớp 2 pass.

Đo luôn thời gian tải lần 1 (chưa cache) và lần 2 (đã cache qua Cache Storage) để có số liệu thật báo cáo cho user, không đoán.

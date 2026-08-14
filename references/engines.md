# Chọn engine chạy trong trình duyệt theo chủ đề

Nguyên tắc chọn: ưu tiên engine biên dịch sẵn WebAssembly, có bundle tĩnh tải qua CDN (không cần build riêng), kích thước hợp lý cho một trang tải trong vài giây trên mạng thường (< 3MB lý tưởng, < 8MB chấp nhận được nếu có UX tải rõ ràng — xem Giai đoạn 5 trong SKILL.md).

| Chủ đề luyện tập | Engine đề xuất | Kích thước (~) | Cách tải | Ghi chú |
|---|---|---|---|---|
| SQL (SQLite/MySQL-compatible) | **sql.js** (`@jlongster/sql.js` hoặc `sql.js` gốc) | wasm ~650KB, js ~50KB | `cdnjs.cloudflare.com/ajax/libs/sql.js/<ver>/sql-wasm.{js,wasm}` | Dữ liệu MySQL cần convert sang SQLite trước (xem `data-conversion.md`). Chú ý bug kết quả 0 dòng — xem `grading-patterns.md`. |
| Python | **Pyodide** | ~6-10MB (core), có thể chỉ tải packages cần dùng | `cdn.jsdelivr.net/pyodide/v<ver>/full/pyodide.js` | Nặng — cân nhắc lazy-load chỉ khi user vào bài Python, không tải ngay từ đầu trang landing. |
| JavaScript/TypeScript | Chạy thẳng bằng `new Function()` trong Web Worker (sandbox, tránh treo tab chính) | 0KB (built-in) | Không cần tải gì | TypeScript cần thêm `typescript.js` (bundle chuẩn từ npm, ~4MB) để transpile trước khi chạy nếu muốn chấm cả cú pháp TS. |
| Quy đổi công thức / số học / thống kê | Không cần engine ngoài — JS thuần đủ (`Math`, hoặc `mathjs` nếu cần biểu thức phức tạp) | mathjs ~500KB min | `cdnjs.cloudflare.com/ajax/libs/mathjs/<ver>/math.min.js` | |
| Regex | Chạy thẳng `RegExp` của JS | 0KB | — | Cẩn thận: cú pháp regex JS khác Python/PCRE ở vài điểm — nói rõ trong đề bài đang test theo chuẩn JS. |
| C/C++ (nâng cao) | **Emscripten-compiled** binary riêng cho từng bài, hoặc dùng dịch vụ ngoài (không tĩnh được nữa) | tuỳ bài | Biên dịch trước bằng `emcc` trên máy dev, chỉ ship `.wasm` đã build | Không đơn giản như 3 mục trên — cân nhắc kỹ có thật cần "chạy C thật" hay chấp nhận test kiểu C-like pseudocode chấm bằng so khớp output văn bản. |

## Cách tải và xác minh (áp dụng mọi engine)

```bash
mkdir -p vendor/<engine>
curl -sL "<url .js>" -o vendor/<engine>/engine.js
curl -sL "<url .wasm>" -o vendor/<engine>/engine.wasm
file vendor/<engine>/engine.wasm   # PHẢI ra "WebAssembly (wasm) binary module", không phải ASCII text (= tải nhầm trang lỗi)
```

## Engine cho việc soạn thảo code (editor)

Dùng **CodeMirror 5** (không phải 6 — bundle sẵn từng file riêng lẻ qua CDN, không cần bundler, nhẹ hơn setup CodeMirror 6):

```bash
BASE="https://cdnjs.cloudflare.com/ajax/libs/codemirror/<ver>"
curl -sL "$BASE/codemirror.min.js" -o vendor/codemirror/codemirror.min.js
curl -sL "$BASE/codemirror.min.css" -o vendor/codemirror/codemirror.min.css
curl -sL "$BASE/mode/sql/sql.min.js" -o vendor/codemirror/sql.min.js   # đổi mode theo chủ đề: python, javascript, clike...
curl -sL "$BASE/theme/eclipse.min.css" -o vendor/codemirror/eclipse.min.css
```

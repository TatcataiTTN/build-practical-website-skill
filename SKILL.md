---
name: build-practical-website
description: Xây dựng một website luyện tập thực hành có chấm điểm tự động (SQL, lập trình, quy đổi công thức, v.v.), chạy hoàn toàn phía trình duyệt (không backend), host trên dịch vụ tĩnh nhẹ như GitHub Pages. Dùng khi user muốn "làm trang web luyện tập", "web bài tập có chấm điểm", "làm giao diện học tập cho ai đó luyện code/SQL", "host web tĩnh trên GitHub Pages", hoặc yêu cầu tương tự việc đã làm cho dự án "for-Vinh" (luyện SQL với sql.js). KHÔNG dùng cho website tĩnh thuần nội dung (landing page, blog) không cần chấm điểm — dùng skill artifact-design cho việc đó.
---

# Build Practical Website — trang luyện tập có chấm điểm, chạy 100% trong trình duyệt

Nguyên tắc trung tâm: **không có backend, không có server chấm bài** — mọi thứ (dữ liệu, engine chạy code, logic chấm điểm) đều chạy trong trình duyệt người học bằng WebAssembly/JS thuần, host tĩnh (GitHub Pages) là đủ. Đáp án đúng **không bao giờ được gõ tay** — luôn tính bằng cách chạy lời giải mẫu qua đúng engine đang dùng và lưu lại, để loại trừ khả năng đáp án sai do người viết gõ nhầm.

Tài liệu tham chiếu chi tiết nằm trong `references/` — đọc đúng file cần khi tới bước đó, không cần đọc hết ngay từ đầu.

## Khi nào dùng skill này

Dùng khi yêu cầu có đủ 3 đặc điểm: (1) người học viết code/truy vấn, (2) hệ thống tự chấm đúng/sai, (3) muốn host nhẹ, miễn phí, không cần quản lý server. Nếu chỉ cần một trang trình bày nội dung tĩnh không chấm điểm, việc này quá mức cần thiết — dùng `artifact-design` hoặc viết HTML tĩnh thường.

## Giai đoạn 0 — Làm rõ phạm vi (hỏi user, đừng đoán)

Dùng `AskUserQuestion` cho các quyết định chỉ user mới trả lời được:

1. **Chủ đề/ngôn ngữ luyện tập** — quyết định engine chạy trong trình duyệt (xem `references/engines.md`).
2. **Nơi host** — GitHub Pages (mặc định, miễn phí, tĩnh) hay nơi khác? Nếu GitHub Pages: repo đã tồn tại chưa, có quyền push không (xem Giai đoạn 6).
3. **Phong cách giao diện** — cho ai dùng (trẻ em, sinh viên, người mới) quyết định tông màu/độ nghiêm túc. Đừng tự chọn nếu đối tượng dùng là người cụ thể (con, em, học sinh của user) — hỏi 2-3 lựa chọn có mô tả ngắn.
4. **Số lượng/độ đa dạng bài tập** — một chủ đề hay nhiều chủ đề/CSDL khác nhau? Ảnh hưởng trực tiếp khối lượng công việc ở Giai đoạn 2-3.

Việc chọn engine, kiến trúc chấm điểm, cách deploy là quyết định kỹ thuật của mình — không hỏi lại, cứ chọn theo `references/engines.md` và giải thích ngắn gọn trong câu trả lời.

## Giai đoạn 1 — Chọn engine chạy trong trình duyệt

Tra `references/engines.md` để chọn đúng công cụ WASM/JS cho chủ đề (SQL → sql.js, Python → Pyodide, JS/TS → chạy thẳng bằng `new Function`/Web Worker, v.v.). Tải bản build sẵn (CDN) về `vendor/` để host offline — không phụ thuộc CDN lúc runtime (tránh lỗi khi CDN sập hoặc bị chặn):

```bash
curl -sL "<CDN_URL>/engine.js" -o vendor/<engine>/engine.js
curl -sL "<CDN_URL>/engine.wasm" -o vendor/<engine>/engine.wasm
```

Kiểm tra ngay bằng `file vendor/.../*.wasm` để chắc là tải được file nhị phân thật, không phải trang lỗi HTML.

## Giai đoạn 2 — Chuẩn bị dữ liệu/bài toán mẫu

Ưu tiên **dữ liệu thật** hơn dữ liệu tự bịa khi có sẵn (ví dụ: CSDL mẫu chuẩn của môn học). Nếu cần dữ liệu tổng hợp, viết script sinh dữ liệu có `random.seed()` cố định để tái lập được, và sinh đủ lớn để có tính đại diện (tránh trường hợp rìa như "không ai thoả điều kiện lọc" làm câu hỏi vô nghĩa — xem bài học ở `references/pitfalls.md#dữ-liệu-ngẫu-nhiên-cho-ra-đáp-án-rỗng`).

Nếu dữ liệu gốc ở định dạng khác client-side engine cần (vd: MySQL dump nhưng cần SQLite cho sql.js), viết script chuyển đổi bằng cách **kết nối vào engine gốc thật** rồi export, không tự suy diễn schema bằng tay — xem `references/data-conversion.md` cho quy trình dựng MySQL tạm cục bộ, export, rồi tắt.

## Giai đoạn 3 — Ngân hàng câu hỏi + tính đáp án tự động

Kiến trúc bắt buộc, tách làm 2 lớp:

1. `build/questions_source.py` (hoặc `.js`) — danh sách câu hỏi do người viết soạn tay: đề bài, gợi ý, và **`referenceSql`/`referenceCode`** (lời giải mẫu). KHÔNG chứa đáp án.
2. `build/compute_expected.py` — script chạy `referenceSql` thật trên dữ liệu thật (dùng engine chuẩn phía server, vd Python `sqlite3`), lưu kết quả (cột + dòng) vào `data/questions.json`. Nếu script này lỗi ở bất kỳ câu nào, dừng ngay (`sys.exit(1)`) — không được để sót câu hỏng.

Với bài tập kiểu DML (thay đổi trạng thái: INSERT/UPDATE/DELETE), thêm field `verifySql`: câu lệnh chạy **sau khi** áp `referenceSql` lên bản sao dữ liệu, dùng để so sánh trạng thái cuối cùng — không so khớp chuỗi lệnh học sinh gõ (chấp nhận mọi câu lệnh đúng ngữ nghĩa, kể cả cách viết khác lời giải mẫu).

Đa dạng hoá độ khó (`difficulty: 1-3`) và dạng bài (lọc cơ bản, join, gộp nhóm, subquery, thao tác dữ liệu...) — xem cấu trúc mẫu 39 câu × 3 CSDL trong `references/question-bank-example.md`.

## Giai đoạn 4 — Frontend: single-page app chấm điểm

Kiến trúc tối thiểu, không cần framework nặng (React/Vue) — vanilla JS đủ dùng và tải nhanh hơn:

- `index.html` — shell tĩnh, script tag load engine + editor (CodeMirror hoặc tương đương) + `app.js`.
- `js/app.js` — routing bằng `location.hash`, render sidebar (danh sách bài + tiến độ), render trang câu hỏi, hàm `runQuery`/`runCode` (chạy thử không chấm) và `gradeAndShow` (chạm điểm thật).
- Tiến độ làm bài lưu `localStorage`, **không** lưu server — nói rõ điều này trong UI (xem `references/grading-patterns.md#lưu-tiến-độ`).

**Logic chấm điểm** — đọc kỹ `references/grading-patterns.md` trước khi viết, đặc biệt mục xử lý kết quả rỗng (nhiều engine trả `null`/`[]` khi câu SELECT hợp lệ nhưng 0 dòng — nếu không xử lý riêng, chấm sai oan các câu có đáp án đúng là "không có gì").

## Giai đoạn 5 — Trải nghiệm tải trang (đừng để treo màn hình loading)

Nếu tổng dữ liệu > vài trăm KB, **bắt buộc**:
1. Hiện tiến độ tải theo từng nguồn (tên + số MB đã tải/tổng), không phải icon xoay vô nghĩa.
2. Bọc toàn bộ boot trong `try/catch` + timeout (30-45s) → nếu lỗi/quá giờ, hiện thông báo rõ + nút "Thử lại". **Không bao giờ để màn hình loading treo vô thời hạn khi một fetch lỗi** — đây là lỗi thực tế đã xảy ra, xem `references/pitfalls.md#màn-hình-loading-treo-mãi`.
3. Lưu các file đã tải vào Cache Storage API (`caches.open`) để lần mở sau gần như tức thời, không phụ thuộc `Cache-Control` ngắn hạn của GitHub Pages (mặc định chỉ ~600s).

Chi tiết code mẫu ở `references/loading-ux.md`.

## Giai đoạn 6 — Kiểm thử nhiều lớp trước khi giao

Không tin vào "code chạy được" cho tới khi kiểm thử qua đủ 3 lớp — thứ tự từ rẻ/nhanh đến tốn/chậm, dừng sớm nếu lớp trước đã lộ lỗi:

1. **Lớp 1 — Test đối chiếu bằng chính engine sẽ chạy trong trình duyệt, nhưng ở Node.js** (không cần mở trình duyệt): dùng bản `npm install <engine>` (vd `sql.js`) chạy lại toàn bộ `referenceSql` của từng câu, so với `expected` đã lưu trong `questions.json`, bằng ĐÚNG hàm so sánh sẽ dùng trong `app.js`. Lớp này cực rẻ, bắt được gần hết lỗi logic/dữ liệu.
2. **Lớp 2 — Test tương tác thật trong trình duyệt đã cài sẵn** bằng `puppeteer-core` trỏ `executablePath` vào Chrome có sẵn trên máy (không cần puppeteer tải Chromium riêng, không cần Claude-in-Chrome extension nếu nó không khả dụng). Test: mở trang, gõ SQL/code vào editor, bấm nút thật, đọc kết quả DOM. Click bằng toạ độ chuột thật của puppeteer có thể "flaky" với editor kiểu CodeMirror do đổi layout — ưu tiên gọi `element.click()` qua `page.evaluate` cho các bước phụ, giữ `page.click()` thật cho bước cần xác nhận UX thật.
3. **Lớp 3 — Test lại trên URL production sau khi deploy**, không chỉ localhost — môi trường hosting thật (đường dẫn tương đối, CORS, cache headers) có thể khác máy local.

Chi tiết script mẫu 3 lớp này ở `references/testing-checklist.md` — copy và chỉnh theo chủ đề cụ thể.

## Giai đoạn 7 — Deploy lên GitHub Pages

Quy trình đầy đủ (tạo repo, push, bật Pages, verify build, verify HTTP thật) nằm ở `references/deploy-github-pages.md`. Điểm mấu chốt cần nhớ:

- Nếu không có `gh` CLI / chưa đăng nhập: cài bằng `brew install gh`, rồi **yêu cầu user tự chạy** `! gh auth login` (prefix `!` để chạy trong session của họ) — không bao giờ tự ý dùng thông tin đăng nhập của user hay đoán mật khẩu.
- Dùng đường dẫn **tương đối** (không có `/` ở đầu) cho mọi asset trong HTML/JS, vì site thường nằm ở subpath (`username.github.io/reponame/...`), không phải root domain.
- Bật Pages với `build_type=legacy` (deploy from branch) nếu không có workflow Actions — đơn giản hơn `build_type=workflow`.
- Sau khi push, **chủ động poll** trạng thái build (`gh api repos/OWNER/REPO/pages/builds/latest -q .status`) tới khi `built`, rồi `curl` từng asset lớn để chắc trả về 200 thật — đừng chỉ giả định deploy thành công vì lệnh `push` không báo lỗi.

## Giai đoạn 8 — Bàn giao

Báo cáo cho user: link production đã kiểm thử thật (không phải localhost), tổng dung lượng tải lần đầu, xác nhận rõ cơ chế lưu tiến độ (localStorage) có giới hạn gì (mất nếu xoá dữ liệu trình duyệt/dùng ẩn danh), và cách họ tự thêm câu hỏi mới sau này (chạy lại `build/compute_expected.py`, không tự gõ đáp án).

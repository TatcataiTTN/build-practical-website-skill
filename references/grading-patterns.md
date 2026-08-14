# Logic chấm điểm — mẫu code và các bẫy đã gặp thực tế

## Kiến trúc chung

```
data/questions.json:  [{ id, type: "select"|"dml", prompt, hint, solutionSql,
                         verifySql?,           // chỉ cho type "dml"
                         expected: { columns: [...], rows: [[...],...] } }]
```

`expected` được TÍNH SẴN ở bước build (chạy `solutionSql` thật), không tính lúc runtime trong trình duyệt — trình duyệt chỉ so sánh.

## Hàm so sánh kết quả (chuẩn hoá trước khi so)

```js
function normalizeVal(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Math.round(v * 10000) / 10000; // bỏ sai số float
  if (typeof v === "string") {
    const n = Number(v);
    if (v.trim() !== "" && !isNaN(n) && /^-?\d+(\.\d+)?$/.test(v.trim()))
      return Math.round(n * 10000) / 10000;  // engine có thể trả số dạng string
    return v.trim();
  }
  return v;
}
function rowsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++)
      if (normalizeVal(a[i][j]) !== normalizeVal(b[i][j])) return false;
  }
  return true;
}
```

Mặc định so sánh **có thứ tự** (không sort trước khi so) vì phần lớn đề bài yêu cầu `ORDER BY` tường minh — nếu học sinh quên sắp xếp, phải báo sai. Chỉ chuyển sang so không thứ tự (sort cả hai phía trước khi so) khi đề bài chủ động không yêu cầu thứ tự cụ thể.

## BẪY THẬT: kết quả 0 dòng

Nhiều engine WASM (đã xác nhận với sql.js) khi chạy một câu SELECT hợp lệ nhưng trả về 0 dòng thì **không trả object kết quả nào cả** (không có cả tên cột), khác với "trả object có `rows: []`". Nếu code chấm điểm giả định luôn có object kết quả rồi so `columns.length`, mọi câu có đáp án đúng là "không có dòng nào" sẽ tự động bị chấm SAI dù học sinh làm đúng.

Cách xử lý bắt buộc:

```js
const ok = expected.rows.length === 0
  ? gotRows.length === 0                     // đáp án đúng vốn rỗng -> chỉ cần học sinh cũng ra rỗng
  : (table && gotCols.length === expected.columns.length && rowsEqual(gotRows, expected.rows));
```

**Trước khi ship**, quét toàn bộ `questions.json` tìm câu nào có `expected.rows.length === 0` — nếu có, cân nhắc đổi đề bài để có kết quả không rỗng (câu hỏi có ý nghĩa hơn về mặt sư phạm), trừ khi mục đích cố ý là dạy "làm sao biết một tập hợp là rỗng".

## Chấm bài kiểu DML (INSERT/UPDATE/DELETE)

Không so khớp chuỗi lệnh học sinh gõ với lời giải mẫu (chấp nhận mọi cách viết đúng). Thay vào đó:

1. Tạo bản CSDL sạch mới (từ bytes gốc đã cache, không phải bản đã bị sửa bởi lần chấm trước).
2. Chạy câu lệnh học sinh viết lên bản sạch đó.
3. Chạy `verifySql` (một câu SELECT cố định, soạn sẵn) để đọc lại trạng thái.
4. So kết quả `verifySql` với `expected` (đã tính sẵn bằng cách chạy `solutionSql` rồi `verifySql` lúc build).

```js
function freshDb(dbName) { return new SQL.Database(cachedBytes[dbName]); } // luôn từ bytes gốc, không tái dùng instance cũ
```

## Lưu tiến độ

Tiến độ (câu nào đã làm đúng) lưu `localStorage`, KHÔNG lưu dữ liệu người dùng nhạy cảm gì khác. Ghi rõ trong UI: còn nguyên khi đóng tab/tắt máy, mất nếu người dùng xoá dữ liệu trình duyệt hoặc dùng cửa sổ ẩn danh. Đây là câu hỏi user thường hỏi lại — trả lời chủ động trong bàn giao, đừng đợi hỏi.

```js
function markDone(id, ok) {
  const p = JSON.parse(localStorage.getItem(KEY) || "{}");
  p[id] = ok ? "done" : (p[id] === "done" ? "done" : "tried"); // không hạ cấp câu đã đúng khi thử lại sai
  localStorage.setItem(KEY, JSON.stringify(p));
}
```

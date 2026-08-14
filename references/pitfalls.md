# Lỗi thật đã gặp và cách phát hiện/sửa

Tổng hợp từ lần triển khai thực tế (trang luyện SQL "for-Vinh") — đọc trước khi bắt tay code để tránh lặp lại.

## Màn hình loading treo mãi

**Triệu chứng:** user báo "load mãi không xong", và bằng chứng gián tiếp là họ thử "Lưu trang thành PDF" trong lúc đang treo, file PDF chỉ chụp được đúng màn hình spinner.

**Nguyên nhân:** `boot()` là async function không có `try/catch`, gọi `await Promise.all([...fetch nhiều file...])` — một fetch lỗi (mạng, ad-blocker chặn `.wasm`, tường lửa trường học) làm cả `Promise.all` reject, không ai bắt lỗi, overlay loading không bao giờ được gỡ.

**Sửa:** bọc toàn bộ boot trong try/catch, thêm timeout tổng, hiện lỗi cụ thể + nút thử lại. Chi tiết ở `loading-ux.md`. Test bắt buộc: giả lập 404 một resource bằng `page.setRequestInterception`, xác nhận có thông báo lỗi trong vài giây.

## Kết quả 0 dòng bị chấm sai thành "Sai"

**Triệu chứng:** chạy script Lớp 1 (đối chiếu bằng Node) ra fail ở đúng những câu mà đáp án thật sự là "không có dòng nào" — vd "khách hàng chưa từng đặt hàng" nhưng dữ liệu ngẫu nhiên vô tình khiến mọi khách đều đã đặt hàng ít nhất 1 lần.

**Nguyên nhân:** engine (sql.js xác nhận có hành vi này) trả `[]`/`null` — không có cả object kết quả — khi SELECT hợp lệ nhưng 0 dòng, khác hẳn "có object kết quả với `rows: []`". Code chấm điểm giả định luôn có object kết quả rồi truy cập `.columns.length` sẽ coi đây là lỗi/không khớp.

**Sửa:** xử lý riêng case `expected.rows.length === 0` (xem `grading-patterns.md`). Đồng thời cân nhắc **sửa lại đề bài/dữ liệu** để câu hỏi có kết quả không rỗng nếu việc rỗng chỉ là trùng hợp ngẫu nhiên chứ không phải chủ đích sư phạm — kiểm tra bằng cách chạy thử điều kiện lọc trên dữ liệu thật trước khi chốt đề, đừng đoán.

## Tab tách bằng ký tự phân cách vỡ dữ liệu

**Triệu chứng:** export dữ liệu từ MySQL bằng `mysql -e "..." -N -B` rồi tự `.split("\t")` trong Python — lỗi `Incorrect number of bindings supplied` khi insert vào SQLite, số cột không khớp.

**Nguyên nhân:** một cột text trong dữ liệu gốc chứa ký tự tab hoặc xuống dòng thật, làm vỡ giả định "mỗi dòng output cách nhau bằng đúng N tab".

**Sửa:** dùng driver kết nối trực tiếp (`pymysql`) đọc ra kiểu dữ liệu gốc, không parse qua text. Xem `data-conversion.md`.

## Kiểu dữ liệu không tương thích khi insert sang SQLite

**Triệu chứng:** `sqlite3.ProgrammingError: type 'decimal.Decimal' is not supported`.

**Nguyên nhân:** driver MySQL Python trả `DECIMAL` thành `decimal.Decimal`, `DATE`/`DATETIME` thành object `datetime.date`/`datetime.datetime` — SQLite driver Python không tự convert các kiểu này.

**Sửa:** hàm `clean()` convert `Decimal → float`, `date/datetime → isoformat() string` trước khi insert (xem `data-conversion.md`).

## Socket MySQL tạm lỗi vì path quá dài

**Triệu chứng:** `[ERROR] The socket file path is too long (> 103)`.

**Nguyên nhân:** đặt socket file trong thư mục scratchpad lồng nhiều cấp (path dài hơn giới hạn `sockaddr_un` của hệ điều hành, thường ~104 ký tự trên macOS/Linux).

**Sửa:** luôn đặt socket ở `/tmp/<tên_ngắn>.sock`, không đặt trong scratchpad sâu.

## `puppeteer.click()` không kích hoạt được nút cạnh CodeMirror

**Triệu chứng:** `page.click("#btn-submit")` không lỗi nhưng không có gì xảy ra (không có verdict xuất hiện), trong khi gọi trực tiếp hàm xử lý qua `page.evaluate` thì chạy đúng.

**Nguyên nhân nghi ngờ:** CodeMirror đổi chiều cao layout ngay sau khi `setValue()` (do reflow không đồng bộ), làm toạ độ click Puppeteer tính trước đó lệch khỏi vị trí nút thật tại thời điểm click thực sự diễn ra.

**Sửa thực dụng:** với các bước không cần xác nhận UX chuột thật, dùng `page.evaluate(() => document.getElementById("btn-submit").click())` thay vì `page.click()`. Giữ `page.click()` thật cho những bước cụ thể cần kiểm tra trải nghiệm click thật (vd nút không nằm gần editor).

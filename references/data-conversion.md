# Chuyển dữ liệu gốc (vd MySQL) sang engine client-side (vd SQLite/sql.js)

Không tự suy diễn schema/kiểu dữ liệu bằng tay — luôn kết nối vào engine gốc thật, đọc schema và dữ liệu thật, rồi export. Quy trình đã dùng thực tế cho CSDL mẫu MySQL → SQLite:

## 1. Dựng MySQL tạm cục bộ (không cần cài đặt hệ thống, dùng bản trong môi trường có sẵn nếu có, vd conda)

```bash
DATADIR=/tmp/mysql_data_tmp
mysqld --initialize-insecure --datadir="$DATADIR" --basedir=<BASEDIR> \
  --lc-messages-dir=<BASEDIR>/share/mysql/english

# QUAN TRỌNG: socket path phải NGẮN (<103 ký tự) — mysqld lỗi thẳng nếu path dài
# (vd thư mục scratchpad lồng sâu nhiều cấp) → dùng /tmp/xxx.sock, không dùng path scratchpad dài
SOCK=/tmp/mydb.sock
mysqld --datadir="$DATADIR" --basedir=<BASEDIR> \
  --lc-messages-dir=<BASEDIR>/share/mysql/english \
  --socket="$SOCK" --port=33061 --bind-address=127.0.0.1 \
  --pid-file=/tmp/mysqld.pid &
sleep 5
mysql --socket="$SOCK" -u root -e "CREATE DATABASE IF NOT EXISTS mydb;"
mysql --socket="$SOCK" -u root mydb < original_dump.sql
```

## 2. Export bằng Python + pymysql (KHÔNG dùng `mysql -e ... -N -B` rồi tách bằng tab)

Tách theo tab sẽ vỡ nếu bất kỳ cột text nào chứa tab/xuống dòng thật trong dữ liệu (đã gặp lỗi này thực tế). Dùng driver Python đọc thẳng ra kiểu dữ liệu gốc:

```python
import sqlite3, pymysql, decimal, datetime

def clean(v):
    if isinstance(v, decimal.Decimal): return float(v)
    if isinstance(v, (datetime.date, datetime.datetime)): return v.isoformat()
    return v

my = pymysql.connect(unix_socket="/tmp/mydb.sock", user="root", database="mydb")
conn = sqlite3.connect("out.sqlite")
cur = conn.cursor()
cur.executescript(SCHEMA_SQL)   # viết tay CREATE TABLE tương ứng, kiểu SQLite (TEXT/INTEGER/REAL)

with my.cursor() as mc:
    for table, cols in TABLES.items():
        mc.execute(f"SELECT {','.join(cols)} FROM {table}")
        rows = [tuple(clean(v) for v in row) for row in mc.fetchall()]
        cur.executemany(f"INSERT INTO {table} VALUES ({','.join(['?']*len(cols))})", rows)
conn.commit()
```

Nếu chưa có `pymysql`: `pip install pymysql` (pure-Python, không cần biên dịch, cài nhanh).

## 3. Tắt MySQL tạm ngay sau khi export xong

```bash
mysqladmin --socket="$SOCK" -u root shutdown
rm -f "$SOCK" /tmp/mysqld.pid
```

Đừng để tiến trình MySQL tạm chạy nền quá thời gian cần thiết.

## Sinh dữ liệu tổng hợp (khi không có dữ liệu thật để dùng)

Viết script Python với `random.seed(<số cố định>)` để tái lập được. Sau khi sinh xong, **luôn kiểm tra lại các trường hợp rìa** trước khi viết câu hỏi dựa vào chúng — ví dụ đếm xem "có bản ghi nào thoả điều kiện X không" trước khi ra đề dựa trên điều kiện X, tránh rơi vào trường hợp đáp án đúng ngẫu nhiên là tập rỗng khi đề không có ý định đó (xem `pitfalls.md`).

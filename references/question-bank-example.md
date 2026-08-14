# Cấu trúc ngân hàng câu hỏi mẫu (đã dùng thực tế: 39 câu × 3 CSDL SQL)

## Bố cục thư mục tham khảo

```
project/
├── index.html
├── css/style.css
├── js/app.js               # logic chính: routing, chạy engine, chấm điểm
├── js/schemas.js            # mô tả cấu trúc bảng/API để hiển thị gợi ý
├── data/
│   ├── db1.sqlite            # dữ liệu nguồn 1 (có thể nhiều "chủ đề" song song)
│   ├── db2.sqlite
│   ├── db3.sqlite
│   └── questions.json        # SINH RA bởi build script, không sửa tay
├── build/
│   ├── questions_source.py   # người viết soạn tay ở đây
│   └── compute_expected.py   # chạy referenceSql thật, ghi ra questions.json
└── vendor/                   # engine + editor tải sẵn, offline
```

## Một entry trong `questions_source.py`

```python
{
    "db": "db1", "id": "d1_01", "difficulty": 1, "type": "select",
    "topic": "WHERE cơ bản",
    "title": "Tiêu đề ngắn hiển thị trong sidebar",
    "prompt": "Mô tả đề bài đầy đủ, nêu rõ tên cột cần trả về và điều kiện lọc.",
    "hint": "Gợi ý ngắn, không lộ toàn bộ lời giải.",
    "referenceSql": "SELECT ... FROM ... WHERE ... ORDER BY ...;",
},
{
    "db": "db1", "id": "d1_12", "difficulty": 2, "type": "dml",
    "topic": "DML - INSERT",
    "title": "...",
    "prompt": "...",
    "hint": "...",
    "referenceSql": "INSERT INTO ... VALUES (...);",
    "verifySql": "SELECT ... WHERE ...;",   # chỉ cần cho type=dml
},
```

## Phân bổ độ khó/dạng bài đề xuất (cho một chủ đề ~13 câu)

| Difficulty | Dạng bài | Số câu gợi ý |
|---|---|---|
| 1 | Lọc cơ bản (WHERE, LIKE, IN/BETWEEN), ORDER BY + LIMIT | 3 |
| 2 | JOIN (inner/left), SELF JOIN, GROUP BY + COUNT/SUM | 5 |
| 3 | GROUP BY + HAVING, Subquery (so sánh trung bình, NOT EXISTS/NOT IN), tính toán nhiều cột | 3 |
| 2 | DML (INSERT/UPDATE) chấm bằng verifySql | 2 |

Nhân với số "chủ đề"/CSDL song song (mỗi chủ đề dùng dữ liệu khác nhau nhưng cùng loại thao tác) để tăng số lượng câu mà không lặp lại một cấu trúc dữ liệu duy nhất — giúp người học luyện tư duy tổng quát thay vì học thuộc một schema.

## `compute_expected.py` — khung sườn

```python
import sqlite3, json, sys, shutil, os
sys.path.insert(0, "build")
from questions_source import QUESTIONS

out = []
for q in QUESTIONS:
    dbpath = f"data/{q['db']}.sqlite"
    try:
        if q["type"] == "select":
            conn = sqlite3.connect(dbpath)
            cur = conn.execute(q["referenceSql"])
            expected = {"columns": [d[0] for d in cur.description],
                        "rows": [list(r) for r in cur.fetchall()]}
            conn.close()
        else:  # dml
            tmp = f"/tmp/{q['id']}.sqlite"; shutil.copyfile(dbpath, tmp)
            conn = sqlite3.connect(tmp)
            conn.executescript(q["referenceSql"]); conn.commit()
            cur = conn.execute(q["verifySql"])
            expected = {"columns": [d[0] for d in cur.description],
                        "rows": [list(r) for r in cur.fetchall()]}
            conn.close(); os.remove(tmp)
    except Exception as e:
        print("LỖI ở câu", q["id"], ":", e); sys.exit(1)   # DỪNG NGAY, không bỏ qua

    out.append({**{k: q[k] for k in ("id","db","difficulty","type","topic","title","prompt","hint")},
                "solutionSql": q["referenceSql"],
                **({"verifySql": q["verifySql"]} if q["type"]=="dml" else {}),
                "expected": expected})

json.dump(out, open("data/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"{len(out)} câu hỏi đã tính đáp án xong.")
```

Chạy script này mỗi khi thêm/sửa câu hỏi — không bao giờ sửa tay `questions.json`.

# build-practical-website — Claude Code Skill

Skill cho Claude Code: quy trình xây dựng website luyện tập có chấm điểm tự động
(SQL, lập trình, v.v.), chạy hoàn toàn phía trình duyệt (WebAssembly, không backend),
host trên GitHub Pages hoặc dịch vụ tĩnh tương tự.

Đúc kết từ dự án thực tế: trang luyện SQL "for-Vinh"
(https://tatcataittn.github.io/for-Vinh/Exercises/) — 39 câu hỏi, 3 CSDL SQLite,
chấm điểm bằng sql.js ngay trong trình duyệt.

## Cài đặt

Copy thư mục này vào `~/.claude/skills/build-practical-website/` (hoặc thư mục
`.claude/skills/` của một project cụ thể) để Claude Code tự nhận diện và dùng khi
phù hợp.

## Cấu trúc

- `SKILL.md` — quy trình chính, 8 giai đoạn từ làm rõ phạm vi tới bàn giao.
- `references/` — tài liệu chi tiết cho từng giai đoạn (chọn engine, convert dữ liệu,
  logic chấm điểm, UX tải trang, kiểm thử 3 lớp, deploy GitHub Pages, lỗi thường gặp).

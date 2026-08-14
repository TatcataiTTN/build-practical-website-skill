# Deploy lên GitHub Pages — quy trình đầy đủ đã dùng thực tế

## 0. Kiểm tra khả năng push TRƯỚC khi hứa làm được

```bash
gh auth status                                  # có gh chưa, đã login chưa
git config --global user.name                   # có khớp tài khoản GitHub không (gợi ý identity)
ssh -o BatchMode=yes -o ConnectTimeout=5 -T git@github.com   # SSH key có đăng ký với GitHub không
curl -s -o /dev/null -w "%{http_code}\n" https://api.github.com/repos/<owner>/<repo>  # repo có tồn tại/public không
```

Nếu không có `gh`/chưa login/không có SSH key hợp lệ: **không tự ý thử các cách vòng qua** (không rút mật khẩu từ Keychain, không đoán). Cài `gh` bằng `brew install gh` rồi báo user tự chạy `! gh auth login` (prefix `!` chạy trong session của họ, họ xác thực qua trình duyệt, mình không thấy thông tin đăng nhập). Sau khi họ xác nhận xong, kiểm tra lại `gh auth status`.

## 1. Tạo repo (nếu chưa có) và push

```bash
gh repo create <owner>/<repo> --public --description "..." -y
git clone https://github.com/<owner>/<repo>.git /tmp/deploy_tmp
cp -R <thư_mục_site>/* /tmp/deploy_tmp/<repo>/<subpath nếu muốn site nằm ở subpath>/
cd /tmp/deploy_tmp/<repo>
git add -A
git -c user.name="<tên>" -c user.email="<email>" commit -m "..."
git branch -M main
git push -u origin main
```

Nếu muốn site nằm dưới một subpath (vd `owner.github.io/repo/Exercises/`) thay vì root repo, đặt toàn bộ nội dung vào thư mục con đó và thêm một `index.html` chuyển hướng ở root repo (`<meta http-equiv="refresh" content="0; url=Exercises/">`) để cả hai đường dẫn đều vào được.

## 2. Bật GitHub Pages qua API (nhanh hơn vào UI click)

```bash
gh api -X POST repos/<owner>/<repo>/pages -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/"
```

Nếu đã tồn tại cấu hình Pages (lỗi 409 "already enabled"), dùng PUT để cập nhật thay vì POST:

```bash
gh api -X PUT repos/<owner>/<repo>/pages -f "build_type=legacy" -f "source[branch]=main" -f "source[path]=/"
```

**Luôn dùng `build_type=legacy`** trừ khi đã chủ động thêm workflow Actions để build — `build_type=workflow` (giá trị mặc định khi tạo qua UI đôi khi) sẽ không tự deploy gì nếu không có file `.github/workflows/*.yml` tương ứng, khiến Pages "bật" nhưng không bao giờ có build nào chạy.

## 3. Trigger build nếu chưa có build nào (đôi khi bật Pages sau khi đã push thì cần một push mới để kích hoạt)

```bash
git commit --allow-empty -m "Trigger Pages build"
git push
```

## 4. Poll trạng thái build tới khi xong — đừng đoán là xong ngay sau push

```bash
for i in $(seq 1 12); do
  sleep 10
  st=$(gh api repos/<owner>/<repo>/pages/builds/latest -q .status 2>&1)
  echo "Lần $i: $st"
  [ "$st" = "built" ] && break
done
```

## 5. Xác nhận bằng HTTP thật, không chỉ tin lệnh không báo lỗi

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://<owner>.github.io/<repo>/<subpath>/index.html"
curl -s -o /dev/null -w "%{http_code}\n" "https://<owner>.github.io/<repo>/<subpath>/vendor/<engine>/engine.wasm"
```

Cả trang chính lẫn asset nhị phân lớn đều phải trả 200. Sau đó chạy lại Lớp 2/3 của `testing-checklist.md` nhắm vào URL production này.

## Ghi chú quan trọng khác

- Đường dẫn trong HTML/JS phải **tương đối** (`vendor/...`, không phải `/vendor/...`) vì site GitHub Pages dạng project (không phải `<user>.github.io` gốc) luôn nằm ở subpath `/repo-name/...`.
- `Cache-Control` mặc định của GitHub Pages khá ngắn (~600s) — không đủ để "chỉ tải một lần mãi mãi". Muốn trải nghiệm nhanh ở các lần ghé sau, tự cache bytes vào Cache Storage API phía client (xem `loading-ux.md`), đừng phụ thuộc header server.
- Cập nhật lần sau: sửa code cục bộ → test đủ 3 lớp → clone lại repo (hoặc dùng working copy cũ nếu còn) → copy đè → commit → push → poll build → verify HTTP — lặp lại đúng quy trình trên, không bỏ bước verify vì "lần trước đã chạy được".

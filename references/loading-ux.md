# UX tải trang lần đầu — đừng để giống "treo máy"

## Vấn đề thật đã gặp

Trang có ~1.5MB tài nguyên (engine wasm + vài CSDL + editor). Bản đầu chỉ hiện icon ⏳ tĩnh + `Promise.all(...)` không có `.catch`. Khi một fetch lỗi (mạng chập chờn, tường lửa trường học, ad-blocker chặn `.wasm`), promise bị reject không ai bắt — overlay loading đứng yên **vĩnh viễn**, không có thông báo lỗi. Người dùng tưởng trang bị treo, thử "Lưu thành PDF" và chỉ chụp lại đúng cái màn hình treo đó.

## Yêu cầu bắt buộc cho mọi trang loại này

1. Không bao giờ `await Promise.all(...)` cho toàn bộ boot mà không có `try/catch` bọc ngoài.
2. Có timeout tổng (30-45s) — hết giờ mà chưa xong thì coi như lỗi, hiện thông báo + nút thử lại.
3. Hiện tiến độ theo từng nguồn (tên + số MB đã tải/tổng), không phải một icon xoay chung chung.
4. Cache lại bytes đã tải bằng Cache Storage API để lần mở sau nhanh gần như tức thời.

## Code mẫu (fetch có tiến độ + cache, dùng `wasmBinary` thay vì để engine tự fetch)

```js
async function fetchWithProgress(url, onProgress) {
  const cache = await caches.open("app-assets-v1").catch(() => null);
  if (cache) {
    const cached = await cache.match(url);
    if (cached) {
      const buf = await cached.arrayBuffer();
      onProgress(buf.byteLength, buf.byteLength, true); // true = từ cache
      return new Uint8Array(buf);
    }
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được "${url}" (HTTP ${res.status}).`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks = []; let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    onProgress(loaded, total, false);
  }
  const blob = new Blob(chunks);
  if (cache) cache.put(url, new Response(blob)).catch(() => {});
  return new Uint8Array(await blob.arrayBuffer());
}
```

Với engine kiểu sql.js, truyền thẳng bytes đã tải vào `wasmBinary` thay vì để engine tự `fetch` qua `locateFile` — tránh tải trùng và cho phép theo dõi tiến độ đồng nhất cho mọi tài nguyên:

```js
state.SQL = await initSqlJs({ wasmBinary: bytesByKey.engine }); // KHÔNG dùng locateFile nếu đã tự fetch
```

## Bọc toàn bộ boot trong try/catch + timeout

```js
const timeoutId = setTimeout(() => showBootError("Tải quá 45 giây — kiểm tra mạng rồi thử lại."), 45000);
try {
  // ... fetch từng resource, init engine, render ...
  clearTimeout(timeoutId);
  hideOverlay();
} catch (err) {
  clearTimeout(timeoutId);
  showBootError(err.message);   // + hiện nút "Thử lại" gọi location.reload()
}
```

## Kiểm thử bắt buộc trước khi ship

Giả lập một resource lỗi (chặn qua `page.setRequestInterception` trong Puppeteer, trả về 404) và xác nhận: (a) overlay chuyển sang trạng thái lỗi trong vài giây, không treo, (b) nút thử lại tồn tại và hoạt động. Xem `testing-checklist.md`.

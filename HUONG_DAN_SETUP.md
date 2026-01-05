# 📋 HƯỚNG DẪN SETUP GOOGLE SHEETS

## Tổng quan

Hướng dẫn này sẽ giúp bạn kết nối ứng dụng Weekly Goal Planner với Google Sheets để đồng bộ dữ liệu giữa nhiều thiết bị.

---

## Bước 1: Tạo Google Sheet mới

1. Truy cập [Google Sheets](https://sheets.google.com)
2. Tạo một Sheet mới (hoặc sử dụng Sheet có sẵn)
3. Lưu lại URL của Sheet để tham khảo

---

## Bước 2: Tạo cấu trúc bảng

### Đổi tên Sheet

1. Click chuột phải vào tab Sheet ở dưới cùng
2. Chọn "Đổi tên" (Rename)
3. Đổi tên thành `Schedule`

### Tạo các cột header

Ở dòng 1 (row 1), tạo các cột header như sau:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| week_start | day | task | start_time | end_time | color | category |

**Giải thích các cột:**
- **week_start**: Ngày đầu tuần (định dạng: YYYY-MM-DD, ví dụ: 2026-01-05)
- **day**: Thứ trong tuần (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- **task**: Tên công việc/hoạt động
- **start_time**: Giờ bắt đầu (định dạng 24h, ví dụ: 09:00)
- **end_time**: Giờ kết thúc (định dạng 24h, ví dụ: 17:00)
- **color**: Mã màu hex (ví dụ: #4CAF50, #2196F3)
- **category**: Loại công việc (`work_goal` hoặc `me_goal`)

### Ví dụ dữ liệu

```
| week_start | day       | task    | start_time | end_time | color   | category  |
|------------|-----------|---------|------------|----------|---------|-----------|
| 2026-01-05 | Monday    | Gym     | 06:00      | 08:00    | #4CAF50 | me_goal   |
| 2026-01-05 | Monday    | Work    | 09:00      | 17:00    | #2196F3 | work_goal |
| 2026-01-05 | Tuesday   | Meeting | 10:00      | 11:00    | #FF9800 | work_goal |
```

---

## Bước 3: Tạo Apps Script

1. Trong Google Sheet của bạn, click menu **Tiện ích mở rộng** (Extensions) → **Apps Script**
2. Một tab mới sẽ mở ra với code editor
3. Xóa toàn bộ code mặc định (function myFunction() {...})
4. Mở file `apps-script-code.js` trong repository này
5. Copy toàn bộ nội dung và paste vào Apps Script editor
6. Nhấn **Ctrl + S** (hoặc Cmd + S trên Mac) để lưu
7. Đặt tên project (ví dụ: "Weekly Goal API")

---

## Bước 4: Triển khai Web App

1. Click nút **Triển khai** (Deploy) ở góc trên bên phải
2. Chọn **Triển khai mới** (New deployment)
3. Click vào icon bánh răng ⚙️ bên cạnh "Select type"
4. Chọn **Ứng dụng web** (Web app)

### Cấu hình triển khai:

- **Mô tả** (Description): Nhập `Weekly Goal API v1.0`
- **Thực thi với tư cách** (Execute as): Chọn **Me** (tài khoản của bạn)
- **Ai có quyền truy cập** (Who has access): Chọn **Anyone** (Bất kỳ ai)

5. Click **Triển khai** (Deploy)

### Cấp quyền:

Lần đầu tiên deploy, bạn sẽ cần cấp quyền:

1. Click **Authorize access** (Cấp quyền)
2. Chọn tài khoản Google của bạn
3. Click **Advanced** (Nâng cao)
4. Click **Go to [Project Name] (unsafe)** - Đừng lo, đây là project của bạn!
5. Click **Allow** (Cho phép)

### Lưu URL:

Sau khi deploy thành công:

1. Copy **URL** của Web app (URL sẽ có dạng: `https://script.google.com/macros/s/...../exec`)
2. Lưu URL này lại - bạn sẽ cần dùng trong bước tiếp theo

---

## Bước 5: Cập nhật URL trong Code

1. Mở file `js/storage.js` trong project
2. Tìm dòng khai báo `GOOGLE_SCRIPT_URL`
3. Thay thế URL mặc định bằng URL bạn vừa copy ở bước 4
4. Lưu file

**Ví dụ:**

```javascript
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxPFg_n67nunmxuh31l8KCX8-THLwtWOE7K1AmblpqXKJXs_WFvpzUYUUWB43fgybnXY/exec';
```

---

## Bước 6: Test thử nghiệm

1. Mở ứng dụng Weekly Goal Planner trong trình duyệt
2. Thêm một vài hoạt động vào lịch
3. Mở Google Sheet và kiểm tra xem dữ liệu đã được đồng bộ chưa
4. Thử mở ứng dụng trên thiết bị khác - dữ liệu sẽ được đồng bộ!

---

## ✅ Hoàn thành!

Giờ đây, Weekly Goal Planner của bạn đã được kết nối với Google Sheets:

✨ **Lợi ích:**
- Dữ liệu được đồng bộ giữa nhiều thiết bị
- Backup tự động trên Google Drive
- Có thể xem và chỉnh sửa trực tiếp trên Google Sheets
- Không mất dữ liệu khi xóa cache trình duyệt

📱 **Sử dụng trên nhiều thiết bị:**
- Truy cập cùng URL trên điện thoại, máy tính bảng, laptop
- Dữ liệu sẽ tự động đồng bộ
- localStorage vẫn hoạt động như cache offline

---

## ⚠️ Lưu ý quan trọng

1. **Quyền truy cập**: Đảm bảo chọn "Anyone" khi deploy để ứng dụng có thể truy cập API
2. **Tên Sheet**: Phải đặt tên chính xác là `Schedule` (phân biệt hoa thường)
3. **Cột headers**: Phải đúng tên và thứ tự như hướng dẫn
4. **URL**: Nhớ update URL trong code sau mỗi lần deploy lại

---

## 🔄 Cập nhật Apps Script

Nếu bạn cần cập nhật Apps Script code:

1. Mở Apps Script editor
2. Chỉnh sửa code
3. Lưu (Ctrl + S)
4. Click **Deploy** → **Manage deployments**
5. Click icon ✏️ (Edit) bên cạnh deployment hiện tại
6. Tăng version (ví dụ: v1.0 → v1.1)
7. Click **Deploy**
8. URL sẽ vẫn giữ nguyên

---

## 🐛 Troubleshooting

### Lỗi: "Invalid action"
- Kiểm tra lại code Apps Script
- Đảm bảo đã lưu và deploy lại

### Dữ liệu không đồng bộ
- Kiểm tra URL trong `storage.js` có đúng không
- Mở Console (F12) để xem lỗi
- Kiểm tra quyền truy cập Web App

### Lỗi CORS
- Đảm bảo đã chọn "Anyone" khi deploy
- Thử deploy lại Web App

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra lại từng bước trong hướng dẫn
2. Xem phần Troubleshooting ở trên
3. Tạo issue trên GitHub repository

---

**Chúc bạn sử dụng vui vẻ! 🌸**

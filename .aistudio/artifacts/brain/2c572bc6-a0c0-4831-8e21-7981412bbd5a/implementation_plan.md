# Cập Nhật Tính Năng: Thông Báo Tối Ưu, Xuất Excel Chuẩn Thứ Tự & Popup Xác Nhận Phân Ca

## 1. Tối Ưu Hệ Thống Thông Báo (Chống Quá Tải Hệ Thống)
- **Quy tắc phát thông báo**:
  - Chỉ gửi thông báo trong 2 trường hợp:
    1. **Cập nhật công việc (Task)**: Giao việc mới, cập nhật nội dung/thời hạn, cập nhật tiến độ công việc.
    2. **Đổi phân ca làm việc (Shift)**: Khi Admin thay đổi phân ca của nhân sự trong tuần.
  - **Đích danh người nhận**: Task hoặc Ca làm việc thuộc về user nào thì **chỉ hiển thị thông báo cho duy nhất user đó**.
  - Tuyệt đối không gửi broadcast, không gửi thông báo tràn lan cho các user không liên quan, không gửi thông báo cho chính người đang tự cập nhật, và không tạo thông báo cho các thao tác phụ trợ khác (đăng nhập, đổi cài đặt, xóa log, v.v.).
- **Giao diện Hộp thư thông báo**:
  - Phân loại rõ ràng bằng nhãn và icon:
    * `fa-list-check` kèm nhãn xanh Indigo cho thông báo **Công Việc**.
    * `fa-calendar-day` kèm nhãn vàng Amber cho thông báo **Phân Ca**.
  - Bộ lọc `isAllowedNotification` đảm bảo chỉ nạp các thông báo hợp lệ, loại trừ mọi bản ghi không liên quan.

## 2. Xuất Mẫu Excel Phân Ca Chuẩn Thứ Tự Quản Trị Thành Viên
- Trong hàm `downloadScheduleTemplateCustom()`:
  - Sắp xếp mảng nhân sự theo đúng thuộc tính `order` tương ứng với danh sách quản trị thành viên (`users-table-body`).
  - Thứ tự các dòng nhân sự trong file Excel tải về (`STT`, `Mã NV`, `Họ Tên`, `Vị trí`, các ngày trong tuần) trùng khớp hoàn toàn với thứ tự hiển thị trong tab Quản trị thành viên.
  - Khi tải file lên (`handleScheduleUpload`), hệ thống khớp chính xác theo `Mã NV` (`u.id`) hoặc họ tên để cập nhật không bị lệch dòng.

## 3. Popup Xác Nhận Thay Đổi Phân Ca (Admin)
- Khi Admin chọn ca làm việc từ bảng chọn nhanh (`modal-shift-picker`):
  - Nếu trùng ca hiện tại: Báo thông báo nhẹ và đóng modal, không ghi đè dữ liệu.
  - Nếu khác ca hiện tại: Hiển thị popup xác nhận `#modal-confirm-shift-change` với đầy đủ thông tin:
    * Nhân sự & Phòng ban phụ trách.
    * Ngày làm việc (định dạng tiếng Việt: Thứ, Ngày/Tháng/Năm).
    * Đối chiếu 2 cột trực quan: **Ca hiện tại** ➔ **Đổi thành ca mới** với badge màu sắc tương ứng.
    * Nút **Hủy bỏ** (hoặc phím `Escape`): Đóng popup, giữ nguyên ca cũ.
    * Nút **Xác nhận đổi ca**: Lưu vào Firestore, ghi nhật ký, gửi thông báo cho nhân sự đó và cập nhật lại giao diện.

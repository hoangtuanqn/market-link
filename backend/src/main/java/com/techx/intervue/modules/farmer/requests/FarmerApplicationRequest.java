package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Customer đang đăng nhập nộp đơn xin thành Farmer. Email/phone/address dùng lại từ users (đã có ở
 * bước đăng ký Customer) — không lặp trong request này (§9 nguyên tắc bố trí thông tin liên hệ).
 *
 * <p>Đơn chỉ hỏi ba thứ Admin cần để duyệt: sạp là ai, ảnh/video làm bằng chứng, và các cam kết ở
 * bước cuối. Những gì Farmer bán, chợ nào và tồn kho ra sao được khai <b>sau khi được duyệt</b> ở
 * panel Farmer (FR-060…FR-064) — hỏi trước lúc này chỉ làm form dài mà dữ liệu thì chưa chắc dùng.
 */
public record FarmerApplicationRequest(
        @NotBlank(message = "Enter your stall name.")
                @Size(max = 120, message = "Stall name can be at most 120 characters.")
                String stallName,
        @NotBlank(message = "Enter a contact person.")
                @Size(max = 100, message = "Contact person can be at most 100 characters.")
                String contactPerson,
        @Size(max = 2000, message = "Keep the description under 2000 characters.")
                String description,
        // Ảnh là bằng chứng admin xem để duyệt: bắt buộc ít nhất một, khớp form become-farmer.
        // Độ dài từng URL phải khớp cột lưu: dài hơn thì DB ném lỗi và FE đọc thành 401, không
        // phải 400.
        @NotEmpty(message = "Add at least one photo of the plot.")
                @Size(max = 5, message = "At most 5 photos.")
                List<
                                @NotBlank(message = "Upload the photos again.")
                                @Size(max = 255, message = "Photo link is too long.") String>
                        photoUrls,
        @Size(max = 255, message = "Video link is too long.") String videoUrl) {}

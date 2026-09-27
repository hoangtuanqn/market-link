# Theo dõi, sửa và huỷ đơn hàng

Hướng dẫn xem trạng thái đơn, sửa đơn, huỷ đơn và đặt lại sản phẩm đã mua.

## Các trạng thái của đơn hàng

Một đơn đi qua các trạng thái sau:

- **Placed** (đã đặt): đơn vừa tạo, đang chờ Farmer duyệt.
- **Accepted** (đã nhận): Farmer đồng ý và sẽ chuẩn bị hàng.
- **Ready for pickup** (sẵn sàng nhận): hàng đã chuẩn bị xong, bạn tới gian hàng đúng khung giờ để lấy.
- **Completed** (hoàn tất): bạn đã nhận hàng. Farmer bấm hoàn tất khi giao; nếu không, hệ thống tự chuyển
  đơn đang "Ready for pickup" sang "Completed" sau **24 giờ** kể từ ngày nhận.
- **Declined** (bị từ chối): Farmer không nhận đơn, kèm lý do. Hàng được trả lại tồn kho.
- **Cancelled** (đã huỷ): bạn huỷ đơn trước cutoff. Hàng được trả lại tồn kho.

Bạn nhận thông báo khi đơn được nhận, bị từ chối hoặc sẵn sàng để lấy.

## Xem danh sách đơn của tôi

1. Bấm **My orders** trên thanh đầu trang (trang `/orders`).
2. Chọn tab **Upcoming** (sắp nhận), **Past** (đã qua) hoặc **All** (tất cả). Có thể lọc theo gian hàng.
3. Bấm vào một đơn để xem chi tiết.

## Xem chi tiết đơn hàng

Trang chi tiết đơn cho biết: trạng thái hiện tại, chợ và gian hàng nhận hàng, **khung giờ nhận** của bạn,
số tiền cần mang (**Bring** — trả bằng tiền mặt hoặc chuyển khoản tại gian hàng), danh sách sản phẩm,
và **lịch sử** mọi lần đổi trạng thái (ai đổi, lúc nào).

Nút **Directions** mở đường đi tới gian hàng; **Stall page** mở trang gian hàng.

## Sửa đơn hàng

1. Mở chi tiết đơn và bấm **Edit order** (chỉ hiện trước cutoff).
2. Bạn có thể **giảm số lượng** hoặc **bỏ bớt sản phẩm**. Không thêm được sản phẩm mới vào đơn cũ —
   muốn mua thêm thì đặt một đơn mới.
3. Bấm **Send changes for approval**.

Sau khi sửa, đơn **quay về trạng thái Placed** và Farmer phải duyệt lại. Hàng của bạn vẫn được giữ trong lúc chờ.

## Huỷ đơn hàng

1. Mở chi tiết đơn và bấm **Cancel order**.
2. Xác nhận trong hộp thoại. Chọn **Keep order** nếu đổi ý.

Chỉ huỷ được **trước cutoff**, khi đơn đang ở trạng thái Placed hoặc Accepted. Gian hàng được báo ngay và
hàng được mở bán lại.

## Không sửa hoặc huỷ được đơn

Sau thời điểm cutoff, nút sửa và huỷ bị khoá. Đơn đã Ready for pickup, Completed, Declined hoặc Cancelled
cũng không thay đổi được nữa. Khi đó hãy nhắn tin cho gian hàng (**Message the stall**) để trao đổi.

## Đặt lại sản phẩm đã mua

Ở trang **My orders**, các đơn cũ vẫn giữ biên nhận. Bạn có thể **đặt lại** (reorder) những gì đã mua trước đây;
giá và tồn kho lấy theo **hôm nay**, không theo đơn cũ.

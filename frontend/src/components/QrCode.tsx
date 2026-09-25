import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

/**
 * FR-008 — mã QR vẽ ngay trong trình duyệt. Chuỗi otpauth:// chứa khoá bí mật nên không bao giờ gửi cho dịch vụ QR bên
 * ngoài. SVG do thư viện sinh từ chuỗi của backend (tự có nền trắng / chấm đen để app quét được).
 */
const QrCode = ({ value, label }: { value: string; label: string }) => {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className="border-line-strong bg-surface-raised box-border size-45 flex-none rounded-sm border-[1.5px] p-3 [&_svg]:block [&_svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default QrCode;

import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

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
      className="border-line-strong bg-surface-raised box-border size-40 flex-none rounded-sm border-[1.5px] p-3 [&_svg]:block [&_svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default QrCode;

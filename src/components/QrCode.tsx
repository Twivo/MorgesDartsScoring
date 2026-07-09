import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR code (as a PNG data URL) for any text/URL. Client-side only. */
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#0b0f14', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-lg bg-white"
    >
      {src && <img src={src} width={size} height={size} alt="QR code" />}
    </div>
  );
}

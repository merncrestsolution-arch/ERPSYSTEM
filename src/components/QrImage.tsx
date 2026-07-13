import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  className?: string;
};

/** Renders a real scannable QR image from text. */
export default function QrImage({ value, size = 200, className = '' }: Props) {
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc('');
      return;
    }
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'QR render failed');
      });
    return () => { cancelled = true; };
  }, [value, size]);

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!src) return <div className="text-sm text-slate-400">Generating QR…</div>;

  return <img src={src} alt={`QR ${value}`} width={size} height={size} className={`mx-auto ${className}`} />;
}

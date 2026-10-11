import { useMemo } from 'react';
import { encodeQr } from '../utils/qr';

const QUIET_ZONE = 4; // modules of white around the code, as required by the QR spec

export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const matrix = encodeQr(value);
    const commands: string[] = [];
    matrix.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) { x += 1; continue; }
        let end = x;
        while (end < row.length && row[end]) end += 1;
        commands.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h${end - x}v1h${-(end - x)}z`);
        x = end;
      }
    });
    return { path: commands.join(''), size: matrix.length + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#ffffff" />
      <path d={path} fill="#0b0b0f" />
    </svg>
  );
}

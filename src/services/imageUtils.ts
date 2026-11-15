export interface ImageWatermarkOptions {
  direction: string;
  azimuth_deg: number;
  timestamp?: string;
}

/**
 * Compresses an image file from a mobile camera or file picker
 * to optimal dimensions and JPEG quality for responsive storage in IndexedDB,
 * optionally stamping an orientation & azimuth watermark.
 */
export function compressImage(
  file: File,
  maxWidth: number = 1600,
  quality: number = 0.85,
  watermark?: ImageWatermarkOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read image data'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (typeof document === 'undefined' || !document.createElement) {
          resolve(dataUrl);
          return;
        }

        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while bounding within maxWidth
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Stamp cardinal orientation & azimuth watermark if provided
        if (watermark) {
          const dateLabel = new Date(
            watermark.timestamp || Date.now()
          ).toLocaleString();
          const label = `${watermark.direction.toUpperCase()} (${watermark.azimuth_deg}°) • ${dateLabel}`;
          const fontSize = Math.max(12, Math.round(width * 0.02));
          ctx.font = `600 ${fontSize}px monospace`;
          const textWidth = ctx.measureText(label).width;
          const padX = Math.round(fontSize * 0.7);
          const padY = Math.round(fontSize * 0.45);
          const boxHeight = fontSize + padY * 2;
          const margin = Math.max(10, Math.round(width * 0.015));

          ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
          ctx.fillRect(
            margin,
            height - boxHeight - margin,
            textWidth + padX * 2,
            boxHeight
          );
          ctx.fillStyle = '#38bdf8';
          ctx.fillText(
            label,
            margin + padX,
            height - margin - padY - Math.round(fontSize * 0.15)
          );
        }

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = (err) => {
        reject(err);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => {
      reject(err);
    };

    reader.readAsDataURL(file);
  });
}

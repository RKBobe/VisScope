/**
 * Compresses an image file from a mobile camera or file picker
 * to an optimal dimensions and JPEG quality for responsive storage in IndexedDB.
 */
export function compressImage(
  file: File,
  maxWidth: number = 1600,
  quality: number = 0.85
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

        // Draw and compress to JPEG
        ctx.drawImage(img, 0, 0, width, height);
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

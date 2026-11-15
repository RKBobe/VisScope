/**
 * Extracts text, embedded ASCII strings/URLs, and optional rendered page images from PDF files.
 * Resilient to broken ToUnicode CMaps (e.g. Jackson County PrintDatalet PDFs).
 */

export interface ExtractedPdfContent {
  combinedText: string;
  pageTexts: string[];
  pageImages: string[];
  isGarbledEncoding: boolean;
}

/**
 * Checks whether extracted PDF text appears to suffer from a missing/shifted ToUnicode CMap
 * (high density of ASCII punctuation/control chars instead of normal alphanumeric words).
 */
export function detectGarbledFontEncoding(text: string): boolean {
  if (!text || text.trim().length < 20) return false;
  const nonSpace = text.replace(/\s+/g, '');
  if (nonSpace.length === 0) return false;

  let symbolOrControlCount = 0;
  for (let i = 0; i < nonSpace.length; i++) {
    const code = nonSpace.charCodeAt(i);
    if (
      (code >= 1 && code <= 31) ||
      (code >= 33 && code <= 47) ||
      (code >= 58 && code <= 64)
    ) {
      symbolOrControlCount++;
    }
  }

  return symbolOrControlCount / nonSpace.length > 0.35;
}

/**
 * Scans raw PDF binary bytes for printable ASCII runs (such as embedded footer URLs,
 * XMP metadata, or uncompressed strings).
 */
export function extractPrintableAsciiFromBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);
  const matches = raw.match(/[A-Za-z0-9_/:.?&=%#\-+, ]{8,}/g) || [];
  return matches.join('\n');
}

/**
 * Extracts text and optional rendered page images from a PDF ArrayBuffer/Uint8Array.
 */
export async function extractPdfContent(bytes: Uint8Array): Promise<ExtractedPdfContent> {
  const pageTexts: string[] = [];
  const pageImages: string[] = [];

  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Configure worker in browser environment if not already set
    if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
    }

    const loadingTask = pdfjsLib.getDocument({
      data: bytes.slice(),
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      pageTexts.push(pageText);

      // Render page preview/blueprint underlay if running in a browser DOM environment
      if (typeof document !== 'undefined' && pageNum <= 4) {
        try {
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
            pageImages.push(canvas.toDataURL('image/png'));
          }
        } catch {
          // Ignore canvas rendering errors in headless/test environments
        }
      }
    }
  } catch {
    // Fallback to raw ASCII extraction if pdfjs worker is unavailable
  }

  const rawAscii = extractPrintableAsciiFromBytes(bytes);
  const joinedPageText = pageTexts.join('\n\n');
  const isGarbledEncoding = detectGarbledFontEncoding(joinedPageText);
  const combinedText = [joinedPageText, rawAscii].filter(Boolean).join('\n');

  return {
    combinedText,
    pageTexts,
    pageImages,
    isGarbledEncoding,
  };
}

/**
 * Extracts embedded XMP/EXIF/tEXt ASCII metadata and image dimensions from PNG or JPEG bytes.
 */
export function extractImageMetadataAndDimensions(bytes: Uint8Array): {
  embeddedText: string;
  width?: number;
  height?: number;
} {
  let width: number | undefined;
  let height: number | undefined;

  // Check PNG signature + IHDR chunk (width/height at bytes 16..23)
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    width = view.getUint32(16, false);
    height = view.getUint32(20, false);
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    // JPEG SOF0 (0xC0) / SOF2 (0xC2) marker scan
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) {
        height = (bytes[offset + 5] << 8) | bytes[offset + 6];
        width = (bytes[offset + 7] << 8) | bytes[offset + 8];
        break;
      }
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x00) {
        offset += 2;
        continue;
      }
      const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }

  const embeddedText = extractPrintableAsciiFromBytes(bytes);
  return { embeddedText, width, height };
}

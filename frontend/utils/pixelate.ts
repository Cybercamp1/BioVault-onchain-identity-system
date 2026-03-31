/**
 * Pixelates an image from a canvas or video element.
 * @param source The source image, canvas, or video.
 * @param pixelSize The size of the pixels.
 * @returns A base64 string of the pixelated image.
 */
export function pixelateImage(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement, pixelSize: number = 8): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  canvas.width = width;
  canvas.height = height;

  // Draw original image first to get data
  ctx.drawImage(source, 0, 0, width, height);

  // Read pixel data
  const imageData = ctx.getImageData(0, 0, width, height).data;

  // Create a new canvas for the pixelated version
  const pixelCanvas = document.createElement('canvas');
  const pixelCtx = pixelCanvas.getContext('2d');
  if (!pixelCtx) return '';

  pixelCanvas.width = width;
  pixelCanvas.height = height;

  for (let y = 0; y < height; y += pixelSize) {
    for (let x = 0; x < width; x += pixelSize) {
      const i = (y * width + x) * 4;
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      pixelCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      pixelCtx.fillRect(x, y, pixelSize, pixelSize);
    }
  }

  return pixelCanvas.toDataURL('image/png');
}

function resizeImage(img, options = {}) {
  const targetWidth = 200;
  const targetHeight = 50;
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
  const drawnWidth = Math.round(img.width * scale);
  const drawnHeight = Math.round(img.height * scale);
  const offsetX = Math.round((targetWidth - drawnWidth) / 2);
  const offsetY = Math.round((targetHeight - drawnHeight) / 2);

  if (options.applyGrayscaleContrast) {
    ctx.filter = 'grayscale(100%) contrast(150%)';
  }

  ctx.drawImage(img, offsetX, offsetY, drawnWidth, drawnHeight);
  return canvas;
}

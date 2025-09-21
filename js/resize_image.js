const TARGET_WIDTH = 200;
const TARGET_HEIGHT = 50;

export function resizeImage(image, width = TARGET_WIDTH, height = TARGET_HEIGHT) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

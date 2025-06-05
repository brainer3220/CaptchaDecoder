let model;
async function loadModel() {
  if (!model) {
    model = await tf.loadLayersModel('model/tfjs/model.json');
  }
}

function preprocessImage(img) {
  const canvas = resizeImage(img);
  let tensor = tf.browser.fromPixels(canvas, 1);
  tensor = tensor.expandDims(0).toFloat().div(255.0);
  return tensor;
}

function decodePrediction(pred) {
  const digits = '0123456789';
  const arr = pred.squeeze().argMax(-1).arraySync();
  let result = '';
  let last = null;
  for (const i of arr) {
    if (i === last || i >= digits.length) continue;
    result += digits[i];
    last = i;
  }
  return result;
}

async function run() {
  await loadModel();
  const url = document.getElementById('image-url').value;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = async () => {
    const input = preprocessImage(img);
    const pred = model.predict(input);
    const text = decodePrediction(pred);
    document.getElementById('result').innerText = text;
  };
  img.onerror = () => {
    document.getElementById('result').innerText = '이미지를 불러올 수 없습니다.';
  };
  img.src = url;
}

document.getElementById('decode-btn').addEventListener('click', run);

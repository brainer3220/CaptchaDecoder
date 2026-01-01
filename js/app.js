let model;
let isDecoding = false;
const decodeBtn = document.getElementById('decode-btn');

function setDecodingState(active) {
  isDecoding = active;
  decodeBtn.disabled = active;
}
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

function isNetworkOrCorsError(error) {
  const message = (error && error.message ? error.message : String(error)).toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('cors') ||
    message.includes('typeerror: network')
  );
}

async function run() {
  if (isDecoding) return;

  const resultEl = document.getElementById('result');
  const url = document.getElementById('image-url').value.trim();

  setDecodingState(true);
  resultEl.innerText = '디코딩 중…';

  if (!url || !/^https?:\/\//i.test(url)) {
    resultEl.innerText = '이미지 URL을 입력하고 http/https로 시작하는지 확인해주세요.';
    setDecodingState(false);
    return;
  }

  try {
    await loadModel();
  } catch (error) {
    if (isNetworkOrCorsError(error)) {
      resultEl.innerText = '모델을 불러오지 못했습니다. 네트워크 연결이나 CORS 설정을 확인해주세요.';
    } else {
      resultEl.innerText = '모델 로딩 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    setDecodingState(false);
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = async () => {
    try {
      const input = preprocessImage(img);
      const pred = model.predict(input);
      const text = decodePrediction(pred);
      resultEl.innerText = text;
    } catch (error) {
      if (isNetworkOrCorsError(error)) {
        resultEl.innerText = '예측에 필요한 리소스를 불러오지 못했습니다. 네트워크 연결이나 CORS 설정을 확인해주세요.';
      } else {
        resultEl.innerText = '예측 중 오류가 발생했습니다. 입력 이미지를 확인하거나 잠시 후 다시 시도해주세요.';
      }
    } finally {
      setDecodingState(false);
    }
  };
  img.onerror = () => {
    resultEl.innerText = '이미지를 불러올 수 없습니다.';
    setDecodingState(false);
  };
  img.src = url;
}

decodeBtn.addEventListener('click', run);

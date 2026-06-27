let model;
let isDecoding = false;
const decodeBtn = document.getElementById('decode-btn');
const CONFIDENCE_THRESHOLD = 0.6;
const EXPECTED_CAPTCHA_LENGTH = 5;
const CTC_CHARACTERS = '2345678bcdefgmnpwxy';
const CTC_BLANK_INDEX = CTC_CHARACTERS.length;
const resultTextEl = document.getElementById('result-text');
const resultTimingEl = document.getElementById('result-timing');
const resultConfidenceEl = document.getElementById('result-confidence');
const retryBtn = document.getElementById('retry-btn');
const newImageBtn = document.getElementById('new-image-btn');

function setDecodingState(active) {
  isDecoding = active;
  decodeBtn.disabled = active;
}
async function loadModel() {
  if (!model) {
    model = await tf.loadLayersModel('model/tfjs/model.json');
  }
}

function getPreprocessOptions() {
  const grayscaleCheckbox = document.getElementById('enable-grayscale-contrast');
  return {
    applyGrayscaleContrast: grayscaleCheckbox ? grayscaleCheckbox.checked : false,
  };
}

function preprocessImage(img) {
  const canvas = resizeImage(img, getPreprocessOptions());
  return tf.tidy(() =>
    tf.browser
      .fromPixels(canvas, 1)
      .transpose([1, 0, 2])
      .expandDims(0)
      .toFloat()
      .div(255.0),
  );
}

function getBestClass(positionProbs) {
  return positionProbs.reduce(
    (best, prob, index) => (prob > best.prob ? { index, prob } : best),
    { index: -1, prob: Number.NEGATIVE_INFINITY },
  );
}

function decodePrediction(pred) {
  const probs = pred.squeeze([0]).arraySync();
  let result = '';
  let previousIndex = null;
  const lowConfidencePositions = [];
  const confidences = [];

  probs.forEach((positionProbs) => {
    const { index, prob } = getBestClass(positionProbs);

    if (index === CTC_BLANK_INDEX || index < 0 || index >= CTC_CHARACTERS.length) {
      previousIndex = null;
      return;
    }

    if (index === previousIndex) return;

    const char = CTC_CHARACTERS[index];
    const decodedPosition = result.length + 1;
    result += char;
    previousIndex = index;

    if (prob < CONFIDENCE_THRESHOLD) {
      lowConfidencePositions.push(decodedPosition);
    }

    confidences.push({ position: decodedPosition, char, prob });
  });

  return { text: result, lowConfidencePositions, confidences };
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

  const url = document.getElementById('image-url').value.trim();

  setDecodingState(true);
  resultTextEl.innerText = '디코딩 중…';
  resultTimingEl.innerText = '';
  resultConfidenceEl.innerHTML = '';

  if (!url || !/^https?:\/\//i.test(url)) {
    resultTextEl.innerText = '이미지 URL을 입력하고 http/https로 시작하는지 확인해주세요.';
    setDecodingState(false);
    return;
  }

  try {
    await loadModel();
  } catch (error) {
    if (isNetworkOrCorsError(error)) {
      resultTextEl.innerText = '모델을 불러오지 못했습니다. 네트워크 연결이나 CORS 설정을 확인해주세요.';
    } else {
      resultTextEl.innerText = '모델 로딩 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    setDecodingState(false);
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = async () => {
    const startTime = performance.now();
    const startedAt = new Date();
    let input;
    let pred;
    try {
      input = preprocessImage(img);
      pred = model.predict(input);
      const { text, lowConfidencePositions, confidences } = decodePrediction(pred);
      const durationMs = Math.round(performance.now() - startTime);
      const timestampText = startedAt.toLocaleString();
      const confidenceWarning =
        lowConfidencePositions.length > 0 ? `신뢰도 낮음: 위치 ${lowConfidencePositions.join(', ')}` : '';
      const lengthWarning =
        text && text.length !== EXPECTED_CAPTCHA_LENGTH
          ? `예상 길이(${EXPECTED_CAPTCHA_LENGTH}자)와 다름: ${text.length}자`
          : '';
      const warningMessage = [confidenceWarning, lengthWarning].filter(Boolean).join(' · ');
      const warningSuffix = warningMessage ? ` (${warningMessage})` : '';
      const fallbackText = `결과를 확신하기 어렵습니다${warningSuffix}`;
      const displayText = text ? `${text}${warningSuffix}` : fallbackText;
      resultTextEl.innerText = displayText;
      resultTimingEl.innerText = `예측 시작: ${timestampText} · 소요 시간: ${durationMs}ms`;
      renderConfidence(confidences);
    } catch (error) {
      if (isNetworkOrCorsError(error)) {
        resultTextEl.innerText = '예측에 필요한 리소스를 불러오지 못했습니다. 네트워크 연결이나 CORS 설정을 확인해주세요.';
      } else {
        resultTextEl.innerText = '예측 중 오류가 발생했습니다. 입력 이미지를 확인하거나 잠시 후 다시 시도해주세요.';
      }
      resultTimingEl.innerText = '';
      resultConfidenceEl.innerHTML = '';
    } finally {
      pred?.dispose?.();
      input?.dispose?.();
      setDecodingState(false);
    }
  };
  img.onerror = () => {
    resultTextEl.innerText = '이미지를 불러올 수 없습니다.';
    resultTimingEl.innerText = '';
    resultConfidenceEl.innerHTML = '';
    setDecodingState(false);
  };
  img.src = url;
}

decodeBtn.addEventListener('click', run);

retryBtn?.addEventListener('click', () => {
  if (!isDecoding) {
    run();
  }
});

newImageBtn?.addEventListener('click', () => {
  const inputEl = document.getElementById('image-url');
  inputEl.value = '';
  inputEl.focus();
  resultTextEl.innerText = '새로운 이미지 URL을 입력하세요.';
  resultTimingEl.innerText = '';
  resultConfidenceEl.innerHTML = '';
});

function renderConfidence(confidences) {
  if (!Array.isArray(confidences) || confidences.length === 0) {
    resultConfidenceEl.innerHTML = '';
    return;
  }

  const listItems = confidences
    .map(
      ({ position, prob, char }) =>
        `<li><span class="position-label">${position}번째 자리 (${char ?? '?'})</span><span class="confidence-value">${(prob * 100).toFixed(1)}%</span></li>`,
    )
    .join('');

  resultConfidenceEl.innerHTML = `<ul>${listItems}</ul>`;
}

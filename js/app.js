import { resizeImage } from './resize_image.js';

const digits = '0123456789';
const modelPath = chrome.runtime.getURL('model/tfjs/model.json');

const form = document.getElementById('decode-form');
const urlInput = document.getElementById('image-url');
const fileInput = document.getElementById('image-file');
const previewImage = document.getElementById('preview');
const resultField = document.getElementById('result');
const submitButton = form.querySelector('button[type="submit"]');

const messages = {
  loadingModel: t('statusLoadingModel'),
  processing: t('statusProcessing'),
  errorNoInput: t('errorNoInput'),
  errorLoadImage: t('errorLoadImage'),
  errorModel: t('errorModel'),
  emptyResult: t('emptyResult')
};

let modelPromise;
let busy = false;
let previewObjectUrl = null;

function t(key) {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const message = chrome.i18n.getMessage(key);
    if (message) {
      return message;
    }
  }
  return key;
}

function setBusy(state) {
  busy = state;
  submitButton.disabled = state;
  resultField.setAttribute('aria-busy', String(state));
  if (state) {
    form.classList.add('form--busy');
  } else {
    form.classList.remove('form--busy');
  }
}

function setResult(text) {
  resultField.textContent = text ?? '';
}

function clearPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
  previewImage.hidden = true;
  previewImage.removeAttribute('src');
}

async function ensureModel() {
  if (!globalThis.tf) {
    throw new Error(messages.errorModel);
  }

  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.ready();
        return await tf.loadLayersModel(modelPath);
      } catch (error) {
        console.error('Failed to load model', error);
        throw new Error(messages.errorModel);
      }
    })();
  }

  try {
    return await modelPromise;
  } catch (error) {
    modelPromise = undefined;
    throw error;
  }
}

function validateFile(file) {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error(messages.errorLoadImage);
  }
  return file;
}

async function fetchImageBlob(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(messages.errorLoadImage);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(messages.errorLoadImage);
  }

  const response = await fetch(parsed.toString(), {
    cache: 'no-cache',
    credentials: 'omit'
  });

  if (!response.ok) {
    throw new Error(messages.errorLoadImage);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error(messages.errorLoadImage);
  }

  return blob;
}

async function resolveInput() {
  const file = fileInput.files?.[0];
  const url = urlInput.value.trim();

  if (file) {
    return validateFile(file);
  }

  if (url) {
    return await fetchImageBlob(url);
  }

  throw new Error(messages.errorNoInput);
}

async function setPreviewFromBlob(blob) {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
  }

  const objectUrl = URL.createObjectURL(blob);
  previewObjectUrl = objectUrl;
  previewImage.hidden = false;
  previewImage.src = objectUrl;

  try {
    if (typeof previewImage.decode === 'function') {
      await previewImage.decode();
    } else {
      await new Promise((resolve, reject) => {
        previewImage.onload = () => {
          previewImage.onload = null;
          previewImage.onerror = null;
          resolve();
        };
        previewImage.onerror = () => {
          previewImage.onload = null;
          previewImage.onerror = null;
          reject(new Error(messages.errorLoadImage));
        };
      });
    }
    return previewImage;
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    previewObjectUrl = null;
    previewImage.hidden = true;
    previewImage.removeAttribute('src');
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(messages.errorLoadImage);
  }
}

function decodePrediction(prediction) {
  const indices = tf.tidy(() => {
    const squeezed = prediction.squeeze();
    const argMax = squeezed.argMax(-1);
    return argMax.arraySync();
  });

  let result = '';
  let lastIndex = -1;
  for (const index of indices) {
    if (index === lastIndex || index < 0 || index >= digits.length) {
      continue;
    }
    result += digits[index];
    lastIndex = index;
  }

  return result;
}

function runInference(model, image) {
  return tf.tidy(() => {
    const canvas = resizeImage(image);
    const normalized = tf.browser
      .fromPixels(canvas, 1)
      .expandDims(0)
      .toFloat()
      .div(255);

    const prediction = model.predict(normalized);
    const result = decodePrediction(prediction);
    return result;
  });
}

async function handleDecode(event) {
  event.preventDefault();
  if (busy) {
    return;
  }

  setBusy(true);
  try {
    const blob = await resolveInput();
    const imageElement = await setPreviewFromBlob(blob);

    if (!modelPromise) {
      setResult(messages.loadingModel);
    }
    const model = await ensureModel();
    setResult(messages.processing);

    const output = runInference(model, imageElement);
    setResult(output || messages.emptyResult);
  } catch (error) {
    console.error(error);
    setResult(error.message || messages.errorLoadImage);
  } finally {
    setBusy(false);
  }
}

function handleReset() {
  setResult('');
  clearPreview();
}

form.addEventListener('submit', handleDecode);
form.addEventListener('reset', handleReset);

urlInput.addEventListener('input', () => {
  if (urlInput.value) {
    fileInput.value = '';
  }
});

fileInput.addEventListener('input', () => {
  if (fileInput.files && fileInput.files.length > 0) {
    urlInput.value = '';
  }
});

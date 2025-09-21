# CaptchaDecoder

## What is it?
An AI powered Chrome extension that decodes five-digit, number-based CAPTCHA images directly inside the browser popup.

## Why did you make it?
Because typing CAPTCHA is tedious and AI is fun.

## What can CaptchaDecoder do?
- Load the built-in TensorFlow.js model packaged with the extension.
- Decode 5-digit numeric CAPTCHA images from either a public image URL or a local file.
- Provide an instant preview and prediction for quick input into forms.

## How to run
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the upper right corner.
3. Click **Load unpacked** and select this project directory.
4. Pin or open the "CaptchaDecoder" extension. Paste a CAPTCHA image URL or choose an image file, then press **디코드** to see the predicted digits.

The TensorFlow.js runtime (`js/vendor/tf.min.js`) and trained model weights (`model/tfjs/`) are bundled, so the extension works entirely offline once installed.

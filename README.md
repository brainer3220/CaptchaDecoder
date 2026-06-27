# CaptchaDecoder

## What is it?
This is an AI based CAPTCHA decoder.

## Why did you make it?
Because typing CAPTCHA is tedious and AI is fun.

## What can CaptchaDecoder do?
1. Decode 5-character CAPTCHAs that use the model vocabulary `2345678bcdefgmnpwxy`.

## How to run
Serve the repository with a local HTTP server, open the served `index.html` in a modern browser, enter an image URL, and press the decode button to see the predicted text.

For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

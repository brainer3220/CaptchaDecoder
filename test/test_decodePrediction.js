import test from "node:test";
import assert from "node:assert";

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

function stubPred(arr) {
  return {
    _arr: arr,
    squeeze() { return this; },
    argMax() { const self = this; return { arraySync: () => self._arr }; }
  };
}

test('decodes sequence without duplicates', () => {
  const pred = stubPred([1,2,3,4,5]);
  assert.equal(decodePrediction(pred), '12345');
});

test('skips duplicate predictions', () => {
  const pred = stubPred([1,1,2,2,3]);
  assert.equal(decodePrediction(pred), '123');
});

test('ignores invalid indices', () => {
  const pred = stubPred([9,10,3]);
  assert.equal(decodePrediction(pred), '93');
});

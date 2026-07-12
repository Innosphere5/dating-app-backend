import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageBatch } from '../src/validators/upload.validator.js';

function createMockFile(name) {
  return {
    originalname: name,
    mimetype: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAIAAeI0x9QAAAABJRU5ErkJggg==', 'base64')
  };
}

test('rejects a single image before the minimum upload count is met', () => {
  const result = validateImageBatch([createMockFile('solo.png')]);
  assert.equal(result.isValid, false);
  assert.match(result.errors.join(' '), /between 3 and 6/i);
});

test('accepts a batch of 3 to 6 images', () => {
  const files = [1, 2, 3].map((index) => createMockFile(`image-${index}.png`));
  const result = validateImageBatch(files);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects a batch with more than 6 images', () => {
  const files = [1, 2, 3, 4, 5, 6, 7].map((index) => createMockFile(`image-${index}.png`));
  const result = validateImageBatch(files);
  assert.equal(result.isValid, false);
  assert.match(result.errors.join(' '), /between 3 and 6/i);
});

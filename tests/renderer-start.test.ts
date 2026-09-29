import test from 'node:test';
import assert from 'node:assert/strict';
import { startRenderer } from '../src/renderer-start.ts';

test('graphics failure retains a working retry action', () => {
  const retry: { onclick: (() => void) | null } = { onclick: null };
  let reloads = 0, message = '';
  assert.throws(() => startRenderer(() => { throw new Error('No WebGL'); }, retry, () => reloads++, text => message = text), /No WebGL/);
  assert.match(message, /could not start WebGL/);
  retry.onclick!();
  assert.equal(reloads, 1);
});

test('successful graphics startup returns the renderer and keeps recovery available', () => {
  const renderer = {}, retry = { onclick: null as (() => void) | null };
  assert.equal(startRenderer(() => renderer, retry, () => {}, () => assert.fail('Unexpected failure')), renderer);
  assert.equal(typeof retry.onclick, 'function');
});

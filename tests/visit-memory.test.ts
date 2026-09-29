import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMemory, automaticPorch, readStorage, writeStorage } from '../src/visit-memory.ts';
test('visitor memory tolerates malformed and unrelated storage', () => {
  for (const raw of [null, '{', 'null', '42', '[]', '{"time":"noon","discovered":"pond"}'])
    assert.deepEqual(parseMemory(raw), {time:'twilight',discovered:[]});
  assert.deepEqual(parseMemory('{"time":"night","discovered":["pond","pond","unknown","porch"]}'),
    {time:'night',discovered:['pond','porch']});
});
test('time preference and discovery set round trip', () => {
  const memory = {time:'golden',discovered:['lookout','pond','porch']};
  assert.deepEqual(parseMemory(JSON.stringify(memory)), memory);
  assert.deepEqual(['day','golden','twilight','night'].map(t => automaticPorch(t as any)), [false,false,true,true]);
});
test('storage denial does not interrupt arrival or discoveries', () => {
  Object.defineProperty(globalThis, 'localStorage', {configurable:true,get(){throw new Error('Denied');}});
  assert.equal(readStorage('ooo-arrived'), null);
  assert.doesNotThrow(() => writeStorage('ooo-arrived','1'));
  delete (globalThis as any).localStorage;
});

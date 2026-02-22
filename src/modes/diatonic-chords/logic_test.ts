import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ITEMS,
  checkAnswer,
  CHORD_GROUPS,
  getGridItemId,
  getItemIdsForGroup,
  getQuestion,
} from './logic.ts';

describe('ALL_ITEMS', () => {
  it('has 168 items (12 keys × 7 degrees × 2 directions)', () => {
    assert.equal(ALL_ITEMS.length, 168);
  });

  it('contains fwd and rev for expected items', () => {
    assert.ok(ALL_ITEMS.includes('C:1:fwd'));
    assert.ok(ALL_ITEMS.includes('C:1:rev'));
    assert.ok(ALL_ITEMS.includes('Bb:4:fwd'));
    assert.ok(ALL_ITEMS.includes('Bb:4:rev'));
  });
});

describe('CHORD_GROUPS', () => {
  it('has 3 groups', () => {
    assert.equal(CHORD_GROUPS.length, 3);
  });
});

describe('getItemIdsForGroup', () => {
  it('group 0 contains items for degrees 1, 4, and 5', () => {
    const ids = getItemIdsForGroup(0);
    assert.ok(ids.includes('C:1:fwd'));
    assert.ok(ids.includes('C:1:rev'));
    assert.ok(ids.includes('C:4:fwd'));
    assert.ok(ids.includes('C:4:rev'));
    assert.ok(ids.includes('C:5:fwd'));
    assert.ok(ids.includes('C:5:rev'));
  });

  it('group 0 does not include degree 2, 3, 6, or 7', () => {
    const ids = getItemIdsForGroup(0);
    assert.ok(!ids.includes('C:2:fwd'));
    assert.ok(!ids.includes('C:3:fwd'));
    assert.ok(!ids.includes('C:6:fwd'));
    assert.ok(!ids.includes('C:7:fwd'));
  });

  it('group 0 has 72 items (12 keys × 3 degrees × 2 directions)', () => {
    const ids = getItemIdsForGroup(0);
    assert.equal(ids.length, 72);
  });
});

describe('getQuestion', () => {
  it('C:1:fwd returns keyRoot "C", degree 1, chord with numeral "I", dir "fwd"', () => {
    const q = getQuestion('C:1:fwd');
    assert.equal(q.keyRoot, 'C');
    assert.equal(q.degree, 1);
    assert.equal(q.chord.numeral, 'I');
    assert.equal(q.dir, 'fwd');
    assert.equal(q.rootNote, 'C');
  });

  it('Bb:4:rev returns degree 4, chord with numeral "IV", dir "rev"', () => {
    const q = getQuestion('Bb:4:rev');
    assert.equal(q.keyRoot, 'Bb');
    assert.equal(q.degree, 4);
    assert.equal(q.chord.numeral, 'IV');
    assert.equal(q.dir, 'rev');
  });

  it('C:2:fwd returns numeral "ii" and rootNote "D"', () => {
    const q = getQuestion('C:2:fwd');
    assert.equal(q.chord.numeral, 'ii');
    assert.equal(q.rootNote, 'D');
  });

  it('Bb:4:fwd returns rootNote "Eb" (4th degree of Bb major)', () => {
    const q = getQuestion('Bb:4:fwd');
    assert.equal(q.rootNote, 'Eb');
  });
});

describe('checkAnswer fwd', () => {
  it('correct when note matches chord root (C for I of C)', () => {
    const q = getQuestion('C:1:fwd');
    const result = checkAnswer(q, 'C');
    assert.equal(result.correct, true);
  });

  it('correct when note matches chord root (Eb for IV of Bb)', () => {
    const q = getQuestion('Bb:4:fwd');
    const result = checkAnswer(q, 'Eb');
    assert.equal(result.correct, true);
  });

  it('wrong when note does not match chord root', () => {
    const q = getQuestion('C:1:fwd');
    const result = checkAnswer(q, 'G');
    assert.equal(result.correct, false);
  });

  it('correctAnswer includes note and quality (e.g. "C major")', () => {
    const q = getQuestion('C:1:fwd');
    const result = checkAnswer(q, 'G');
    assert.ok(result.correctAnswer.includes('C'));
    assert.ok(result.correctAnswer.includes('major'));
  });
});

describe('checkAnswer rev', () => {
  it('correct when numeral matches (I for degree 1 of C)', () => {
    const q = getQuestion('C:1:rev');
    const result = checkAnswer(q, 'I');
    assert.equal(result.correct, true);
  });

  it('correct when numeral matches (IV for degree 4 of Bb)', () => {
    const q = getQuestion('Bb:4:rev');
    const result = checkAnswer(q, 'IV');
    assert.equal(result.correct, true);
  });

  it('wrong when numeral does not match', () => {
    const q = getQuestion('C:1:rev');
    const result = checkAnswer(q, 'IV');
    assert.equal(result.correct, false);
  });

  it('correctAnswer is the roman numeral', () => {
    const q = getQuestion('C:1:rev');
    const result = checkAnswer(q, 'IV');
    assert.equal(result.correctAnswer, 'I');
  });
});

describe('getGridItemId', () => {
  it('"C", 0 returns ["C:1:fwd", "C:1:rev"] (colIdx 0 → degree 1)', () => {
    const result = getGridItemId('C', 0);
    assert.deepEqual(result, ['C:1:fwd', 'C:1:rev']);
  });

  it('"Bb", 3 returns ["Bb:4:fwd", "Bb:4:rev"] (colIdx 3 → degree 4)', () => {
    const result = getGridItemId('Bb', 3);
    assert.deepEqual(result, ['Bb:4:fwd', 'Bb:4:rev']);
  });

  it('"G", 6 returns ["G:7:fwd", "G:7:rev"] (colIdx 6 → degree 7)', () => {
    const result = getGridItemId('G', 6);
    assert.deepEqual(result, ['G:7:fwd', 'G:7:rev']);
  });
});

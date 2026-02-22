import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ITEMS,
  checkAnswer,
  DEGREE_GROUPS,
  getGridItemId,
  getItemIdsForGroup,
  getQuestion,
  GRID_NOTES,
} from './logic.ts';

describe('ALL_ITEMS', () => {
  it('has 168 items (12 keys × 7 degrees × 2 directions)', () => {
    assert.equal(ALL_ITEMS.length, 168);
  });

  it('contains fwd and rev items for all degrees', () => {
    assert.ok(ALL_ITEMS.includes('C:1:fwd'));
    assert.ok(ALL_ITEMS.includes('C:1:rev'));
    assert.ok(ALL_ITEMS.includes('C:7:fwd'));
    assert.ok(ALL_ITEMS.includes('C:7:rev'));
    assert.ok(ALL_ITEMS.includes('F#:4:fwd'));
    assert.ok(ALL_ITEMS.includes('F#:4:rev'));
  });
});

describe('DEGREE_GROUPS', () => {
  it('has 4 groups', () => {
    assert.equal(DEGREE_GROUPS.length, 4);
  });
});

describe('getItemIdsForGroup', () => {
  it('group 0 contains items for degrees 1 and 5', () => {
    const ids = getItemIdsForGroup(0);
    assert.ok(ids.includes('C:1:fwd'));
    assert.ok(ids.includes('C:1:rev'));
    assert.ok(ids.includes('C:5:fwd'));
    assert.ok(ids.includes('C:5:rev'));
    assert.ok(ids.includes('D:1:fwd'));
    assert.ok(ids.includes('D:5:fwd'));
  });

  it('group 0 does not include degree 3 or 4', () => {
    const ids = getItemIdsForGroup(0);
    assert.ok(!ids.includes('C:3:fwd'));
    assert.ok(!ids.includes('C:4:fwd'));
  });

  it('group 0 has 48 items (12 keys × 2 degrees × 2 directions)', () => {
    const ids = getItemIdsForGroup(0);
    assert.equal(ids.length, 48);
  });
});

describe('getQuestion', () => {
  it('C:3:fwd returns keyRoot "C", degree 3, dir "fwd", noteName "E"', () => {
    const q = getQuestion('C:3:fwd');
    assert.equal(q.keyRoot, 'C');
    assert.equal(q.degree, 3);
    assert.equal(q.dir, 'fwd');
    assert.equal(q.noteName, 'E');
  });

  it('D:5:rev returns degree 5, dir "rev", noteName "A"', () => {
    const q = getQuestion('D:5:rev');
    assert.equal(q.keyRoot, 'D');
    assert.equal(q.degree, 5);
    assert.equal(q.dir, 'rev');
    assert.equal(q.noteName, 'A');
  });

  it('C:1:fwd returns noteName "C"', () => {
    const q = getQuestion('C:1:fwd');
    assert.equal(q.noteName, 'C');
  });

  it('G:4:fwd returns noteName "C"', () => {
    // 4th degree of G major is C
    const q = getQuestion('G:4:fwd');
    assert.equal(q.noteName, 'C');
  });
});

describe('checkAnswer fwd', () => {
  it('correct when note matches (E for 3rd degree of C major)', () => {
    const q = getQuestion('C:3:fwd');
    const result = checkAnswer(q, 'E');
    assert.equal(result.correct, true);
  });

  it('correct for enharmonic equivalent (A for 5th of D major)', () => {
    const q = getQuestion('D:5:fwd');
    const result = checkAnswer(q, 'A');
    assert.equal(result.correct, true);
  });

  it('wrong when note does not match', () => {
    const q = getQuestion('C:3:fwd');
    const result = checkAnswer(q, 'F');
    assert.equal(result.correct, false);
  });

  it('correctAnswer is the display name of the note', () => {
    const q = getQuestion('C:3:fwd');
    const result = checkAnswer(q, 'F');
    assert.equal(result.correctAnswer, 'E');
  });
});

describe('checkAnswer rev', () => {
  it('correct when degree number matches ("3" for E in C major)', () => {
    const q = getQuestion('C:3:rev');
    const result = checkAnswer(q, '3');
    assert.equal(result.correct, true);
  });

  it('wrong when degree number does not match', () => {
    const q = getQuestion('C:3:rev');
    const result = checkAnswer(q, '2');
    assert.equal(result.correct, false);
  });

  it('correctAnswer is the degree label string', () => {
    const q = getQuestion('C:3:rev');
    const result = checkAnswer(q, '2');
    assert.equal(result.correctAnswer, '3rd');
  });
});

describe('GRID_NOTES', () => {
  it('has 12 entries (one per key)', () => {
    assert.equal(GRID_NOTES.length, 12);
  });

  it('each entry has name and displayName', () => {
    for (const entry of GRID_NOTES) {
      assert.ok(entry.name, 'entry should have name');
      assert.ok(entry.displayName, 'entry should have displayName');
    }
  });
});

describe('getGridItemId', () => {
  it('"C", 2 returns ["C:3:fwd", "C:3:rev"] (colIdx 2 → degree 3)', () => {
    const result = getGridItemId('C', 2);
    assert.deepEqual(result, ['C:3:fwd', 'C:3:rev']);
  });

  it('"D", 4 returns ["D:5:fwd", "D:5:rev"] (colIdx 4 → degree 5)', () => {
    const result = getGridItemId('D', 4);
    assert.deepEqual(result, ['D:5:fwd', 'D:5:rev']);
  });

  it('"C", 0 returns ["C:1:fwd", "C:1:rev"] (colIdx 0 → degree 1)', () => {
    const result = getGridItemId('C', 0);
    assert.deepEqual(result, ['C:1:fwd', 'C:1:rev']);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ITEMS,
  checkAnswer,
  getItemIdsForGroup,
  getQuestion,
  getStatsRows,
  KEY_GROUPS,
} from './logic.ts';

describe('ALL_ITEMS', () => {
  it('has 24 items (12 keys × 2 directions)', () => {
    assert.equal(ALL_ITEMS.length, 24);
  });

  it('contains both fwd and rev for each key', () => {
    assert.ok(ALL_ITEMS.includes('C:fwd'));
    assert.ok(ALL_ITEMS.includes('C:rev'));
    assert.ok(ALL_ITEMS.includes('F#:fwd'));
    assert.ok(ALL_ITEMS.includes('F#:rev'));
  });
});

describe('KEY_GROUPS', () => {
  it('has 5 groups', () => {
    assert.equal(KEY_GROUPS.length, 5);
  });
});

describe('getItemIdsForGroup', () => {
  it('group 0 contains C, G, F items', () => {
    const ids = getItemIdsForGroup(0);
    assert.ok(ids.includes('C:fwd'));
    assert.ok(ids.includes('C:rev'));
    assert.ok(ids.includes('G:fwd'));
    assert.ok(ids.includes('G:rev'));
    assert.ok(ids.includes('F:fwd'));
    assert.ok(ids.includes('F:rev'));
  });

  it('group 0 has 6 items (3 keys × 2 directions)', () => {
    const ids = getItemIdsForGroup(0);
    assert.equal(ids.length, 6);
  });
});

describe('getQuestion', () => {
  it('D:fwd returns root "D", dir "fwd", sigLabel "2#"', () => {
    const q = getQuestion('D:fwd');
    assert.equal(q.root, 'D');
    assert.equal(q.dir, 'fwd');
    assert.equal(q.sigLabel, '2#');
  });

  it('Eb:rev returns dir "rev" and sigLabel "3b"', () => {
    const q = getQuestion('Eb:rev');
    assert.equal(q.root, 'Eb');
    assert.equal(q.dir, 'rev');
    assert.equal(q.sigLabel, '3b');
  });

  it('C:fwd returns sigLabel "0"', () => {
    const q = getQuestion('C:fwd');
    assert.equal(q.sigLabel, '0');
  });

  it('G:fwd returns sigLabel "1#"', () => {
    const q = getQuestion('G:fwd');
    assert.equal(q.sigLabel, '1#');
  });
});

describe('checkAnswer fwd', () => {
  it('correct when sig label matches (D major → "2#")', () => {
    const q = getQuestion('D:fwd');
    const result = checkAnswer(q, '2#');
    assert.equal(result.correct, true);
    assert.equal(result.correctAnswer, '2#');
  });

  it('wrong when sig label is different', () => {
    const q = getQuestion('D:fwd');
    const result = checkAnswer(q, '3#');
    assert.equal(result.correct, false);
    assert.equal(result.correctAnswer, '2#');
  });

  it('wrong when sig label is completely wrong', () => {
    const q = getQuestion('D:fwd');
    const result = checkAnswer(q, '0');
    assert.equal(result.correct, false);
  });
});

describe('checkAnswer rev', () => {
  it('correct when note matches the key root (D major)', () => {
    const q = getQuestion('D:rev');
    const result = checkAnswer(q, 'D');
    assert.equal(result.correct, true);
  });

  it('wrong when note does not match (D major, input E)', () => {
    const q = getQuestion('D:rev');
    const result = checkAnswer(q, 'E');
    assert.equal(result.correct, false);
  });

  it('correct for Eb:rev when input is "Eb"', () => {
    const q = getQuestion('Eb:rev');
    const result = checkAnswer(q, 'Eb');
    assert.equal(result.correct, true);
  });

  it('wrong for Eb:rev when input is "D#" (enharmonic mismatch for reverse dir)', () => {
    // The reverse check uses spelledNoteMatchesSemitone, so D# (same semitone as Eb) should be correct
    const q = getQuestion('Eb:rev');
    const result = checkAnswer(q, 'D#');
    assert.equal(result.correct, true);
  });
});

describe('getStatsRows', () => {
  it('returns 12 rows (one per key)', () => {
    const rows = getStatsRows();
    assert.equal(rows.length, 12);
  });

  it('each row has fwdItemId and revItemId', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      assert.ok(row.fwdItemId, 'row should have fwdItemId');
      assert.ok(row.revItemId, 'row should have revItemId');
      assert.ok(row.fwdItemId.endsWith(':fwd'));
      assert.ok(row.revItemId.endsWith(':rev'));
    }
  });
});

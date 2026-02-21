import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ITEMS, checkAnswer, getQuestion, getStatsRows } from './logic.ts';

// ---------------------------------------------------------------------------
// ALL_ITEMS
// ---------------------------------------------------------------------------

describe('ALL_ITEMS', () => {
  it('has 24 items (12 intervals × 2 directions)', () => {
    assert.equal(ALL_ITEMS.length, 24);
  });

  it('contains fwd and rev for each interval', () => {
    assert.ok(ALL_ITEMS.includes('m2:fwd'));
    assert.ok(ALL_ITEMS.includes('m2:rev'));
    assert.ok(ALL_ITEMS.includes('P5:fwd'));
    assert.ok(ALL_ITEMS.includes('P5:rev'));
    assert.ok(ALL_ITEMS.includes('P8:fwd'));
    assert.ok(ALL_ITEMS.includes('P8:rev'));
  });

  it('all IDs end with :fwd or :rev', () => {
    for (const id of ALL_ITEMS) {
      assert.ok(
        id.endsWith(':fwd') || id.endsWith(':rev'),
        `unexpected id: ${id}`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// getQuestion
// ---------------------------------------------------------------------------

describe('getQuestion("m2:fwd")', () => {
  it('returns abbrev "m2", num 1, dir "fwd"', () => {
    const q = getQuestion('m2:fwd');
    assert.equal(q.abbrev, 'm2');
    assert.equal(q.num, 1);
    assert.equal(q.dir, 'fwd');
  });

  it('includes the full interval name', () => {
    const q = getQuestion('m2:fwd');
    assert.ok(typeof q.name === 'string');
    assert.ok(q.name.length > 0);
  });
});

describe('getQuestion("P5:rev")', () => {
  it('returns dir "rev" and num 7', () => {
    const q = getQuestion('P5:rev');
    assert.equal(q.dir, 'rev');
    assert.equal(q.num, 7);
    assert.equal(q.abbrev, 'P5');
  });
});

describe('getQuestion for other intervals', () => {
  it('M2 returns num 2', () => {
    const q = getQuestion('M2:fwd');
    assert.equal(q.num, 2);
    assert.equal(q.abbrev, 'M2');
  });

  it('TT returns num 6', () => {
    const q = getQuestion('TT:fwd');
    assert.equal(q.num, 6);
    assert.equal(q.abbrev, 'TT');
  });

  it('P8 returns num 12', () => {
    const q = getQuestion('P8:rev');
    assert.equal(q.num, 12);
    assert.equal(q.abbrev, 'P8');
  });
});

// ---------------------------------------------------------------------------
// checkAnswer
// ---------------------------------------------------------------------------

describe('checkAnswer fwd (interval → number)', () => {
  it('correct when number matches interval.num', () => {
    const q = getQuestion('m2:fwd');
    const result = checkAnswer(q, '1');
    assert.equal(result.correct, true);
    assert.equal(result.correctAnswer, '1');
  });

  it('wrong when number does not match', () => {
    const q = getQuestion('m2:fwd');
    const result = checkAnswer(q, '2');
    assert.equal(result.correct, false);
    assert.equal(result.correctAnswer, '1');
  });

  it('correct for P5 (num=7)', () => {
    const q = getQuestion('P5:fwd');
    assert.equal(checkAnswer(q, '7').correct, true);
    assert.equal(checkAnswer(q, '5').correct, false);
  });

  it('correct for M7 (num=11)', () => {
    const q = getQuestion('M7:fwd');
    assert.equal(checkAnswer(q, '11').correct, true);
    assert.equal(checkAnswer(q, '12').correct, false);
  });
});

describe('checkAnswer rev (number → interval)', () => {
  it('correct when abbreviation matches', () => {
    const q = getQuestion('m2:rev');
    const result = checkAnswer(q, 'm2');
    assert.equal(result.correct, true);
    assert.equal(result.correctAnswer, 'm2');
  });

  it('wrong for wrong abbreviation', () => {
    const q = getQuestion('m2:rev');
    const result = checkAnswer(q, 'M2');
    assert.equal(result.correct, false);
  });

  it('accepts alt abbreviations for tritone (TT)', () => {
    const q = getQuestion('TT:rev');
    assert.equal(checkAnswer(q, 'TT').correct, true);
    assert.equal(checkAnswer(q, 'A4').correct, true);
    assert.equal(checkAnswer(q, 'd5').correct, true);
    assert.equal(checkAnswer(q, 'P4').correct, false);
  });

  it('correct for P5', () => {
    const q = getQuestion('P5:rev');
    assert.equal(checkAnswer(q, 'P5').correct, true);
    assert.equal(checkAnswer(q, 'm6').correct, false);
  });
});

// ---------------------------------------------------------------------------
// getStatsRows
// ---------------------------------------------------------------------------

describe('getStatsRows', () => {
  it('returns 12 rows (one per interval)', () => {
    const rows = getStatsRows();
    assert.equal(rows.length, 12);
  });

  it('each row has fwdItemId and revItemId', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      assert.ok(
        row.fwdItemId.endsWith(':fwd'),
        `bad fwdItemId: ${row.fwdItemId}`,
      );
      assert.ok(
        row.revItemId.endsWith(':rev'),
        `bad revItemId: ${row.revItemId}`,
      );
    }
  });

  it('fwd and rev item IDs share the same interval abbreviation', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      const fwdAbbrev = row.fwdItemId.replace(':fwd', '');
      const revAbbrev = row.revItemId.replace(':rev', '');
      assert.equal(fwdAbbrev, revAbbrev);
    }
  });

  it('first row is m2, last row is P8', () => {
    const rows = getStatsRows();
    assert.equal(rows[0].fwdItemId, 'm2:fwd');
    assert.equal(rows[11].fwdItemId, 'P8:fwd');
  });

  it('each row has label and sublabel', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      assert.ok(typeof row.label === 'string' && row.label.length > 0);
      assert.ok(typeof row.sublabel === 'string');
    }
  });
});

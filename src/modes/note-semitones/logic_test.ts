import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ITEMS, checkAnswer, getQuestion, getStatsRows } from './logic.ts';

// ---------------------------------------------------------------------------
// ALL_ITEMS
// ---------------------------------------------------------------------------

describe('ALL_ITEMS', () => {
  it('has 24 items (12 notes × 2 directions)', () => {
    assert.equal(ALL_ITEMS.length, 24);
  });

  it('contains fwd and rev for each note', () => {
    assert.ok(ALL_ITEMS.includes('C:fwd'));
    assert.ok(ALL_ITEMS.includes('C:rev'));
    assert.ok(ALL_ITEMS.includes('C#:fwd'));
    assert.ok(ALL_ITEMS.includes('C#:rev'));
    assert.ok(ALL_ITEMS.includes('B:fwd'));
    assert.ok(ALL_ITEMS.includes('B:rev'));
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

describe('getQuestion("C:fwd")', () => {
  it('returns noteName "C", noteNum 0, dir "fwd"', () => {
    const q = getQuestion('C:fwd');
    assert.equal(q.noteName, 'C');
    assert.equal(q.noteNum, 0);
    assert.equal(q.dir, 'fwd');
  });

  it('includes accidentalChoice property', () => {
    const q = getQuestion('C:fwd');
    assert.ok(typeof q.accidentalChoice === 'string');
    assert.ok(q.accidentalChoice.length > 0);
  });
});

describe('getQuestion("C#:rev")', () => {
  it('returns dir "rev" and noteNum 1', () => {
    const q = getQuestion('C#:rev');
    assert.equal(q.dir, 'rev');
    assert.equal(q.noteNum, 1);
    assert.equal(q.noteName, 'C#');
  });

  it('accidentalChoice is either "C#" or "Db"', () => {
    const valid = new Set(['C#', 'Db']);
    for (let i = 0; i < 20; i++) {
      const q = getQuestion('C#:rev');
      assert.ok(
        valid.has(q.accidentalChoice),
        `unexpected: ${q.accidentalChoice}`,
      );
    }
  });
});

describe('getQuestion for other notes', () => {
  it('G returns noteNum 7', () => {
    const q = getQuestion('G:fwd');
    assert.equal(q.noteNum, 7);
    assert.equal(q.noteName, 'G');
  });

  it('B returns noteNum 11', () => {
    const q = getQuestion('B:rev');
    assert.equal(q.noteNum, 11);
    assert.equal(q.noteName, 'B');
  });
});

// ---------------------------------------------------------------------------
// checkAnswer
// ---------------------------------------------------------------------------

describe('checkAnswer fwd (note → number)', () => {
  it('correct when number matches noteNum', () => {
    const q = getQuestion('C:fwd');
    const result = checkAnswer(q, '0');
    assert.equal(result.correct, true);
    assert.equal(result.correctAnswer, '0');
  });

  it('wrong when number does not match', () => {
    const q = getQuestion('C:fwd');
    const result = checkAnswer(q, '3');
    assert.equal(result.correct, false);
    assert.equal(result.correctAnswer, '0');
  });

  it('correct for G (num=7)', () => {
    const q = getQuestion('G:fwd');
    assert.equal(checkAnswer(q, '7').correct, true);
    assert.equal(checkAnswer(q, '6').correct, false);
  });

  it('correct for A# (num=10)', () => {
    const q = getQuestion('A#:fwd');
    assert.equal(checkAnswer(q, '10').correct, true);
    assert.equal(checkAnswer(q, '11').correct, false);
  });
});

describe('checkAnswer rev (number → note)', () => {
  it('correct when note name matches (input "c" for C)', () => {
    const q = getQuestion('C:rev');
    const result = checkAnswer(q, 'c');
    assert.equal(result.correct, true);
  });

  it('wrong for wrong note', () => {
    const q = getQuestion('C:rev');
    const result = checkAnswer(q, 'd');
    assert.equal(result.correct, false);
  });

  it('accepts enharmonic equivalents for C# (c# or db)', () => {
    const q = getQuestion('C#:rev');
    assert.equal(checkAnswer(q, 'c#').correct, true);
    assert.equal(checkAnswer(q, 'db').correct, true);
    assert.equal(checkAnswer(q, 'c').correct, false);
  });

  it('correctAnswer is the display-formatted note', () => {
    const q = getQuestion('C:rev');
    const result = checkAnswer(q, 'd');
    // correctAnswer is displayNote(accidentalChoice) — at minimum a non-empty string
    assert.ok(typeof result.correctAnswer === 'string');
    assert.ok(result.correctAnswer.length > 0);
  });
});

// ---------------------------------------------------------------------------
// getStatsRows
// ---------------------------------------------------------------------------

describe('getStatsRows', () => {
  it('returns 12 rows (one per note)', () => {
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

  it('fwd and rev item IDs share the same note name', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      const fwdNote = row.fwdItemId.replace(':fwd', '');
      const revNote = row.revItemId.replace(':rev', '');
      assert.equal(fwdNote, revNote);
    }
  });

  it('first row is C, last row is B', () => {
    const rows = getStatsRows();
    assert.equal(rows[0].fwdItemId, 'C:fwd');
    assert.equal(rows[11].fwdItemId, 'B:fwd');
  });

  it('each row has label and sublabel', () => {
    const rows = getStatsRows();
    for (const row of rows) {
      assert.ok(typeof row.label === 'string' && row.label.length > 0);
      assert.ok(typeof row.sublabel === 'string');
    }
  });
});

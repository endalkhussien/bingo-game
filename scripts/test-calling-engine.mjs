#!/usr/bin/env node
/**
 * Smoke test for CallingEngine — random draws, no duplicates, reset.
 */
import { CallingEngine } from '../src/domain/services/calling-engine.ts';
import { formatAmharicBallCall, getBallCallAudioKey } from '../src/shared/tts/amharic-ball-call.ts';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    failed++;
  }
}

const engine = new CallingEngine(75);
const seen = new Set();

for (let i = 0; i < 75; i++) {
  const record = engine.draw();
  assert(!seen.has(record.number), `duplicate ${record.number}`);
  assert(record.letter.length === 1, `letter for ${record.number}`);
  assert(record.drawOrder === i + 1, `draw order ${record.drawOrder}`);
  seen.add(record.number);
}

assert(engine.isComplete, 'engine should be complete after 75 draws');
assert(engine.remainingNumbers.length === 0, 'no remaining numbers');

try {
  engine.draw();
  assert(false, 'should throw when exhausted');
} catch {
  // expected
}

const restored = new CallingEngine(75);
restored.loadFromHistory([1, 2, 3], [1000, 2000, 3000]);
assert(restored.drawCount === 3, 'restore count');
assert(restored.remainingNumbers.length === 72, 'restore remaining');

restored.reset();
assert(restored.drawCount === 0, 'reset clears history');

assert(formatAmharicBallCall(1) === 'ቢ አንድ', 'B1 amharic phrase');
assert(formatAmharicBallCall(52) === 'ጂ ሀምሳ ሁለት', 'G52 amharic phrase');
assert(getBallCallAudioKey(52) === 'G52', 'audio key G52');

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log('CallingEngine tests passed');

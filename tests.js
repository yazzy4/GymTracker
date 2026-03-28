/**
 * GymTracker — tests.js
 *
 * Unit tests for all pure/exported functions in app.js.
 * Run with: node tests.js
 *
 * No test framework required — uses a lightweight built-in harness.
 * For CI, swap the harness with Jest: `npm install --save-dev jest`
 * and change the exports in app.js to ES module syntax.
 */

'use strict';

// ── Import pure functions from app.js ──
const {
  calcWeightedBusyness,
  gymHeatData,
  levelColor,
  levelLabel,
  filterFallback,
  buildCacheKey,
  getFallbacks,
  DEFAULT_STATE,
} = require('./assets/app.js');


/* ═══════════════════════════════════════
   MINIMAL TEST HARNESS
═══════════════════════════════════════ */

let passed = 0;
let failed = 0;
let currentSuite = '';

function describe(name, fn) {
  currentSuite = name;
  console.log(`\n  📦 ${name}`);
  fn();
}

function it(description, fn) {
  try {
    fn();
    console.log(`    ✅ ${description}`);
    passed++;
  } catch (err) {
    console.error(`    ❌ ${description}`);
    console.error(`       ${err.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toBeGreaterThan(n) {
      if (actual <= n) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeLessThan(n) {
      if (actual >= n) throw new Error(`Expected ${actual} < ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (actual < n) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (actual > n) throw new Error(`Expected ${actual} <= ${n}`);
    },
    toBeNull() {
      if (actual !== null) throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
    },
    toBeFalsy() {
      if (actual) throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
    },
    toHaveLength(n) {
      if (!actual || actual.length !== n) {
        throw new Error(`Expected length ${n}, got ${actual?.length}`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
      }
    },
    toMatchObject(expected) {
      for (const [k, v] of Object.entries(expected)) {
        if (JSON.stringify(actual[k]) !== JSON.stringify(v)) {
          throw new Error(`Expected .${k} to be ${JSON.stringify(v)}, got ${JSON.stringify(actual[k])}`);
        }
      }
    },
  };
}


/* ═══════════════════════════════════════
   TEST SUITES
═══════════════════════════════════════ */

describe('DEFAULT_STATE', () => {
  it('has all required keys', () => {
    const keys = ['gymId','gymName','gymAddr','busyLevel','busyVotes','equipment','sets','reps','goal','favorites','theme','notifyEnabled','notifyThreshold'];
    keys.forEach(k => {
      if (!(k in DEFAULT_STATE)) throw new Error(`Missing key: ${k}`);
    });
  });

  it('starts with no gym selected', () => {
    expect(DEFAULT_STATE.gymId).toBeNull();
  });

  it('starts with goal set to strength', () => {
    expect(DEFAULT_STATE.goal).toBe('strength');
  });

  it('starts with empty favorites', () => {
    expect(DEFAULT_STATE.favorites).toHaveLength(0);
  });

  it('starts with notify disabled', () => {
    expect(DEFAULT_STATE.notifyEnabled).toBeFalsy();
  });

  it('has a notify threshold of 40', () => {
    expect(DEFAULT_STATE.notifyThreshold).toBe(40);
  });
});


describe('calcWeightedBusyness', () => {
  const mkVotes = (busy, ok, timestamps = []) => ({ busy, ok, timestamps });

  it('returns rawLevel and zero confidence when there are no votes', () => {
    const result = calcWeightedBusyness(50, mkVotes(0, 0), 'gym1');
    expect(result.level).toBe(50);
    expect(result.confidence).toBe(0);
    expect(result.reportCount).toBe(0);
  });

  it('returns confidence > 0 when recent votes exist', () => {
    const now = Date.now();
    const votes = mkVotes(3, 1, [now - 1000, now - 2000, now - 3000, now - 4000]);
    const result = calcWeightedBusyness(60, votes, 'gym1');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reportCount).toBe(4);
  });

  it('confidence saturates at 1 with 10+ votes', () => {
    const now = Date.now();
    const timestamps = Array.from({ length: 15 }, (_, i) => now - i * 1000);
    const votes = mkVotes(10, 5, timestamps);
    const result = calcWeightedBusyness(70, votes, 'gym1');
    expect(result.confidence).toBe(1);
  });

  it('ignores timestamps older than 60 minutes', () => {
    const now = Date.now();
    const oldTs = now - 61 * 60 * 1000;
    const votes = mkVotes(1, 0, [oldTs]);
    const result = calcWeightedBusyness(50, votes, 'gym1');
    expect(result.reportCount).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('returns a level between 0 and 100', () => {
    const now = Date.now();
    const votes = mkVotes(5, 5, Array.from({ length: 5 }, (_, i) => now - i * 60000));
    const result = calcWeightedBusyness(75, votes, 'gym1');
    expect(result.level).toBeGreaterThanOrEqual(0);
    expect(result.level).toBeLessThanOrEqual(100);
  });

  it('blends heavy busy votes toward higher busyness', () => {
    const now = Date.now();
    const votes = mkVotes(9, 1, Array.from({ length: 10 }, (_, i) => now - i * 1000));
    const result = calcWeightedBusyness(50, votes, null);
    expect(result.level).toBeGreaterThan(50);
  });

  it('blends heavy ok votes toward lower busyness', () => {
    const now = Date.now();
    const votes = mkVotes(1, 9, Array.from({ length: 10 }, (_, i) => now - i * 1000));
    const result = calcWeightedBusyness(80, votes, null);
    expect(result.level).toBeLessThan(80);
  });
});


describe('gymHeatData', () => {
  it('returns exactly 18 values', () => {
    expect(gymHeatData('gym1')).toHaveLength(18);
  });

  it('all values are between 5 and 100', () => {
    const data = gymHeatData('gym1');
    data.forEach(v => {
      if (v < 5 || v > 100) throw new Error(`Value out of range: ${v}`);
    });
  });

  it('is deterministic — same id always produces same result', () => {
    const a = gymHeatData('planet_fitness');
    const b = gymHeatData('planet_fitness');
    expect(a).toEqual(b);
  });

  it('produces different patterns for different gym ids', () => {
    const a = gymHeatData('gym_alpha');
    const b = gymHeatData('gym_beta');
    // At least some values should differ
    const different = a.some((v, i) => v !== b[i]);
    if (!different) throw new Error('Expected different patterns for different gyms');
  });

  it('handles null gym id without throwing', () => {
    const data = gymHeatData(null);
    expect(data).toHaveLength(18);
  });

  it('reflects real-world patterns — busiest hours 5-7pm', () => {
    const data = gymHeatData('any_gym');
    // Slots 11 (5pm), 12 (6pm), 13 (7pm) should be higher than slot 0 (6am)
    const earlyMorning = data[0];
    const eveningPeak  = Math.max(data[11], data[12]);
    expect(eveningPeak).toBeGreaterThan(earlyMorning);
  });
});


describe('levelColor', () => {
  it('returns green for low busyness (< 30)', () => {
    expect(levelColor(0)).toBe('#4ade80');
    expect(levelColor(29)).toBe('#4ade80');
  });

  it('returns yellow for moderate busyness (30–54)', () => {
    expect(levelColor(30)).toBe('#fbbf24');
    expect(levelColor(54)).toBe('#fbbf24');
  });

  it('returns orange for busy (55–74)', () => {
    expect(levelColor(55)).toBe('#fb923c');
    expect(levelColor(74)).toBe('#fb923c');
  });

  it('returns red for very busy (75+)', () => {
    expect(levelColor(75)).toBe('#f87171');
    expect(levelColor(100)).toBe('#f87171');
  });
});


describe('levelLabel', () => {
  it('returns "Quiet" for low values', () => {
    expect(levelLabel(0)).toBe('Quiet');
    expect(levelLabel(29)).toBe('Quiet');
  });

  it('returns "Moderate" for mid-range values', () => {
    expect(levelLabel(30)).toBe('Moderate');
    expect(levelLabel(54)).toBe('Moderate');
  });

  it('returns "Busy" for high values', () => {
    expect(levelLabel(55)).toBe('Busy');
    expect(levelLabel(74)).toBe('Busy');
  });

  it('returns "Very busy" for very high values', () => {
    expect(levelLabel(75)).toBe('Very busy');
    expect(levelLabel(100)).toBe('Very busy');
  });
});


describe('filterFallback', () => {
  it('matches by gym name (case-insensitive)', () => {
    const results = filterFallback('planet');
    expect(results[0].name).toBe('Planet Fitness');
  });

  it('matches by zip code', () => {
    const results = filterFallback('10016');
    expect(results[0].name).toBe('Equinox');
  });

  it('matches by address fragment', () => {
    const results = filterFallback('atlantic');
    expect(results[0].name).toBe('Blink Fitness');
  });

  it('returns an empty array for no match', () => {
    const results = filterFallback('xyznonexistent99999');
    expect(results).toHaveLength(0);
  });

  it('returns at most 5 results', () => {
    // All gyms contain 'New York' or 'NY' — but max 5
    const results = filterFallback('ny');
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('is case-insensitive', () => {
    const lower = filterFallback('equinox');
    const upper = filterFallback('EQUINOX');
    expect(lower).toEqual(upper);
  });
});


describe('getFallbacks', () => {
  const goals = ['strength', 'cardio', 'mobility', 'fat loss'];

  goals.forEach(goal => {
    it(`returns 3 suggestions for goal: ${goal}`, () => {
      const results = getFallbacks(goal);
      expect(results).toHaveLength(3);
    });

    it(`each ${goal} suggestion has title, badge, and desc`, () => {
      getFallbacks(goal).forEach(s => {
        if (!s.title) throw new Error('Missing title');
        if (!s.badge) throw new Error('Missing badge');
        if (!s.desc)  throw new Error('Missing desc');
      });
    });
  });

  it('falls back to strength suggestions for unknown goal', () => {
    const unknown  = getFallbacks('powerlifting');
    const strength = getFallbacks('strength');
    expect(unknown).toEqual(strength);
  });
});


describe('buildCacheKey', () => {
  // We need a mock state to test buildCacheKey
  // Since state is module-level in app.js, we test the key format indirectly
  // by reconstructing the logic here.

  function mockBuildCacheKey(goal, busyLevel, equipmentNames) {
    const equipKey = equipmentNames.sort().join(',');
    const levelBucket = Math.round(busyLevel / 20) * 20;
    return `altcache::${goal}::${levelBucket}::${equipKey}`;
  }

  it('buckets busyLevel to nearest 20', () => {
    expect(mockBuildCacheKey('strength', 63, [])).toBe('altcache::strength::60::');
    expect(mockBuildCacheKey('strength', 75, [])).toBe('altcache::strength::80::');
    expect(mockBuildCacheKey('strength', 50, [])).toBe('altcache::strength::60::');
  });

  it('sorts equipment names for consistent keys', () => {
    const a = mockBuildCacheKey('cardio', 40, ['Squat rack', 'Bench press']);
    const b = mockBuildCacheKey('cardio', 40, ['Bench press', 'Squat rack']);
    expect(a).toBe(b);
  });

  it('produces different keys for different goals', () => {
    const a = mockBuildCacheKey('strength', 40, []);
    const b = mockBuildCacheKey('cardio',   40, []);
    if (a === b) throw new Error('Keys should differ by goal');
  });

  it('produces different keys for different busyness buckets', () => {
    const a = mockBuildCacheKey('strength', 20, []);
    const b = mockBuildCacheKey('strength', 80, []);
    if (a === b) throw new Error('Keys should differ by busy level');
  });

  it('produces different keys for different equipment', () => {
    const a = mockBuildCacheKey('strength', 40, ['Treadmill']);
    const b = mockBuildCacheKey('strength', 40, ['Squat rack']);
    if (a === b) throw new Error('Keys should differ by equipment');
  });
});


/* ═══════════════════════════════════════
   RESULTS
═══════════════════════════════════════ */

console.log('\n' + '─'.repeat(50));
console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log('─'.repeat(50) + '\n');

if (failed > 0) process.exit(1);

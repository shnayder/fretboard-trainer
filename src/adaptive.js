// Adaptive question selector: prioritizes items the user is slower on,
// with exploration boost for unseen items.
//
// This is the single source of truth. Tests import it as an ES module.
// main.ts reads it at build time and strips "export" for browser inlining.

export const DEFAULT_CONFIG = {
  minTime: 1000,
  unseenBoost: 3,
  ewmaAlpha: 0.3,
  maxStoredTimes: 10,
  maxResponseTime: 9000,
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

export function computeEwma(oldEwma, newTime, alpha) {
  return alpha * newTime + (1 - alpha) * oldEwma;
}

/**
 * Compute selection weight for an item.
 * - Unseen items get unseenBoost (high weight for exploration).
 * - Seen items get ewma / minTime (slower = heavier).
 * No extra multiplier for low-sample items — that caused a startup rut
 * where seen items outweighed truly unseen ones.
 */
export function computeWeight(stats, cfg) {
  if (!stats) {
    return cfg.unseenBoost;
  }
  return Math.max(stats.ewma, cfg.minTime) / cfg.minTime;
}

/**
 * Weighted random selection. rand should be in [0, 1).
 * Injected for deterministic testing.
 */
export function selectWeighted(items, weights, rand) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    return items[Math.floor(rand * items.length)];
  }
  let remaining = rand * totalWeight;
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Selector factory (storage-injected — works with localStorage or Map)
// ---------------------------------------------------------------------------

export function createAdaptiveSelector(
  storage,
  cfg = DEFAULT_CONFIG,
  randomFn = Math.random,
) {
  function recordResponse(itemId, timeMs) {
    const clamped = Math.min(timeMs, cfg.maxResponseTime);
    const existing = storage.getStats(itemId);
    const now = Date.now();

    if (existing) {
      const newEwma = computeEwma(existing.ewma, clamped, cfg.ewmaAlpha);
      const newTimes = [...existing.recentTimes, clamped].slice(
        -cfg.maxStoredTimes,
      );
      storage.saveStats(itemId, {
        recentTimes: newTimes,
        ewma: newEwma,
        sampleCount: existing.sampleCount + 1,
        lastSeen: now,
      });
    } else {
      storage.saveStats(itemId, {
        recentTimes: [clamped],
        ewma: clamped,
        sampleCount: 1,
        lastSeen: now,
      });
    }
  }

  function getWeight(itemId) {
    return computeWeight(storage.getStats(itemId), cfg);
  }

  function getStats(itemId) {
    return storage.getStats(itemId);
  }

  function selectNext(validItems) {
    if (validItems.length === 0) {
      throw new Error("validItems cannot be empty");
    }
    if (validItems.length === 1) {
      storage.setLastSelected(validItems[0]);
      return validItems[0];
    }

    const lastSelected = storage.getLastSelected();
    const weights = validItems.map((id) =>
      id === lastSelected ? 0 : getWeight(id),
    );

    const selected = selectWeighted(validItems, weights, randomFn());
    storage.setLastSelected(selected);
    return selected;
  }

  return { recordResponse, selectNext, getStats, getWeight };
}

// ---------------------------------------------------------------------------
// In-memory storage (for tests)
// ---------------------------------------------------------------------------

export function createMemoryStorage() {
  const stats = new Map();
  let lastSelected = null;

  return {
    getStats(itemId) {
      return stats.get(itemId) ?? null;
    },
    saveStats(itemId, s) {
      stats.set(itemId, s);
    },
    getLastSelected() {
      return lastSelected;
    },
    setLastSelected(itemId) {
      lastSelected = itemId;
    },
  };
}

// ---------------------------------------------------------------------------
// localStorage-backed storage (for browser)
// ---------------------------------------------------------------------------

export function createLocalStorageAdapter(namespace) {
  const cache = {};
  const mkKey = (itemId) => `adaptive_${namespace}_${itemId}`;
  const lastKey = `adaptive_${namespace}_lastSelected`;

  return {
    getStats(itemId) {
      const k = mkKey(itemId);
      if (!(k in cache)) {
        const data = localStorage.getItem(k);
        try {
          cache[k] = data ? JSON.parse(data) : null;
        } catch {
          cache[k] = null;
        }
      }
      return cache[k];
    },
    saveStats(itemId, stats) {
      const k = mkKey(itemId);
      cache[k] = stats;
      localStorage.setItem(k, JSON.stringify(stats));
    },
    getLastSelected() {
      return localStorage.getItem(lastKey);
    },
    setLastSelected(itemId) {
      localStorage.setItem(lastKey, itemId);
    },
    /** Pre-populate cache to avoid localStorage reads during gameplay. */
    preload(itemIds) {
      for (const itemId of itemIds) {
        this.getStats(itemId);
      }
    },
  };
}

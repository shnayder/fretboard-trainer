// Color scheme definitions and dynamic switching.
// Each scheme overrides the CSS custom properties defined in :root.
// Only brand, topbar, and heatmap colors change — semantic colors
// (success, error, focus) stay constant for consistent feedback.
//
// Depends on: resetHeatmapCache (from stats-display.js)

var COLOR_SCHEMES = {
  classic: {
    name: 'Classic',
    // Amber/gold — the original scheme
    vars: {
      '--color-brand':       'hsl(38, 90%, 55%)',
      '--color-brand-dark':  'hsl(38, 90%, 42%)',
      '--color-brand-bg':    'hsl(38, 60%, 95%)',
      '--color-topbar-bg':   'hsl(220, 15%, 18%)',
      '--color-topbar-text': 'hsl(0, 0%, 95%)',
      '--heatmap-none':      'hsl(30, 5%, 85%)',
      '--heatmap-1':         'hsl(215, 45%, 60%)',
      '--heatmap-2':         'hsl(200, 40%, 65%)',
      '--heatmap-3':         'hsl(50, 50%, 65%)',
      '--heatmap-4':         'hsl(42, 70%, 58%)',
      '--heatmap-5':         'hsl(38, 85%, 55%)',
    },
  },

  ocean: {
    name: 'Ocean',
    // Deep navy header, teal brand, cool blue heatmap
    vars: {
      '--color-brand':       'hsl(178, 65%, 42%)',
      '--color-brand-dark':  'hsl(178, 65%, 32%)',
      '--color-brand-bg':    'hsl(178, 40%, 94%)',
      '--color-topbar-bg':   'hsl(210, 50%, 22%)',
      '--color-topbar-text': 'hsl(180, 20%, 95%)',
      '--heatmap-none':      'hsl(200, 8%, 85%)',
      '--heatmap-1':         'hsl(200, 25%, 70%)',
      '--heatmap-2':         'hsl(190, 35%, 62%)',
      '--heatmap-3':         'hsl(180, 45%, 55%)',
      '--heatmap-4':         'hsl(175, 55%, 45%)',
      '--heatmap-5':         'hsl(170, 65%, 38%)',
    },
  },

  forest: {
    name: 'Forest',
    // Dark green header, emerald brand
    vars: {
      '--color-brand':       'hsl(152, 55%, 42%)',
      '--color-brand-dark':  'hsl(152, 55%, 32%)',
      '--color-brand-bg':    'hsl(152, 35%, 94%)',
      '--color-topbar-bg':   'hsl(160, 30%, 18%)',
      '--color-topbar-text': 'hsl(140, 15%, 95%)',
      '--heatmap-none':      'hsl(140, 5%, 85%)',
      '--heatmap-1':         'hsl(100, 20%, 70%)',
      '--heatmap-2':         'hsl(120, 30%, 62%)',
      '--heatmap-3':         'hsl(135, 40%, 52%)',
      '--heatmap-4':         'hsl(145, 50%, 42%)',
      '--heatmap-5':         'hsl(155, 60%, 35%)',
    },
  },

  sunset: {
    name: 'Sunset',
    // Deep charcoal header, coral brand, warm progression
    vars: {
      '--color-brand':       'hsl(12, 75%, 58%)',
      '--color-brand-dark':  'hsl(12, 75%, 45%)',
      '--color-brand-bg':    'hsl(12, 60%, 95%)',
      '--color-topbar-bg':   'hsl(250, 12%, 20%)',
      '--color-topbar-text': 'hsl(30, 20%, 95%)',
      '--heatmap-none':      'hsl(20, 8%, 85%)',
      '--heatmap-1':         'hsl(25, 30%, 72%)',
      '--heatmap-2':         'hsl(20, 50%, 65%)',
      '--heatmap-3':         'hsl(15, 65%, 58%)',
      '--heatmap-4':         'hsl(8, 75%, 52%)',
      '--heatmap-5':         'hsl(0, 80%, 48%)',
    },
  },

  midnight: {
    name: 'Midnight',
    // Deep blue-purple header, violet brand
    vars: {
      '--color-brand':       'hsl(262, 60%, 58%)',
      '--color-brand-dark':  'hsl(262, 60%, 45%)',
      '--color-brand-bg':    'hsl(262, 40%, 95%)',
      '--color-topbar-bg':   'hsl(250, 35%, 18%)',
      '--color-topbar-text': 'hsl(260, 20%, 95%)',
      '--heatmap-none':      'hsl(250, 8%, 85%)',
      '--heatmap-1':         'hsl(270, 20%, 72%)',
      '--heatmap-2':         'hsl(265, 35%, 65%)',
      '--heatmap-3':         'hsl(260, 48%, 58%)',
      '--heatmap-4':         'hsl(255, 55%, 52%)',
      '--heatmap-5':         'hsl(250, 65%, 48%)',
    },
  },

  rose: {
    name: 'Rose',
    // Dark rose-brown header, rose-pink brand
    vars: {
      '--color-brand':       'hsl(340, 60%, 55%)',
      '--color-brand-dark':  'hsl(340, 60%, 42%)',
      '--color-brand-bg':    'hsl(340, 40%, 95%)',
      '--color-topbar-bg':   'hsl(345, 25%, 20%)',
      '--color-topbar-text': 'hsl(340, 15%, 95%)',
      '--heatmap-none':      'hsl(340, 5%, 85%)',
      '--heatmap-1':         'hsl(350, 25%, 75%)',
      '--heatmap-2':         'hsl(345, 40%, 68%)',
      '--heatmap-3':         'hsl(340, 50%, 60%)',
      '--heatmap-4':         'hsl(335, 58%, 52%)',
      '--heatmap-5':         'hsl(330, 65%, 45%)',
    },
  },

  slate: {
    name: 'Slate',
    // Cool slate header, steel blue brand — minimal, professional
    vars: {
      '--color-brand':       'hsl(215, 45%, 50%)',
      '--color-brand-dark':  'hsl(215, 45%, 38%)',
      '--color-brand-bg':    'hsl(215, 30%, 95%)',
      '--color-topbar-bg':   'hsl(220, 20%, 25%)',
      '--color-topbar-text': 'hsl(210, 10%, 95%)',
      '--heatmap-none':      'hsl(215, 8%, 85%)',
      '--heatmap-1':         'hsl(220, 20%, 72%)',
      '--heatmap-2':         'hsl(218, 30%, 64%)',
      '--heatmap-3':         'hsl(216, 38%, 56%)',
      '--heatmap-4':         'hsl(214, 45%, 48%)',
      '--heatmap-5':         'hsl(212, 55%, 42%)',
    },
  },

  ember: {
    name: 'Ember',
    // Dark brown header, warm copper brand, earth tones
    vars: {
      '--color-brand':       'hsl(25, 70%, 50%)',
      '--color-brand-dark':  'hsl(25, 70%, 38%)',
      '--color-brand-bg':    'hsl(25, 45%, 95%)',
      '--color-topbar-bg':   'hsl(20, 25%, 18%)',
      '--color-topbar-text': 'hsl(25, 15%, 95%)',
      '--heatmap-none':      'hsl(25, 8%, 85%)',
      '--heatmap-1':         'hsl(35, 25%, 72%)',
      '--heatmap-2':         'hsl(30, 45%, 62%)',
      '--heatmap-3':         'hsl(25, 58%, 55%)',
      '--heatmap-4':         'hsl(20, 65%, 48%)',
      '--heatmap-5':         'hsl(15, 75%, 42%)',
    },
  },

  sage: {
    name: 'Sage',
    // Muted olive-green header, sage brand — earthy calm
    vars: {
      '--color-brand':       'hsl(90, 35%, 45%)',
      '--color-brand-dark':  'hsl(90, 35%, 35%)',
      '--color-brand-bg':    'hsl(90, 25%, 94%)',
      '--color-topbar-bg':   'hsl(100, 15%, 22%)',
      '--color-topbar-text': 'hsl(90, 10%, 95%)',
      '--heatmap-none':      'hsl(90, 5%, 85%)',
      '--heatmap-1':         'hsl(95, 15%, 72%)',
      '--heatmap-2':         'hsl(92, 25%, 62%)',
      '--heatmap-3':         'hsl(90, 32%, 52%)',
      '--heatmap-4':         'hsl(88, 38%, 44%)',
      '--heatmap-5':         'hsl(85, 45%, 38%)',
    },
  },
};

var SCHEME_STORAGE_KEY = 'fretboard_colorScheme';

function getColorSchemeId() {
  try {
    return localStorage.getItem(SCHEME_STORAGE_KEY) || 'classic';
  } catch (_) { return 'classic'; }
}

function applyColorScheme(id) {
  var scheme = COLOR_SCHEMES[id];
  if (!scheme) scheme = COLOR_SCHEMES.classic;

  var root = document.documentElement;
  var vars = scheme.vars;
  for (var prop in vars) {
    if (vars.hasOwnProperty(prop)) {
      root.style.setProperty(prop, vars[prop]);
    }
  }

  // Invalidate cached heatmap colors so stats pick up the new palette
  resetHeatmapCache();

  try {
    localStorage.setItem(SCHEME_STORAGE_KEY, id);
  } catch (_) { /* storage unavailable */ }
}

// Apply saved scheme on load (before first paint of stats)
applyColorScheme(getColorSchemeId());

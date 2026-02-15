// Global settings modal: notation toggle (A B C / Do Re Mi).
// Accessed via gear icon in top bar. Hidden during active quiz.
//
// Depends on globals: getUseSolfege, setUseSolfege

function createSettingsModal(options) {
  var onNotationChange = options.onNotationChange || function() {};
  var onSchemeChange = options.onSchemeChange || function() {};

  // --- Build color scheme swatch HTML ---

  var swatchesHTML = '';
  var schemeIds = Object.keys(COLOR_SCHEMES);
  for (var i = 0; i < schemeIds.length; i++) {
    var sid = schemeIds[i];
    var scheme = COLOR_SCHEMES[sid];
    var brandColor = scheme.vars['--color-brand'];
    var topbarColor = scheme.vars['--color-topbar-bg'];
    swatchesHTML +=
      '<button class="scheme-swatch" data-scheme="' + sid + '" ' +
        'aria-label="' + scheme.name + ' color scheme" title="' + scheme.name + '">' +
        '<span class="swatch-fill" style="background:' + brandColor +
          ';box-shadow:inset 0 -8px 0 ' + topbarColor + '"></span>' +
      '</button>';
  }

  // --- Build modal DOM ---

  var overlay = document.createElement('div');
  overlay.className = 'settings-overlay';

  var modal = document.createElement('div');
  modal.className = 'settings-modal';
  modal.innerHTML =
    '<div class="settings-header">' +
      '<span class="settings-title">Settings</span>' +
      '<button class="settings-close-btn" aria-label="Close">\u00D7</button>' +
    '</div>' +
    '<div class="settings-body">' +
      '<div class="settings-field">' +
        '<div class="settings-label">Note names</div>' +
        '<div class="settings-toggle-group">' +
          '<button class="settings-toggle-btn" data-notation="letter">A B C</button>' +
          '<button class="settings-toggle-btn" data-notation="solfege">Do Re Mi</button>' +
        '</div>' +
      '</div>' +
      '<div class="settings-field" style="margin-top:var(--space-5)">' +
        '<div class="settings-label">Color scheme</div>' +
        '<div class="scheme-swatches">' + swatchesHTML + '</div>' +
        '<div class="scheme-name-label"></div>' +
      '</div>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // --- Refs ---

  var closeBtn = modal.querySelector('.settings-close-btn');
  var toggleBtns = modal.querySelectorAll('.settings-toggle-btn');
  var schemeBtns = modal.querySelectorAll('.scheme-swatch');
  var schemeLabel = modal.querySelector('.scheme-name-label');

  // --- State ---

  function updateToggleState() {
    var current = getUseSolfege() ? 'solfege' : 'letter';
    toggleBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.notation === current);
    });
  }

  function updateSchemeState() {
    var currentId = getColorSchemeId();
    schemeBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.scheme === currentId);
    });
    var scheme = COLOR_SCHEMES[currentId];
    if (schemeLabel) schemeLabel.textContent = scheme ? scheme.name : '';
  }

  // --- Open / Close ---

  function open() {
    updateToggleState();
    updateSchemeState();
    overlay.classList.add('open');
  }

  function close() {
    overlay.classList.remove('open');
  }

  // --- Event handlers ---

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      close();
    }
  });

  toggleBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var wantSolfege = btn.dataset.notation === 'solfege';
      if (wantSolfege !== getUseSolfege()) {
        setUseSolfege(wantSolfege);
        updateToggleState();
        onNotationChange();
      }
    });
  });

  schemeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var id = btn.dataset.scheme;
      if (id !== getColorSchemeId()) {
        applyColorScheme(id);
        updateSchemeState();
        onSchemeChange();
      }
    });
  });

  return { open: open, close: close };
}

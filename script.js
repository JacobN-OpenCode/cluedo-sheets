const STORAGE_KEY = 'cluedoSheetsGames';
const CURRENT_KEY = 'cluedoSheetsCurrent';

const SUSPECTS = [
  'Col. Mustard',
  'Prof. Plum',
  'Rev. Green',
  'Mrs. Peacock',
  'Miss Scarlett',
  'Mrs. White',
];

const WEAPONS = [
  'Dagger',
  'Candlestick',
  'Revolver',
  'Rope',
  'Lead Piping',
  'Spanner',
];

const ROOMS = [
  'Hall',
  'Lounge',
  'Dining Room',
  'Kitchen',
  'Ball Room',
  'Conservatory',
  'Billiard Room',
  'Library',
  'Study',
];

const newGameBtn = document.getElementById('newGameBtn');
const saveGameBtn = document.getElementById('saveGameBtn');
const loadGameBtn = document.getElementById('loadGameBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const gameNameInput = document.getElementById('gameName');
const cameFromInput = document.getElementById('cameFrom');
const notesInput = document.getElementById('notes');
const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
const loadModal = document.getElementById('loadModal');
const savedGamesList = document.getElementById('savedGamesList');

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 8)
  );
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptyState() {
  return {
    id: generateId(),
    name: '',
    cameFrom: '',
    notes: '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    suspects: {},
    weapons: {},
    rooms: {},
  };
}

let currentGame = loadCurrentGame() || createEmptyState();

function loadCurrentGame() {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Failed to load current game', err);
    return null;
  }
}

function persistCurrentGame() {
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentGame));
  } catch (err) {
    console.warn('Failed to persist current game', err);
  }
}

function readAllGames() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('Failed to read saved games', err);
    return [];
  }
}

function writeAllGames(games) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  } catch (err) {
    console.warn('Failed to write saved games', err);
  }
}

function render() {
  gameNameInput.value = currentGame.name || '';
  cameFromInput.value = currentGame.cameFrom || '';
  notesInput.value = currentGame.notes || '';

  for (const cb of checkboxes) {
    const type = cb.dataset.type;
    const key = cb.dataset.key;
    const map = currentGame[type];
    cb.checked = Boolean(map && map[key]);
  }
}

function updateFromInputs() {
  currentGame.name = gameNameInput.value.trim();
  currentGame.cameFrom = cameFromInput.value.trim();
  currentGame.notes = notesInput.value.trim();
  currentGame.updatedAt = nowIso();
  persistCurrentGame();
}

gameNameInput.addEventListener('input', updateFromInputs);
cameFromInput.addEventListener('input', updateFromInputs);
notesInput.addEventListener('input', updateFromInputs);

for (const cb of checkboxes) {
  cb.addEventListener('change', (e) => {
    const target = e.currentTarget;
    const type = target.dataset.type;
    const key = target.dataset.key;
    if (!currentGame[type]) {
      currentGame[type] = {};
    }
    currentGame[type][key] = target.checked;
    currentGame.updatedAt = nowIso();
    persistCurrentGame();
  });
}

newGameBtn.addEventListener('click', () => {
  if (currentGame.name || hasAnyChecked() || currentGame.cameFrom || currentGame.notes) {
    // Keep existing, but start a new one - offer a quick save prompt? Just create new.
  }
  const prevId = currentGame.id;
  currentGame = createEmptyState();
  // carry over a sensible default name? leave blank so user can name it
  currentGame.name = '';
  currentGame.cameFrom = '';
  currentGame.notes = '';
  persistCurrentGame();
  render();
  gameNameInput.focus();
});

function hasAnyChecked() {
  return checkboxes.some((cb) => cb.checked);
}

saveGameBtn.addEventListener('click', () => {
  const games = readAllGames();
  const name = (currentGame.name || 'Untitled Cluedo Sheet').trim();
  const existingIndex = games.findIndex((g) => g.id === currentGame.id);
  if (existingIndex >= 0) {
    currentGame.name = name;
    currentGame.updatedAt = nowIso();
    games[existingIndex] = currentGame;
  } else {
    currentGame.id = generateId();
    currentGame.createdAt = nowIso();
    currentGame.updatedAt = nowIso();
    currentGame.name = name;
    games.push(currentGame);
  }
  writeAllGames(games);
  persistCurrentGame();
  render();
  // quick feedback
  const originalText = saveGameBtn.textContent;
  saveGameBtn.textContent = 'Saved!';
  setTimeout(() => {
    saveGameBtn.textContent = originalText;
  }, 900);
});

loadGameBtn.addEventListener('click', () => {
  renderSavedList();
  loadModal.showModal();
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('Clear all checks and notes for this sheet?')) return;
  currentGame.suspects = {};
  currentGame.weapons = {};
  currentGame.rooms = {};
  currentGame.notes = '';
  currentGame.updatedAt = nowIso();
  persistCurrentGame();
  render();
});

exportBtn.addEventListener('click', () => {
  const data = {
    version: 1,
    exportedAt: nowIso(),
    game: currentGame,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `${(currentGame.name || 'cluedo-sheet')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .toLowerCase()}-${Date.now()}.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let game = null;
    if (parsed && parsed.game) game = parsed.game;
    else game = parsed;

    if (!game) throw new Error('Invalid file');

    // normalize
    currentGame = {
      id: generateId(),
      name: game.name || '',
      cameFrom: game.cameFrom || '',
      notes: game.notes || '',
      createdAt: game.createdAt || nowIso(),
      updatedAt: nowIso(),
      suspects: game.suspects || {},
      weapons: game.weapons || {},
      rooms: game.rooms || {},
    };
    persistCurrentGame();
    render();
    const originalText = importBtn.textContent;
    importBtn.textContent = 'Imported!';
    setTimeout(() => {
      importBtn.textContent = originalText;
    }, 900);
  } catch (err) {
    alert('Failed to import: ' + err.message);
  } finally {
    importFile.value = '';
  }
});

function renderSavedList() {
  const games = readAllGames().sort((a, b) => {
    const ta = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const tb = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return ta - tb;
  });
  savedGamesList.innerHTML = '';

  if (games.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'saved-game';
    empty.innerHTML = '<div class="saved-game-meta">No saved games yet.</div>';
    savedGamesList.appendChild(empty);
    return;
  }

  for (const g of games) {
    const wrapper = document.createElement('div');
    wrapper.className = 'saved-game';

    const row = document.createElement('div');
    row.className = 'saved-game-row';

    const main = document.createElement('div');
    main.className = 'saved-game-main';
    main.innerHTML = `
      <div class="saved-game-title">${escapeHtml(g.name || 'Untitled Cluedo Sheet')}</div>
      <div class="saved-game-meta">${formatDate(g.updatedAt || g.createdAt)}${
      g.cameFrom ? ' • Came from: ' + escapeHtml(g.cameFrom) : ''
    }</div>
    `;
    main.addEventListener('click', () => {
      currentGame = {
        id: g.id,
        name: g.name || '',
        cameFrom: g.cameFrom || '',
        notes: g.notes || '',
        createdAt: g.createdAt || nowIso(),
        updatedAt: nowIso(),
        suspects: g.suspects || {},
        weapons: g.weapons || {},
        rooms: g.rooms || {},
      };
      persistCurrentGame();
      render();
      loadModal.close();
    });

    const actions = document.createElement('div');
    actions.className = 'saved-game-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGame = {
        id: g.id,
        name: g.name || '',
        cameFrom: g.cameFrom || '',
        notes: g.notes || '',
        createdAt: g.createdAt || nowIso(),
        updatedAt: nowIso(),
        suspects: g.suspects || {},
        weapons: g.weapons || {},
        rooms: g.rooms || {},
      };
      persistCurrentGame();
      render();
      loadModal.close();
    });

    const dupBtn = document.createElement('button');
    dupBtn.className = 'btn ghost';
    dupBtn.textContent = 'Duplicate';
    dupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const copy = JSON.parse(JSON.stringify(g));
      copy.id = generateId();
      copy.name = (copy.name || 'Untitled Cluedo Sheet') + ' (Copy)';
      copy.createdAt = nowIso();
      copy.updatedAt = nowIso();
      const games = readAllGames();
      games.push(copy);
      writeAllGames(games);
      renderSavedList();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn ghost';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${g.name || 'Untitled Cluedo Sheet'}"?`)) return;
      let games = readAllGames();
      games = games.filter((x) => x.id !== g.id);
      writeAllGames(games);
      if (currentGame.id === g.id) {
        // keep current or reset? don't wipe current unless user wants; just remove from list
      }
      renderSavedList();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);
    row.appendChild(main);
    row.appendChild(actions);
    wrapper.appendChild(row);
    savedGamesList.appendChild(wrapper);
  }
}

function formatDate(iso) {
  if (!iso) return 'Unknown';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

render();

window.addEventListener('beforeunload', () => {
  updateFromInputs();
});
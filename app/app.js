'use strict';

const byId = id => document.getElementById(id);
const shotName = new URLSearchParams(location.search).get('shot');
const isShot = ['checklist', 'guide', 'roadmap', 'filters'].includes(shotName);
const progressKey = 'leonida-after-dark.progress.v1';
const expandedGuides = new Set(shotName === 'guide' ? [17] : []);
let catalog = [];
let validIds = new Set();
let earnedIds = new Set();
let hideStory = false;
window.__shotReady = false;

function makeNode(tag, text = '', css = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  if (css) node.className = css;
  return node;
}

function announce(message) {
  byId('status').textContent = message;
}

function progressSnapshot() {
  return { version: 1, earned: [...earnedIds].sort((a, b) => a - b), spoilers: hideStory };
}

function applySnapshot(value) {
  if (!value || value.version !== 1 || typeof value.spoilers !== 'boolean' ||
      !Array.isArray(value.earned) || value.earned.length > 55 ||
      !value.earned.every(id => Number.isInteger(id) && validIds.has(id))) {
    throw new Error('Unrecognized progress file');
  }
  // Validate the entire payload before changing either piece of saved state.
  earnedIds = new Set(value.earned);
  hideStory = value.spoilers;
}

function persistProgress() {
  if (isShot) return;
  try {
    localStorage.setItem(progressKey, JSON.stringify(progressSnapshot()));
  } catch {
    announce('Browser storage is unavailable. Export a backup to keep these checkmarks.');
  }
}

function isConcealed(trophy) {
  return hideStory && trophy.kind === 'story' && !earnedIds.has(trophy.id);
}

function renderProgress() {
  const count = earnedIds.size;
  byId('progress').textContent = count + ' of ' + catalog.length + ' earned';
  byId('percent').textContent = Math.floor(count / catalog.length * 100) + '%';
  byId('bar').max = catalog.length;
  byId('bar').value = count;
}

function sourceNote(trophy) {
  return makeNode('p', 'Sources · ' + trophy.sources.join(' · '), 'source');
}

function renderTrophy(trophy) {
  const concealed = isConcealed(trophy);
  const visibleName = concealed ? 'Hidden story trophy' : trophy.name;
  const card = makeNode('article', '', 'trophy');
  card.dataset.trophy = trophy.id;
  card.classList.toggle('earned', earnedIds.has(trophy.id));
  const row = makeNode('div', '', 'trophy-line');
  const checkbox = makeNode('input');
  checkbox.type = 'checkbox';
  checkbox.checked = earnedIds.has(trophy.id);
  checkbox.setAttribute('aria-label', 'Earned: ' + visibleName);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) earnedIds.add(trophy.id);
    else earnedIds.delete(trophy.id);
    persistProgress();
    renderProgress();
    if (hideStory && trophy.kind === 'story') {
      renderChecklist();
      renderRoadmap();
      const replacement = byId('cards').querySelector('[data-trophy="' + trophy.id + '"] input');
      (replacement || byId('search')).focus();
    } else {
      card.classList.toggle('earned', checkbox.checked);
    }
  });
  const words = makeNode('div');
  words.append(makeNode('h3', visibleName));
  words.append(makeNode('p', concealed ? 'Mark earned to reveal its name, description and guide.' : trophy.description));
  const badges = makeNode('div', '', 'badges');
  badges.append(makeNode('span', trophy.grade, 'badge ' + trophy.grade));
  if (trophy.missable) badges.append(makeNode('span', 'Missable', 'badge risk'));
  row.append(checkbox, words, badges);
  card.append(row);
  if (!concealed) {
    const guide = makeNode('details');
    guide.open = expandedGuides.has(trophy.id);
    guide.append(makeNode('summary', 'Read guide'), makeNode('p', trophy.guide, 'guide'), sourceNote(trophy));
    guide.addEventListener('toggle', () => {
      if (!guide.isConnected) return;
      if (guide.open) expandedGuides.add(trophy.id);
      else expandedGuides.delete(trophy.id);
    });
    card.append(guide);
  }
  return card;
}

function renderChecklist() {
  const term = byId('search').value.trim().toLowerCase();
  const kind = byId('kind').value;
  const grade = byId('grade').value;
  const visible = catalog.filter(trophy => {
    const kindMatches = !kind || (kind === 'missable' ? trophy.missable : trophy.kind === kind);
    const gradeMatches = !grade || trophy.grade === grade;
    const nameMatches = !term || (!isConcealed(trophy) && trophy.name.toLowerCase().includes(term));
    return kindMatches && gradeMatches && nameMatches;
  });
  byId('results').textContent = visible.length + ' / ' + catalog.length + ' TROPHIES';
  byId('cards').replaceChildren(...visible.map(renderTrophy));
  if (!visible.length) byId('cards').append(makeNode('p', 'No matching trophies. Clear a filter or change your search.'));
}

function selectRoadmap(show) {
  byId('route-view').hidden = !show;
  byId('list-view').hidden = show;
  byId('roadmap').setAttribute('aria-pressed', String(show));
  byId('checklist').setAttribute('aria-pressed', String(!show));
}

function inspectWarning(id) {
  byId('search').value = '';
  byId('grade').value = '';
  byId('kind').value = 'missable';
  expandedGuides.add(id);
  renderChecklist();
  selectRoadmap(false);
  byId('cards').querySelector('[data-trophy="' + id + '"] summary')?.focus();
}

function renderRoadmap() {
  const chapters = [3, 4, 5, 6, 7].map(id => catalog.find(t => t.id === id));
  const chapterRoute = chapters.map(t => isConcealed(t) ? 'Hidden chapter' : t.chapter).join(' → ');
  const missions = catalog.filter(t => t.kind === 'story' && !chapters.includes(t));
  const missionRoute = missions.map(t => isConcealed(t) ? 'Hidden mission' : t.chapter).join(', ');
  const stages = [
    ['Play the story', chapterRoute + '.', 'Complete the named missions as encountered: ' + missionRoute + '. Their chapter placement is unconfirmed.', 'From the first choice: keep rotating saves. Watch partner outings, VCIA, Rhinos, showroom and bowling-alley cues whenever they appear.'],
    ['Finish stranger strands', 'Complete 8 strands across Leonida, including the final jobs for Andy, Kenton, Billy, Randy and Tyrone.', 'Check Bret’s hunt and Cal’s fishing challenge when available; neither has a confirmed unlock chapter.', 'Save before unique encounters where allowed; repeat access is not established.'],
    ['Clear activities', '250 stunts · 20 different race wins · 50 Challenges.', 'Gold all 42 Shooting Range challenges, win at every Top Fun venue and try every activity type.', 'Watch for five enemies in one Combat Focus use, a melee drive-by and an undetected jewelry-store robbery.'],
    ['Sweep collectibles', '3 card sets · 100 WAiNK locations · 100 discovered vehicles.', 'Meditate at every spot and fill exploration gaps across Leonida.', 'On Ocean Beach, watch for the cocktail-with-a-view cue; the exact venue is unconfirmed.'],
    ['Audit cleanup & 100%', '5 Bank Vault escapes · an Armored Truck escape · one Illegal Operation per gang.', 'Launder $250,000, spend $100,000 in shops, buy all garages and register 10 Scooter Bros vehicles. Finish 100% game completion, then verify platinum.', 'Review every remaining PS5 award; this tracker does not calculate the game’s 100% requirements.']
  ];
  byId('stages').replaceChildren(...stages.map(([title, goal, note, warning]) => {
    const stage = makeNode('li');
    stage.append(makeNode('h3', title), makeNode('p', goal), makeNode('p', note), makeNode('p', warning, 'stage-warning'));
    return stage;
  }));
  // Priority is editorial, never a claim about the game's undisclosed encounter order.
  const cuePriority = [48, 47, 49, 50, 33, 34, 37, 38, 45, 46, 36, 51, 39, 44];
  const warnings = catalog.filter(t => t.missable).sort((a, b) => cuePriority.indexOf(a.id) - cuePriority.indexOf(b.id));
  byId('risk-count').textContent = warnings.length + ' TO WATCH';
  byId('warnings').replaceChildren(...warnings.map(trophy => {
    const warning = makeNode('article', '', 'warning');
    const title = makeNode('h3', trophy.name);
    title.append(makeNode('span', 'Missable', 'badge risk'));
    const inspect = makeNode('button', 'Open checklist guide');
    inspect.type = 'button';
    inspect.addEventListener('click', () => inspectWarning(trophy.id));
    warning.append(title, makeNode('p', trophy.guide), sourceNote(trophy), inspect);
    return warning;
  }));
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(progressSnapshot(), null, 2)], { type: 'application/json' });
  const address = URL.createObjectURL(blob);
  const link = makeNode('a');
  link.href = address;
  link.download = 'leonida-after-dark-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(address), 1000);
  announce('Progress exported as JSON.');
}

async function importBackup(event) {
  const picker = event.currentTarget;
  const file = picker.files[0];
  picker.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('File too large');
    applySnapshot(JSON.parse(await file.text()));
  } catch {
    announce('Import failed. Choose a valid Leonida After Dark progress JSON; current progress was kept.');
    return;
  }
  announce('Progress imported.');
  persistProgress();
  refreshGuide();
}

function refreshGuide() {
  byId('spoilers').checked = hideStory;
  renderProgress();
  renderChecklist();
  renderRoadmap();
}

function startGuide() {
  if (!Array.isArray(window.localTrophyCatalog) || window.localTrophyCatalog.length !== 55) {
    announce('The local catalog is missing. Keep data/local-catalog.js beside the guide.');
    return;
  }
  catalog = [...window.localTrophyCatalog];
  validIds = new Set(catalog.map(t => t.id));
  if (isShot) {
    document.body.dataset.shot = shotName;
    hideStory = shotName === 'filters';
    if (hideStory) byId('kind').value = 'story';
    if (shotName === 'guide') catalog.sort((a, b) => Number(b.id === 17) - Number(a.id === 17));
  } else {
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) applySnapshot(JSON.parse(saved));
    } catch {
      announce('Saved progress could not be read. Import a backup if you have one.');
    }
  }
  byId('search').addEventListener('input', renderChecklist);
  byId('kind').addEventListener('change', renderChecklist);
  byId('grade').addEventListener('change', renderChecklist);
  byId('spoilers').addEventListener('change', event => {
    hideStory = event.currentTarget.checked;
    persistProgress();
    refreshGuide();
  });
  byId('checklist').addEventListener('click', () => selectRoadmap(false));
  byId('roadmap').addEventListener('click', () => selectRoadmap(true));
  byId('route-link').addEventListener('click', () => {
    selectRoadmap(true);
    byId('roadmap').focus();
  });
  byId('export').addEventListener('click', exportBackup);
  byId('import').addEventListener('click', () => byId('backup-file').click());
  byId('backup-file').addEventListener('change', importBackup);
  refreshGuide();
  selectRoadmap(shotName === 'roadmap');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

startGuide();

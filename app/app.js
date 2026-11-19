'use strict';

const element = id => document.getElementById(id);
const shot = new URLSearchParams(location.search).get('shot');
const preview = ['checklist', 'guide', 'roadmap', 'filters'].includes(shot);
const storageName = 'leonida-after-dark.progress.v1';
const openGuides = new Set(shot === 'guide' ? [17] : []);
const officialSource = 'PlayStation 5 official trophy list — competition kit';
let trophies = [];
let knownIds = new Set();
let earned = new Set();
let spoilers = false;
window.__shotReady = false;

function node(tag, text = '', className = '') {
  const result = document.createElement(tag);
  result.textContent = text;
  if (className) result.className = className;
  return result;
}

function notify(message) {
  element('status').textContent = message;
}

function snapshot() {
  return { version: 1, earned: [...earned].sort((a, b) => a - b), spoilers };
}

function restore(data) {
  const ids = data?.earned;
  if (data?.version !== 1 || typeof data.spoilers !== 'boolean' ||
      !Array.isArray(ids) || ids.length > 55 ||
      !ids.every(id => Number.isInteger(id) && knownIds.has(id))) {
    throw new Error('Invalid progress backup');
  }
  // Commit only after the complete import has passed validation.
  earned = new Set(ids);
  spoilers = data.spoilers;
}

function save() {
  if (preview) return;
  try {
    localStorage.setItem(storageName, JSON.stringify(snapshot()));
  } catch {
    notify('Storage is unavailable. Export your progress to keep a backup.');
  }
}

function concealed(trophy) {
  return spoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

function updateMeter() {
  element('progress').textContent = `${earned.size} of 55 earned`;
  element('percent').textContent = `${Math.floor(earned.size / 55 * 100)}%`;
  element('bar').value = earned.size;
}

function citation(trophy) {
  return node('p', 'Sources · ' + trophy.sources.join(' · '), 'source');
}

function trophyCard(trophy) {
  const hidden = concealed(trophy);
  const title = hidden ? 'Hidden story trophy' : trophy.name;
  const card = node('article', '', 'trophy');
  card.dataset.trophy = trophy.id;
  card.classList.toggle('earned', earned.has(trophy.id));
  const line = node('div', '', 'trophy-line');
  const check = node('input');
  check.type = 'checkbox';
  check.checked = earned.has(trophy.id);
  check.setAttribute('aria-label', 'Earned: ' + title);
  check.addEventListener('change', () => {
    if (check.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    save();
    updateMeter();
    if (spoilers && trophy.kind === 'story') {
      drawList();
      drawRoute();
      const next = element('cards').querySelector(`[data-trophy="${trophy.id}"] input`);
      (next || element('search')).focus();
    } else card.classList.toggle('earned', check.checked);
  });
  const words = node('div');
  words.append(node('h3', title), node('p', hidden ? 'Mark earned to reveal its name, description and guide.' : trophy.description));
  const badges = node('div', '', 'badges');
  badges.append(node('span', trophy.grade, 'badge ' + trophy.grade));
  if (trophy.missable) badges.append(node('span', 'Missable', 'badge risk'));
  line.append(check, words, badges);
  card.append(line);
  if (!hidden) {
    const details = node('details');
    details.open = openGuides.has(trophy.id);
    details.append(node('summary', 'Read guide'), node('p', trophy.guide, 'guide'), citation(trophy));
    details.addEventListener('toggle', () => {
      if (!details.isConnected) return;
      if (details.open) openGuides.add(trophy.id);
      else openGuides.delete(trophy.id);
    });
    card.append(details);
  }
  return card;
}

function drawList() {
  const query = element('search').value.trim().toLocaleLowerCase('en');
  const kind = element('kind').value;
  const grade = element('grade').value;
  const matches = trophies.filter(trophy =>
    (!kind || trophy.kind === kind) &&
    (!grade || trophy.grade === grade) &&
    (!query || (!concealed(trophy) && trophy.name.toLocaleLowerCase('en').includes(query)))
  );
  element('results').textContent = `${matches.length} / 55 TROPHIES`;
  element('cards').replaceChildren(...matches.map(trophyCard));
  if (!matches.length) element('cards').append(node('p', 'No matching trophies. Try another filter or clear your search.'));
}

function showRoute(active) {
  element('route-view').hidden = !active;
  element('list-view').hidden = active;
  element('roadmap').setAttribute('aria-pressed', String(active));
  element('checklist').setAttribute('aria-pressed', String(!active));
}

function openWarning(id) {
  element('search').value = '';
  element('grade').value = '';
  element('kind').value = 'missable';
  openGuides.add(id);
  drawList();
  showRoute(false);
  element('cards').querySelector(`[data-trophy="${id}"] summary`)?.focus();
}

function drawRoute() {
  const chapterIds = [3, 4, 5, 6, 7];
  const chapters = chapterIds.map(id => trophies.find(t => t.id === id));
  const sequence = chapters.map(t => concealed(t) ? 'Hidden chapter' : t.chapter).join(' → ');
  const missions = trophies.filter(t => t.kind === 'story' && !chapterIds.includes(t.id));
  const missionNames = missions.map(t => concealed(t) ? 'Hidden mission' : t.chapter).join(', ');
  const plan = [
    ['Play the story', sequence + '.', 'Named missions as encountered: ' + missionNames + '. Their chapter placement is unconfirmed.', 'From the first decision: watch Actions Speak Louder and other unusual scenes. During partner access, watch Hot Together and Retail Therapy.'],
    ['Finish stranger strands', 'Complete 8 stranger strands across Leonida. Finish the jobs for Andy, Kenton, Billy, Randy and Tyrone.', 'Check Bret’s unique-animal hunt and Cal’s fishing challenge when offered; unlock chapters are unknown.', 'At matching encounters: save before VCIA departure, Rhinos, showroom and Kolt & Associates’ bowling-alley cues.'],
    ['Clear activities', '250 stunts · 20 different race wins · 50 Challenges.', 'Gold all 42 Shooting Range challenges, win at every Top Fun venue, complete an arcade game and try every activity type.', 'During suitable attempts: watch Gunslinger, Ten Pin and Sneakthief. Keep an earlier save where allowed.'],
    ['Sweep collectibles', '3 card sets · 100 WAiNK locations · 100 vehicle discoveries.', 'Meditate at every spot and explore remaining areas of Leonida. Track places and sets separately from individual visits.', 'On Ocean Beach: watch In The Beginning… at the first matching cocktail scene; its venue and repeat access are unknown.'],
    ['Cleanup & 100% last', '5 Bank Vault escapes · an Armored Truck escape · one Illegal Operation per gang.', 'Launder $250,000, spend $100,000 in shops, buy all garages and register 10 Scooter Bros vehicles. Audit 100% completion, then platinum.', 'Review all remaining awards on PS5. Browser checkmarks do not calculate the game’s completion percentage.']
  ];
  element('stages').replaceChildren(...plan.map(([title, goal, detail, warning]) => {
    const stage = node('li');
    stage.append(node('h3', title), node('p', goal), node('p', detail), node('p', warning, 'stage-warning'));
    return stage;
  }));
  // No unlock chronology is established. Group decision, partner and place cues.
  const priority = [48, 47, 49, 50, 33, 34, 37, 38, 45, 46, 36, 51, 39, 44];
  const warnings = trophies.filter(t => t.missable).sort((a, b) => priority.indexOf(a.id) - priority.indexOf(b.id));
  element('risk-count').textContent = `${warnings.length} TO WATCH`;
  element('warnings').replaceChildren(...warnings.map(trophy => {
    const warning = node('article', '', 'warning');
    const heading = node('h3', trophy.name);
    heading.append(node('span', 'Missable', 'badge risk'));
    const button = node('button', 'Open checklist guide');
    button.type = 'button';
    button.addEventListener('click', () => openWarning(trophy.id));
    warning.append(heading, node('p', trophy.guide), citation(trophy), button);
    return warning;
  }));
}

function refresh() {
  element('spoilers').checked = spoilers;
  updateMeter();
  drawList();
  drawRoute();
}

function downloadProgress() {
  const file = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const anchor = node('a');
  anchor.href = url;
  anchor.download = 'leonida-after-dark-progress.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress exported. Keep the JSON file as your backup.');
}

async function uploadProgress(event) {
  const file = event.currentTarget.files[0];
  event.currentTarget.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('Oversize backup');
    restore(JSON.parse(await file.text()));
  } catch {
    notify('Import failed. Choose a valid progress JSON; your current progress was kept.');
    return;
  }
  save();
  refresh();
  notify('Progress imported successfully.');
}

function initializeGuide() {
  const rows = window.localTrophyCatalog;
  if (!Array.isArray(rows) || rows.length !== 55) {
    notify('Catalog unavailable. Keep data/local-catalog.js inside the app folder.');
    return;
  }
  trophies = rows.map(([id, name, description, grade, kind, chapter, guide]) => ({
    id, name, description, grade, kind, chapter, guide,
    missable: kind === 'missable',
    sources: id === 17 ? [officialSource, 'Competition rules — Shooting Range tracked count: 42'] : [officialSource]
  }));
  knownIds = new Set(trophies.map(t => t.id));
  if (preview) {
    // Screenshot fixtures never read or overwrite the user's saved checklist.
    document.body.dataset.shot = shot;
    spoilers = shot === 'filters';
    if (spoilers) element('kind').value = 'story';
    if (shot === 'guide') trophies.sort((a, b) => Number(b.id === 17) - Number(a.id === 17));
  } else {
    try {
      const saved = localStorage.getItem(storageName);
      if (saved) restore(JSON.parse(saved));
    } catch {
      notify('Saved progress could not be read. Import a backup if available.');
    }
  }
  element('search').addEventListener('input', drawList);
  element('kind').addEventListener('change', drawList);
  element('grade').addEventListener('change', drawList);
  element('spoilers').addEventListener('change', event => {
    spoilers = event.currentTarget.checked;
    save();
    refresh();
  });
  element('checklist').addEventListener('click', () => showRoute(false));
  element('roadmap').addEventListener('click', () => showRoute(true));
  element('route-link').addEventListener('click', () => {
    showRoute(true);
    element('roadmap').focus();
  });
  element('export').addEventListener('click', downloadProgress);
  element('import').addEventListener('click', () => element('backup-file').click());
  element('backup-file').addEventListener('change', uploadProgress);
  refresh();
  showRoute(shot === 'roadmap');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

initializeGuide();

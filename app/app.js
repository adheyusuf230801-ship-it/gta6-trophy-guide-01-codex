'use strict';

const byId = id => document.getElementById(id);
let trophies;
let validIds;
window.__shotReady = false;
const shot = new URLSearchParams(location.search).get('shot');
const preview = ['checklist', 'guide', 'roadmap', 'filters'].includes(shot);
const storageKey = 'leonida-after-dark.progress.v1';

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content != null) node.textContent = content;
  return node;
}

function parseProgress(data) {
  if (data?.version !== 1 || !Array.isArray(data.earned) ||
      !data.earned.every(id => validIds.has(id)) ||
      typeof data.spoilers !== 'boolean') {
    throw new Error('Unknown progress format');
  }
  return { earned: new Set(data.earned), spoilers: data.spoilers };
}

function readProgress() {
  if (!preview) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return parseProgress(JSON.parse(saved));
    } catch {
      notify('Saved progress could not be read. You can still use the guide and import a backup.');
    }
  }
  return { earned: new Set(), spoilers: shot === 'filters' };
}

function progressSnapshot() {
  return { version: 1, earned: trophies.filter(t => state.earned.has(t.id)).map(t => t.id), spoilers: state.spoilers };
}

function notify(message) {
  byId('notice').textContent = message;
  byId('notice').hidden = !message;
}

function saveProgress() {
  if (preview) return false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(progressSnapshot()));
    return true;
  } catch {
    notify('Browser storage is unavailable. Export a backup to keep your progress.');
    return false;
  }
}

function updateProgress() {
  if (byId('bar').value !== state.earned.size) {
    byId('bar').value = state.earned.size;
    byId('progress').replaceChildren(element('strong', '', state.earned.size), ' of ' + trophies.length + ' earned');
  }
  byId('percent').textContent = Math.floor(100 * state.earned.size / trophies.length) + '%';
}

function isConcealed(trophy) {
  return state.spoilers && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function displayName(trophy) {
  return isConcealed(trophy) ? 'Hidden story trophy' : trophy.name;
}

function trophyCard(trophy) {
  const concealed = isConcealed(trophy);
  const card = element('article', 'trophy');
  card.dataset.id = trophy.id;
  card.classList.toggle('earned', state.earned.has(trophy.id));

  const top = element('div', 'trophy-top');
  const check = element('input');
  check.type = 'checkbox';
  check.checked = state.earned.has(trophy.id);
  check.setAttribute('aria-label', 'Earned: ' + displayName(trophy));
  check.addEventListener('change', () => {
    if (check.checked) state.earned.add(trophy.id);
    else state.earned.delete(trophy.id);
    notify('');
    saveProgress();
    updateProgress();
    if (trophy.kind === 'story' && state.spoilers) {
      renderChecklist();
      byId('rows').querySelector('[data-id="' + trophy.id + '"] input')?.focus();
    } else {
      card.classList.toggle('earned', check.checked);
    }
  });

  const copy = element('div');
  copy.append(element('h3', '', displayName(trophy)), element('p', '', concealed ? 'Name and guide reveal when marked earned.' : trophy.description));
  const badges = element('div', 'badges');
  badges.append(element('span', 'badge ' + trophy.grade, trophy.grade));
  if (trophy.missable) badges.append(element('span', 'badge warn', 'Missable'));
  top.append(check, copy, badges);
  card.append(top);

  if (!concealed) {
    const details = element('details', 'details');
    details.open = openGuides.has(trophy.id);
    details.addEventListener('toggle', () => {
      if (details.open) openGuides.add(trophy.id);
      else openGuides.delete(trophy.id);
    });
    const sources = element('p', 'sources');
    sources.append(element('strong', '', 'Sources · '), trophy.sources.join(' · '));
    details.append(element('summary', '', 'Read guide'), element('p', 'guide-copy', trophy.guide), sources);
    card.append(details);
  }

  return card;
}

function renderChecklist() {
  const query = byId('search').value.trim().toLowerCase();
  const kind = byId('kind').value;
  const grade = byId('grade').value;
  const matches = displayOrder.filter(trophy =>
    (kind === 'all' || trophy.kind === kind) &&
    (grade === 'all' || trophy.grade === grade) &&
    (!query || (!isConcealed(trophy) && trophy.name.toLowerCase().includes(query)))
  );

  byId('results').textContent = matches.length + ' / ' + trophies.length + ' SHOWN';
  byId('rows').replaceChildren(...matches.map(trophyCard));
  if (!matches.length) {
    const empty = element('div', 'empty');
    empty.append(element('p', '', kind === 'online' ? 'The PS5 list has no online trophies.' : 'No visible trophies match these filters.'));
    const reset = element('button', '', 'Clear filters');
    reset.addEventListener('click', () => {
      byId('search').value = '';
      byId('kind').value = 'all';
      byId('grade').value = 'all';
      renderChecklist();
      byId('search').focus();
    });
    empty.append(reset);
    byId('rows').append(empty);
  }
}

const roadmap = [
  {
    title: 'Complete the story',
    goal: 'Chapter 1 → Chapter 2 → Chapter 3 → Chapter 4 → final mission.',
    notes: 'Keep rotating saves before choices, VCIA visits and unusual encounters.',
    missions: [2, 8, 9, 10, 11, 12, 13]
  },
  {
    title: 'Close out the stranger strands',
    goal: 'Complete 8 strands across Leonida. Finish the last missions for Andy, Kenton, Billy, Randy and Tyrone.',
    notes: 'Check Bret’s unique hunt and Cal’s fishing challenge as their objectives appear.'
  },
  {
    title: 'Clear the activity targets',
    goal: 'Try all 9 activity types, finish 250 stunts, gold all 42 range challenges and win 20 different races.',
    notes: 'Get a drone race win at each of 14 venues, then complete 50 challenges and finish an arcade game.'
  },
  {
    title: 'Sweep Leonida for collectibles',
    goal: 'Finish 3 card sets, log 100 WAiNK locations and visit all 18 meditation spots.',
    notes: 'Discover 100 vehicles and use the exploration tally to cover all 52 areas.'
  },
  {
    title: 'Finish cleanup and claim platinum',
    goal: 'Finish robbery, spending and property targets, and register 10 vehicles in Scooter Bros.',
    notes: 'Reach 100% in-game completion for the gold. Then check the PS5 list for any of the other 54 trophies still locked.'
  }
];

// Sorted by the cue to watch for; the official list does not date individual unlocks.
const riskOrder = [48, 47, 37, 38, 44, 45, 46, 49, 50, 33, 34, 36, 39, 51];

function renderRoadmap() {
  const stages = roadmap.map(stage => {
    const item = element('li');
    item.append(element('h3', '', stage.title), element('p', '', stage.goal), element('p', 'stage-extra', stage.notes));
    if (stage.missions && !state.spoilers) {
      const missions = stage.missions.map(id => trophies.find(trophy => trophy.id === id).chapter);
      item.append(element('p', '', 'Named missions (chapter placement unconfirmed): ' + missions.join(' · ')));
    }
    return item;
  });
  byId('stages').replaceChildren(...stages);

  const watchlist = riskOrder.map(id => trophies.find(trophy => trophy.id === id));
  byId('risk-count').textContent = watchlist.length + ' FLAGS';
  byId('warnings').replaceChildren(...watchlist.map(trophy => {
    const card = element('article', 'risk-card');
    const heading = element('div');
    const title = element('h3');
    const link = element('button', 'risk-link', trophy.name);
    link.type = 'button';
    link.setAttribute('aria-label', 'Open trophy guide: ' + trophy.name);
    link.addEventListener('click', () => openWarningGuide(trophy.id));
    title.append(link);
    heading.append(title, element('span', 'micro pink', trophy.risk));
    card.append(heading, element('p', '', trophy.warning));
    return card;
  }));
}

function openWarningGuide(id) {
  byId('search').value = '';
  byId('kind').value = 'missable';
  byId('grade').value = 'all';
  openGuides.add(id);
  renderChecklist();
  showPanel(false);
  const summary = byId('rows').querySelector('[data-id="' + id + '"] summary');
  summary?.scrollIntoView({ block: 'center' });
  summary?.focus({ preventScroll: true });
}

function showPanel(showRoadmap) {
  byId('checklist-panel').hidden = showRoadmap;
  byId('roadmap-panel').hidden = !showRoadmap;
  byId('checklist-tab').setAttribute('aria-pressed', String(!showRoadmap));
  byId('roadmap-tab').setAttribute('aria-pressed', String(showRoadmap));
}

function exportProgress() {
  const file = new Blob([JSON.stringify(progressSnapshot(), null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = element('a');
  link.href = url;
  link.download = 'leonida-after-dark-progress.json';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Progress backup exported.');
}

async function importProgress(event) {
  const input = event.target;
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('File too large');
    state = parseProgress(JSON.parse(await file.text()));
    byId('spoilers').checked = state.spoilers;
    updateProgress();
    renderChecklist();
    renderRoadmap();
    if (saveProgress() || preview) notify('Progress backup restored.');
  } catch {
    notify('Could not import that file. Choose a valid Leonida After Dark progress backup.');
  }
}

let state;
let displayOrder;
const openGuides = new Set(shot === 'guide' ? [17] : []);

async function initialize() {
  try {
    const response = await fetch('data/trophies.json');
    if (!response.ok) throw new Error('Trophy data request failed');
    const data = await response.json();
    trophies = data.trophies;
    validIds = new Set(trophies.map(trophy => trophy.id));
    state = readProgress();
    displayOrder = shot === 'guide'
      ? [trophies.find(trophy => trophy.id === 17), ...trophies.filter(trophy => trophy.id !== 17)]
      : trophies;

    byId('spoilers').checked = state.spoilers;
    if (shot === 'filters') byId('kind').value = 'story';
    byId('search').addEventListener('input', renderChecklist);
    byId('kind').addEventListener('change', renderChecklist);
    byId('grade').addEventListener('change', renderChecklist);
    byId('spoilers').addEventListener('change', event => {
      state.spoilers = event.target.checked;
      notify('');
      saveProgress();
      renderChecklist();
      renderRoadmap();
    });
    byId('checklist-tab').addEventListener('click', () => showPanel(false));
    byId('roadmap-tab').addEventListener('click', () => showPanel(true));
    byId('open-route').addEventListener('click', () => {
      showPanel(true);
      byId('roadmap-tab').focus();
    });
    byId('export').addEventListener('click', exportProgress);
    byId('import-button').addEventListener('click', () => byId('import').click());
    byId('import').addEventListener('change', importProgress);

    updateProgress();
    renderChecklist();
    renderRoadmap();
    showPanel(shot === 'roadmap');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  } catch {
    notify('Could not load the trophy guide. Reload the page to try again.');
    byId('checklist-panel').hidden = true;
    byId('roadmap-panel').hidden = true;
  }
}

initialize();

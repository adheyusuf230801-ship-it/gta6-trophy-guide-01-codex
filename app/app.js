'use strict';

const get = id => document.getElementById(id);
const shot = new URLSearchParams(location.search).get('shot');
const preview = ['checklist', 'guide', 'roadmap', 'filters'].includes(shot);
const storageKey = 'leonida-after-dark.progress.v1';
const openGuides = new Set(shot === 'guide' ? [17] : []);
let trophies = [];
let knownIds = new Set();
let earned = new Set();
let spoilers = false;

window.__shotReady = false;

function element(tag, content = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function report(message) {
  get('status').textContent = message;
}

function backup() {
  return { version: 1, earned: [...earned].sort((a, b) => a - b), spoilers };
}

function restore(data) {
  if (data?.version !== 1 || typeof data.spoilers !== 'boolean' ||
      !Array.isArray(data.earned) || !data.earned.every(id => knownIds.has(id))) {
    throw new Error('Invalid progress backup');
  }
  earned = new Set(data.earned);
  spoilers = data.spoilers;
}

function save() {
  if (preview) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(backup()));
  } catch {
    report('Browser storage is unavailable. Export a backup to keep your progress.');
  }
}

function revealStatus() {
  const total = trophies.length;
  get('progress').textContent = earned.size + ' of ' + total + ' earned';
  get('percent').textContent = Math.floor(earned.size * 100 / total) + '%';
  get('bar').max = total;
  get('bar').value = earned.size;
}

function concealed(trophy) {
  return spoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

function trophyCard(trophy) {
  const hidden = concealed(trophy);
  const title = hidden ? 'Hidden story trophy' : trophy.name;
  const card = element('article', '', 'trophy');
  card.classList.toggle('earned', earned.has(trophy.id));
  card.dataset.trophy = trophy.id;

  const line = element('div', '', 'trophy-line');
  const check = element('input');
  check.type = 'checkbox';
  check.checked = earned.has(trophy.id);
  check.setAttribute('aria-label', 'Earned: ' + title);
  check.addEventListener('change', () => {
    if (check.checked) earned.add(trophy.id);
    else earned.delete(trophy.id);
    save();
    revealStatus();
    if (spoilers && trophy.kind === 'story') {
      renderCards();
      renderRoute();
      (get('cards').querySelector('[data-trophy="' + trophy.id + '"] input') ?? get('search')).focus();
    } else {
      card.classList.toggle('earned', check.checked);
    }
  });

  const text = element('div');
  text.append(element('h3', title), element('p', hidden ? 'Mark earned to reveal the name and guide.' : trophy.description));
  const badges = element('div', '', 'badges');
  badges.append(element('span', trophy.grade, 'badge ' + trophy.grade));
  if (trophy.missable) badges.append(element('span', 'Missable', 'badge risk'));
  line.append(check, text, badges);
  card.append(line);

  if (!hidden) {
    const details = element('details');
    details.open = openGuides.has(trophy.id);
    details.addEventListener('toggle', () => {
      if (!details.isConnected) return;
      if (details.open) openGuides.add(trophy.id);
      else openGuides.delete(trophy.id);
    });
    details.append(
      element('summary', 'Read guide'),
      element('p', trophy.guide, 'guide'),
      element('p', 'Source · ' + trophy.sources.join(' · '), 'source')
    );
    card.append(details);
  }
  return card;
}

function renderCards() {
  const search = get('search').value.trim().toLocaleLowerCase('en');
  const kind = get('kind').value;
  const grade = get('grade').value;
  const matches = trophies.filter(trophy =>
    (!kind || (kind === 'missable' ? trophy.missable : trophy.kind === kind)) &&
    (!grade || trophy.grade === grade) &&
    (!search || (!concealed(trophy) && trophy.name.toLocaleLowerCase('en').includes(search)))
  );
  get('results').textContent = matches.length + ' / ' + trophies.length + ' TROPHIES';
  get('cards').replaceChildren(...matches.map(trophyCard));
  if (!matches.length) get('cards').append(element('p', 'No trophies match these filters. Try clearing a filter.'));
}

function showRoadmap(show) {
  get('list-view').hidden = show;
  get('route-view').hidden = !show;
  get('roadmap').setAttribute('aria-pressed', show);
  get('checklist').setAttribute('aria-pressed', !show);
}

function openWarning(id) {
  get('search').value = '';
  get('kind').value = 'missable';
  get('grade').value = '';
  openGuides.add(id);
  renderCards();
  showRoadmap(false);
  get('cards').querySelector('[data-trophy="' + id + '"] summary')?.focus();
}

function renderRoute() {
  const order = [3, 4, 5, 6, 7];
  const storyNames = ids => ids.map(id => trophies.find(trophy => trophy.id === id))
    .map(trophy => concealed(trophy) ? 'Hidden' : trophy.chapter).join(' → ');
  const missionIds = trophies.filter(trophy => trophy.kind === 'story' && !order.includes(trophy.id));
  const missionNames = missionIds.filter(trophy => !concealed(trophy)).map(trophy => trophy.chapter);
  const missions = missionNames.length < missionIds.length ? [...missionNames, 'hidden missions'] : missionNames;
  const stages = [
    ['Play the story', storyNames(order) + '.', 'Watch for named missions along the way: ' + missions.join(', ') + '. Their chapter order is unconfirmed.'],
    ['Finish stranger missions', 'Complete 8 strands in Leonida and finish the final jobs for Andy, Kenton, Billy, Randy and Tyrone.', 'Check Bret’s hunt and Cal’s fishing challenge as they appear.'],
    ['Clear activities', 'Finish 250 stunts, win 20 different races and complete 50 Challenges.', 'Gold all 42 Shooting Range challenges, win at each drone venue and try every activity type.'],
    ['Sweep for collectibles', 'Finish 3 card sets, log 100 WAiNK locations and discover 100 vehicles.', 'Meditate at every spot and use the map to finish your Leonida exploration.'],
    ['Finish cleanup', 'Register 10 Scooter Bros vehicles and review vaults, spending and garages.', 'Reach 100% game completion and verify the remaining PS5 awards for platinum.']
  ];
  get('stages').replaceChildren(...stages.map(([title, goal, note]) => {
    const stage = element('li');
    stage.append(element('h3', title), element('p', goal), element('p', note));
    return stage;
  }));

  // Put possible one-time choices first. The list cannot establish when these cues unlock.
  const cues = [48, 47, 37, 38, 44, 45, 46, 49, 50, 33, 34, 36, 39, 51];
  const risks = trophies.filter(trophy => trophy.missable);
  const priority = id => cues.includes(id) ? cues.indexOf(id) : cues.length;
  risks.sort((a, b) => priority(a.id) - priority(b.id));
  get('risk-count').textContent = risks.length + ' TO WATCH';
  get('warnings').replaceChildren(...risks.map(trophy => {
    const warning = element('article', '', 'warning');
    const title = element('h3', trophy.name);
    title.append(element('span', 'Missable', 'badge risk'));
    const button = element('button', 'Open checklist guide');
    button.type = 'button';
    button.addEventListener('click', () => openWarning(trophy.id));
    warning.append(title, element('p', trophy.guide), button);
    return warning;
  }));
}

function exportProgress() {
  const file = new Blob([JSON.stringify(backup(), null, 2)], { type: 'application/json' });
  const address = URL.createObjectURL(file);
  const download = element('a');
  download.href = address;
  download.download = 'leonida-after-dark-progress.json';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(address), 1000);
  report('Progress backup exported.');
}

async function importProgress(event) {
  const picker = event.currentTarget;
  const file = picker.files[0];
  picker.value = '';
  if (!file) return;
  try {
    if (file.size > 65536) throw new Error('Backup too large');
    restore(JSON.parse(await file.text()));
  } catch {
    report('Could not import this file. Choose a valid Leonida After Dark progress backup.');
    return;
  }
  report('Progress restored.');
  save();
  redraw();
}

function redraw() {
  get('spoilers').checked = spoilers;
  revealStatus();
  renderCards();
  renderRoute();
}

function boot() {
  if (window.localTrophyCatalog?.length !== 55) {
    report('The trophy catalog could not be loaded.');
    return;
  }
  trophies = [...window.localTrophyCatalog];
  knownIds = new Set(trophies.map(trophy => trophy.id));
  if (preview) {
    document.body.dataset.shot = shot;
    spoilers = shot === 'filters';
    if (spoilers) get('kind').value = 'story';
    if (shot === 'guide') trophies.sort((a, b) => Number(b.id === 17) - Number(a.id === 17));
  } else {
    try {
      const previous = localStorage.getItem(storageKey);
      if (previous) restore(JSON.parse(previous));
    } catch {
      report('Saved progress is unavailable. You can import a backup.');
    }
  }

  get('search').addEventListener('input', renderCards);
  get('kind').addEventListener('change', renderCards);
  get('grade').addEventListener('change', renderCards);
  get('spoilers').addEventListener('change', event => {
    spoilers = event.currentTarget.checked;
    save();
    redraw();
  });
  get('checklist').addEventListener('click', () => showRoadmap(false));
  get('roadmap').addEventListener('click', () => showRoadmap(true));
  get('route-link').addEventListener('click', () => {
    showRoadmap(true);
    get('roadmap').focus();
  });
  get('export').addEventListener('click', exportProgress);
  get('import').addEventListener('click', () => get('backup-file').click());
  get('backup-file').addEventListener('change', importProgress);
  redraw();
  showRoadmap(shot === 'roadmap');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

boot();

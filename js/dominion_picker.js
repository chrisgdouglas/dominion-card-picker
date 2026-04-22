// Validates form selections, gathers candidate card IDs, randomly picks 10-15,
// then renders the result tables. Card data and pre-gen sets come from
// js/card_data.js (window.cards, window.preGenSets).

const { cards, preGenSets } = window;

const CARD_SETS = [
  'base', 'intrigue', 'seaside', 'alchemy', 'prosperity',
  'cornucopia', 'hinterlands', 'darkages', 'guilds',
];

const PROMO_NAMES = {
  envoy: 'Envoy',
  blackMarket: 'Black Market',
  stash: 'Stash',
  walledvillage: 'Walled Village',
  governor: 'Governor',
};

const REACTION_SETS = ['base', 'intrigue', 'prosperity', 'cornucopia', 'hinterlands', 'darkages'];

const SMART_REACTIONS = {
  prosperity: {
    cards: ['Watchtower'],
    triggers: new Set([
      'Witch', 'Saboteur', 'Swindler', 'Ambassador', 'Sea Hag', 'Familiar',
      'Young Witch', 'Jester', 'Tournament', 'Noble Brigand', 'Soothsayer',
    ]),
  },
};

const HINTERLANDS_BOTH = new Set([
  'Torturer', 'Sea Hag', 'Familiar', 'Mountebank', 'Jester', 'Tournament', 'Noble Brigand',
]);
const HINTERLANDS_TUNNEL_ONLY = new Set([
  'Witch', 'Saboteur', 'Swindler', 'Ambassador', 'Scrying Pool',
  'Young Witch', 'Oracle', 'Pillage',
]);
const DARKAGES_BEGGAR = new Set([
  'Militia', 'Spy', 'Thief', 'Minion', 'Saboteur', 'Pirate ship', 'Sea Hag',
  'Scrying Pool', 'Rabble', 'Jester', 'Margrave', 'Noble Brigand',
  'Oracle', 'Rogue', 'Taxman',
]);
const DARKAGES_MARKET_SQUARE = new Set(['Saboteur', 'Swindler', 'Noble Brigand', 'Rogue']);

const GAME_TYPE_LABELS = {
  prosperity: 'Colony',
  darkages: 'Shelter',
  looter: 'Looter',
  regularlooter: 'Regular & Looter',
  darkageslooter: 'Shelter & Looter',
  prosperitylooter: 'Colony & Looter',
  prosperitydarkages: 'Colony & Shelter',
  prosperitydarkageslooter: 'Colony & Shelter & Looter',
};

const MAX_PICK_ATTEMPTS = 1000;

// Pre-built lookups — card_data.js is static, these never change.
const CARD_LIST = Object.values(cards);
const CARD_BY_NAME = new Map(CARD_LIST.map((c) => [c.name, c.id]));

// Memoizes determineSets() by checkbox-state signature.
const previousRun = { choice: '', storedSet: [] };

// Alchemy sub-pool cache. Invalidated when the noAttack checkbox changes.
let alchemySet = [];
let alchemySetNoAttack = null;

// Toggle state for the "Select All" checkboxes — avoids reading state from DOM text.
let allSetsSelected = false;
let allPromosSelected = false;

// queryStringConsumed prevents re-applying the URL pre-gen on subsequent random picks.
let queryStringConsumed = false;

const form = () => document.forms.controlForm;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const unique = (arr) => [...new Set(arr)];

const isYoungWitch = (id) => cards[id].name === 'Young Witch';
const isAttack = (id) => cards[id].type === 'Attack';
const isReaction = (id) => cards[id].type === 'Reaction';
const isLooter = (id) => cards[id].subType.includes('looter');
const hasActions = (id) => cards[id].subType.includes('action');
const hasCards = (id) => cards[id].subType.includes('card');
const hasBuy = (id) => cards[id].subType.includes('buy');
const hasCopper = (id) => cards[id].subType.includes('copper');
const isProsperity = (id) => cards[id].set === 'prosperity';
const isDarkages = (id) => cards[id].set === 'darkages';

function getCardId(name) {
  return CARD_BY_NAME.get(name) ?? null;
}

function searchCards(name) {
  const lower = name.toLowerCase();
  return CARD_LIST
    .filter((c) => c.name.toLowerCase().includes(lower))
    .map((c) => c.id);
}

// Returns the checked radio's value, or '0' as a default sentinel.
function selRadio(radioList) {
  const checked = [...radioList].find((r) => r.checked);
  return checked ? checked.value : '0';
}

const compareCardName = (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
const compareCardCost = (a, b) => a.cost - b.cost;
const compareCardSet = (a, b) => a.set.localeCompare(b.set);

function sortCards(ids, sortType) {
  const sorter = { '0': compareCardName, '1': compareCardCost, '2': compareCardSet }[sortType] ?? compareCardName;
  return ids
    .map((id) => cards[id])
    .sort(sorter)
    .map((c) => c.id);
}

// Returns true when no other major sets are checked alongside setID, used to
// force variant rules. guilds is included so Prosperity+Guilds doesn't force Colony.
function noneChecked(setID) {
  const f = form();
  const others = {
    prosperity: ['hinterlands', 'cornucopia', 'alchemy', 'seaside', 'intrigue', 'base', 'darkages', 'guilds'],
    darkages: ['hinterlands', 'cornucopia', 'alchemy', 'seaside', 'intrigue', 'base', 'prosperity', 'guilds'],
    alchemy: ['hinterlands', 'cornucopia', 'seaside', 'intrigue', 'base', 'prosperity', 'darkages', 'guilds'],
  }[setID];
  if (!others) return true;
  return !others.some((s) => f[s].checked);
}

function checkForm() {
  const f = form();
  if (!CARD_SETS.some((s) => f[s].checked)) {
    alert('Please choose a cardset.');
    return false;
  }
  if (!f.base.checked && !f.intrigue.checked && !f.prosperity.checked && f.attackBalance.checked) {
    if (f.seaside.checked || f.alchemy.checked) {
      if (!confirm('Your selected card set does not have a reaction card..\nContinue without balancing attack/reaction?')) {
        return false;
      }
      f.attackBalance.checked = false;
    }
  }
  if ((f.attackBalance.checked || f.smartAttackBalance.checked) && f.noAttack.checked) {
    alert('Your selected card set will not have any Attack cards. Attack Balance disabled.');
    f.attackBalance.checked = false;
    f.smartAttackBalance.checked = false;
  }
  if (f.attackBalance.checked && f.smartAttackBalance.checked) {
    alert('Please choose only one attack balance feature.');
    f.attackBalance.checked = false;
    f.smartAttackBalance.checked = false;
    return false;
  }
  if (f.randomAlchemy.checked && !f.alchemy.checked) {
    if (confirm("You've selected the optional Alchemy set rules, but have not selected the Alchemy set.\nSelect Alchemy set?")) {
      f.alchemy.checked = true;
    }
  }
  if (noneChecked('alchemy') && f.randomAlchemy.checked) {
    f.randomAlchemy.checked = false;
  }
  if (noneChecked('alchemy') && f.mustCoppers.checked) {
    alert('Alchemy does not have a +2 (or more) Copper card. A valid set cannot be returned. Please make a different selection.');
    return false;
  }
  return true;
}

function determineSets() {
  const f = form();
  const noAttack = f.noAttack.checked;
  const useRandomAlchemy = f.alchemy.checked && f.randomAlchemy.checked;

  const checkedSets = new Set(
    CARD_SETS.filter((s) => f[s].checked && !(s === 'alchemy' && useRandomAlchemy))
  );
  if (f.custom?.checked) checkedSets.add('custom');
  const checkedPromos = new Set(
    Object.entries(PROMO_NAMES)
      .filter(([key]) => f[key]?.checked)
      .map(([, name]) => name)
  );

  // Use '|' separator to prevent value concatenation collisions (e.g. "1"+"32" vs "13"+"2").
  const signature = [...f.elements]
    .filter((el) => el.type === 'checkbox' && el.checked)
    .map((el) => el.value)
    .join('|');

  if (signature === previousRun.choice) return [...previousRun.storedSet];

  const result = CARD_LIST
    .filter((c) => {
      if (checkedPromos.has(c.name)) return true;
      if (!checkedSets.has(c.set)) return false;
      if (noAttack && c.type === 'Attack') return false;
      return true;
    })
    .map((c) => c.id);

  previousRun.choice = signature;
  previousRun.storedSet = result;
  return [...result];
}

function getAlchemySet() {
  const f = form();
  return CARD_LIST
    .filter((c) => c.set === 'alchemy' && (!f.noAttack.checked || c.type !== 'Attack'))
    .map((c) => c.id);
}

// Returns the alchemy sub-pool, rebuilding if noAttack state has changed since last call.
function getOrRefreshAlchemySet() {
  const noAttack = form().noAttack.checked;
  if (alchemySet.length === 0 || alchemySetNoAttack !== noAttack) {
    alchemySet = getAlchemySet();
    alchemySetNoAttack = noAttack;
  }
  return alchemySet;
}

// Picks `count` unique random IDs from `pool`. Throws if pool is too small.
function genCards(pool, count) {
  if (count > pool.length) {
    throw new Error(`Cannot pick ${count} unique cards from pool of ${pool.length}.`);
  }
  const picked = new Set();
  while (picked.size < count) {
    picked.add(randomChoice(pool));
  }
  return [...picked];
}

function pickAlchemyMix(selectedSets, total) {
  const alchPool = getOrRefreshAlchemySet();
  // alchCount fixed before the retry loop so each attempt uses the same proportion.
  const alchCount = Math.min(Math.floor(Math.random() * 3) + 3, alchPool.length); // 3-5 capped
  const remaining = total - alchCount;
  let mix = [];
  let attempts = 0;
  while (mix.length < total) {
    if (++attempts > MAX_PICK_ATTEMPTS) break;
    mix = unique([
      ...genCards(alchPool, alchCount),
      ...genCards(selectedSets, remaining),
    ]);
  }
  return mix;
}

function addReactionCards() {
  const f = form();
  const list = CARD_LIST
    .filter((c) => REACTION_SETS.includes(c.set) && f[c.set].checked && c.type === 'Reaction')
    .map((c) => c.id);
  if (f.custom?.checked) {
    CARD_LIST
      .filter((c) => c.set === 'custom' && c.type === 'Reaction')
      .forEach((c) => list.push(c.id));
  }
  return list;
}

function smartAttackBalance(selectedCards) {
  const f = form();
  const result = [];
  // Deduplicate attack names so identical attack cards don't repeat rule evaluation.
  const attackNames = [...new Set(selectedCards.filter(isAttack).map((id) => cards[id].name))];
  for (const name of attackNames) {
    if (f.base.checked) result.push(getCardId('Moat'));
    if (f.intrigue.checked) result.push(getCardId('Secret Chamber'));
    if (f.seaside.checked) result.push(getCardId('Lighthouse'));
    if (f.cornucopia.checked) result.push(getCardId('Horse Traders'));
    if (f.prosperity.checked && SMART_REACTIONS.prosperity.triggers.has(name)) {
      result.push(getCardId('Watchtower'));
    }
    if (f.hinterlands.checked) {
      if (HINTERLANDS_BOTH.has(name)) {
        result.push(getCardId('Tunnel'), getCardId('Trader'));
      } else if (HINTERLANDS_TUNNEL_ONLY.has(name)) {
        result.push(getCardId('Tunnel'));
      } else {
        result.push(getCardId('Trader'));
      }
    }
    if (f.darkages.checked) {
      if (DARKAGES_BEGGAR.has(name)) result.push(getCardId('Beggar'));
      if (DARKAGES_MARKET_SQUARE.has(name)) result.push(getCardId('Market Square'));
    }
  }
  // Filter nulls in case a named card is absent from card_data.js.
  return unique(result.filter((id) => id !== null));
}

function checkSetOptions(genSet) {
  const f = form();
  const checks = [
    [f.mustActions.checked, hasActions],
    [f.mustCards.checked, hasCards],
    [f.mustBuys.checked, hasBuy],
    [f.mustCoppers.checked, hasCopper],
  ];
  return checks.every(([enabled, fn]) => !enabled || genSet.some(fn));
}

function hasCardOptions() {
  const f = form();
  return f.mustActions.checked || f.mustCards.checked || f.mustBuys.checked || f.mustCoppers.checked;
}

function injectReaction(picked, reactionId, optionsMode) {
  if (optionsMode) {
    const idx = picked.findIndex((id) => cards[id].subType === '' && cards[id].type !== 'Attack');
    if (idx !== -1) {
      picked[idx] = reactionId;
      return picked;
    }
    // No unconstrained slot — fall through to pop/push so reaction is never silently dropped.
  }
  picked.pop();
  picked.push(reactionId);
  return picked;
}

// Pre-filters eligible bane candidates so the selection loop always terminates.
function pickBaneCard(selectedSets) {
  const eligible = selectedSets.filter((id) => {
    const c = cards[id];
    return (c.cost === 2 || c.cost === 3) && c.subType !== 'potion';
  });
  if (eligible.length === 0) {
    throw new Error('No eligible bane card (cost 2-3, non-potion) found in selected sets.');
  }
  return randomChoice(eligible);
}

function pickCards(numberOfCards) {
  const f = form();
  const selectedSets = determineSets();
  const useRandomAlchemy = f.alchemy.checked && f.randomAlchemy.checked;
  const optionsMode = hasCardOptions();

  let picked;
  let attempts = 0;
  do {
    if (++attempts > MAX_PICK_ATTEMPTS) {
      // Constraints unsatisfiable with the current pool — break with last result.
      break;
    }
    picked = useRandomAlchemy
      ? pickAlchemyMix(selectedSets, numberOfCards)
      : genCards(selectedSets, numberOfCards);
  } while (optionsMode && !checkSetOptions(picked));

  if (f.attackBalance.checked && picked.some(isAttack) && !picked.some(isReaction)) {
    const reactionCards = addReactionCards();
    if (reactionCards.length > 0) {
      picked = injectReaction(picked, randomChoice(reactionCards), optionsMode);
    }
  }
  if (f.smartAttackBalance.checked && picked.some(isAttack)) {
    const reactionCards = smartAttackBalance(picked);
    const overlap = reactionCards.some((id) => picked.includes(id));
    if (!overlap && reactionCards.length > 0) {
      picked = injectReaction(picked, randomChoice(reactionCards), optionsMode);
    }
  }

  picked = sortCards(picked, selRadio(f.sortOption));

  if (f.cornucopia.checked && picked.some(isYoungWitch)) {
    picked.push(pickBaneCard(selectedSets));
  }
  return picked;
}

function preGenCards(selVal) {
  const pointer = parseInt(selVal, 10);
  const set = preGenSets[pointer] ?? preGenSets[1];
  return set.preGenSet;
}

function pickGameType(finalCards, chosenSet) {
  const id = randomChoice(finalCards);
  return cards[id].set === chosenSet ? chosenSet : '';
}

function gameType(finalCards) {
  let result = 'regular';
  const hasProsperity = finalCards.some(isProsperity);
  const hasDarkages = finalCards.some(isDarkages);

  if (hasProsperity && noneChecked('prosperity')) result = 'prosperity';
  if (hasDarkages && noneChecked('darkages')) result = 'darkages';

  if (result === 'regular') {
    if (hasProsperity && pickGameType(finalCards, 'prosperity')) result = 'prosperity';
    if (hasDarkages) {
      const dark = pickGameType(finalCards, 'darkages');
      if (dark) result = result.includes('prosperity') ? `${result}darkages` : dark;
    }
  }
  if (finalCards.some(isLooter)) result += 'looter';

  return GAME_TYPE_LABELS[result] ?? 'Regular';
}

function clearTable() {
  const content = document.getElementById('content');
  content.style.display = 'none';
  document.getElementById('cardDisplay')?.remove();
  document.getElementById('banePile')?.remove();
}

function makeCardCell(cardObj) {
  const div = document.createElement('div');
  div.className = `card-cell set-${cardObj.set}`;
  const imgSrc = cardObj.set === 'custom' ? 'cards/000.png' : `cards/${cardObj.id}.jpg`;
  const title = `${cardObj.name} — Cost: ${cardObj.cost} — Set: ${cardObj.set}`;

  if (cardObj.set === 'custom') {
    div.classList.add('custom');
    div.style.backgroundImage = `url(${imgSrc})`;
    const span = document.createElement('span');
    span.innerHTML = `${cardObj.name}<br />Cost: ${cardObj.cost}<br />Type: ${cardObj.type}`;
    div.appendChild(span);
  } else {
    const img = new Image(148, 228);
    img.src = imgSrc;
    img.alt = title;
    img.title = title;
    div.appendChild(img);
  }
  return div;
}

function makeTable(finalCards, generateNumber, cardLoopCounter) {
  const grid = document.createElement('div');
  grid.id = 'cardDisplay';
  grid.className = 'card-grid';
  for (let i = 0; i < cardLoopCounter; i++) {
    grid.appendChild(makeCardCell(cards[finalCards[i]]));
  }
  return grid;
}

function ywTable(finalCards, baneIndex) {
  const section = document.createElement('div');
  section.id = 'banePile';
  section.className = 'bane-section';
  const label = document.createElement('div');
  label.className = 'bane-label';
  label.textContent = 'Bane Pile';
  section.appendChild(label);
  const baneCard = document.createElement('div');
  baneCard.className = 'bane-card';
  baneCard.appendChild(makeCardCell(cards[finalCards[baneIndex]]));
  section.appendChild(baneCard);
  return section;
}

function displayPicks(selObj) {
  const f = form();
  const gameTypeElement = document.getElementById('gameType');
  let generateNumber = 10;
  let finalCards;

  if (location.search && !queryStringConsumed) {
    finalCards = preGenCards(location.search.substring(1));
    queryStringConsumed = true;
  } else if (selObj) {
    const selVal = selObj.value;
    if (selVal === '0') {
      alert('Please choose a card build!');
      return;
    }
    finalCards = preGenCards(selVal);
  } else {
    if (!checkForm()) return;
    generateNumber = parseInt(f.numberOfCards.value, 10);
    finalCards = pickCards(generateNumber);
  }

  const ywFlag = finalCards.some(isYoungWitch);
  const cardLoopCounter = ywFlag ? generateNumber : finalCards.length;

  if (document.getElementById('cardDisplay')) clearTable();

  const content = document.getElementById('content');
  content.appendChild(makeTable(finalCards, generateNumber, cardLoopCounter));
  if (ywFlag) content.appendChild(ywTable(finalCards, cardLoopCounter));

  const type = gameType(finalCards);
  gameTypeElement.textContent = type;
  gameTypeElement.className = `game-type-badge ${type === 'Regular' ? 'regular' : 'red'}`;
  content.style.display = 'block';
}

function createPreGenMenu() {
  const preGenLoad = location.search ? parseInt(location.search.substring(1), 10) : 0;
  const select = document.createElement('select');
  select.name = 'preGen';
  select.add(new Option('Choose your Cardset', '0'));

  for (const key of Object.keys(preGenSets)) {
    const set = preGenSets[key];
    const opt = new Option(`${key}: ${set.name} with ${set.cardSet}`, key);
    if (parseInt(key, 10) === preGenLoad) opt.selected = true;
    select.add(opt);
  }

  const container = document.getElementById('preGenContainer');
  container.appendChild(select);

  const goBtn = document.createElement('input');
  goBtn.type = 'button';
  goBtn.value = 'Go';
  goBtn.addEventListener('click', () => displayPicks(form().preGen));
  container.appendChild(goBtn);
  container.style.display = 'flex';
}

function toggleAllSets() {
  const checkboxes = [...form().elements].filter(
    (el) => el.type === 'checkbox' && parseInt(el.value, 10) < 20
  );
  const label = document.getElementById('allCardsText');
  allSetsSelected = !allSetsSelected;
  if (allSetsSelected) {
    checkboxes.forEach((cb) => { cb.checked = true; });
    label.innerHTML = 'Reset&nbsp;Set&nbsp;Selection';
  } else {
    checkboxes.forEach((cb) => { if (cb.value !== '1') cb.checked = false; });
    form().randomAlchemy.checked = false;
    label.innerHTML = 'Select&nbsp;All&nbsp;Sets';
  }
}

function toggleAllPromos() {
  const checkboxes = [...form().elements].filter((el) => {
    if (el.type !== 'checkbox') return false;
    const v = parseInt(el.value, 10);
    return v >= 20 && v <= 30;
  });
  const label = document.getElementById('allPromoCardsText');
  allPromosSelected = !allPromosSelected;
  if (allPromosSelected) {
    checkboxes.forEach((cb) => { cb.checked = true; });
    label.innerHTML = 'Reset&nbsp;set&nbsp;selection';
  } else {
    checkboxes.forEach((cb) => { cb.checked = false; });
    label.innerHTML = 'Select&nbsp;All&nbsp;Promo&nbsp;Cards';
  }
}

function updateThemeToggle(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀' : '☾';
  btn.querySelector('.theme-label').textContent = theme === 'dark' ? 'Light' : 'Dark';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

document.addEventListener('DOMContentLoaded', () => {
  // Theme: read persisted preference (inline script may have already set it, this syncs the button)
  const savedTheme = localStorage.getItem('dominion-theme') ?? 'dark';
  updateThemeToggle(savedTheme);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') ?? 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dominion-theme', next);
    updateThemeToggle(next);
  });

  // Sidebar collapse (persisted; mobile defaults to collapsed)
  const sidebarTrack = document.getElementById('sidebarTrack');
  if (sidebarTrack) {
    const isMobile = window.matchMedia('(max-width: 780px)').matches;
    const stored = localStorage.getItem('dominion-sidebar-collapsed');
    const shouldCollapse = isMobile ? stored !== 'false' : stored === 'true';
    if (shouldCollapse) sidebarTrack.classList.add('collapsed');
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      sidebarTrack.classList.toggle('collapsed');
      localStorage.setItem('dominion-sidebar-collapsed', sidebarTrack.classList.contains('collapsed'));
    });
  }

  // Disable Custom Set if card_data.js has no custom cards
  if (!CARD_LIST.some((c) => c.set === 'custom')) {
    const customCb = document.querySelector('input[name="custom"]');
    if (customCb) customCb.disabled = true;
  }

  createPreGenMenu();
  displayPicks();
  document.getElementById('newRandomBtn').addEventListener('click', () => displayPicks());
  document.getElementById('allSetsToggle').addEventListener('click', toggleAllSets);
  document.getElementById('allPromosToggle').addEventListener('click', toggleAllPromos);
});

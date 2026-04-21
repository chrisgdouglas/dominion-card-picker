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

// Memoizes determineSets() by checkbox-state signature.
const previousRun = { choice: '', storedSet: [] };
let alchemySet = [];
let pageLoaded = false;

const form = () => document.forms.controlForm;
const cardList = () => Object.values(cards);
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
  return cardList().find((c) => c.name === name)?.id ?? null;
}

function searchCards(name) {
  const lower = name.toLowerCase();
  return cardList()
    .filter((c) => c.name.toLowerCase().includes(lower))
    .map((c) => c.id);
}

function selRadio(radioList) {
  const checked = [...radioList].find((r) => r.checked);
  return checked ? checked.value : false;
}

const compareCardName = (a, b) => {
  const x = a.name.toLowerCase();
  const y = b.name.toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
};
const compareCardCost = (a, b) => (a.cost < b.cost ? -1 : a.cost > b.cost ? 1 : 0);
const compareCardSet = (a, b) => (a.set < b.set ? -1 : a.set > b.set ? 1 : 0);

function sortCards(ids, sortType) {
  const sorter = { '0': compareCardName, '1': compareCardCost, '2': compareCardSet }[sortType] ?? compareCardName;
  return ids
    .map((id) => cards[id])
    .sort(sorter)
    .map((c) => c.id);
}

function noneChecked(setID) {
  const f = form();
  const others = {
    prosperity: ['hinterlands', 'cornucopia', 'alchemy', 'seaside', 'intrigue', 'base', 'darkages'],
    darkages: ['hinterlands', 'cornucopia', 'alchemy', 'seaside', 'intrigue', 'base', 'prosperity'],
    alchemy: ['hinterlands', 'cornucopia', 'seaside', 'intrigue', 'base', 'prosperity'],
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

  const signature = [...f.elements]
    .filter((el) => el.type === 'checkbox' && el.checked)
    .map((el) => el.value)
    .join('');

  if (signature === previousRun.choice) return previousRun.storedSet;

  const result = cardList()
    .filter((c) => {
      const isPromo = checkedPromos.has(c.name);
      if (isPromo) return true;
      if (!checkedSets.has(c.set)) return false;
      if (noAttack && c.type === 'Attack') return false;
      return true;
    })
    .map((c) => c.id);

  previousRun.choice = signature;
  previousRun.storedSet = result;
  return result;
}

function getAlchemySet() {
  const f = form();
  return cardList()
    .filter((c) => c.set === 'alchemy' && (!f.noAttack.checked || c.type !== 'Attack'))
    .map((c) => c.id);
}

function genCards(pool, count) {
  const picked = new Set();
  while (picked.size < count) {
    picked.add(randomChoice(pool));
  }
  return [...picked];
}

function pickAlchemyMix(selectedSets, total) {
  if (alchemySet.length === 0) alchemySet = getAlchemySet();
  let mix = [];
  while (mix.length < total) {
    const alchCount = Math.floor(Math.random() * 3) + 3; // 3-5
    const remaining = total - alchCount;
    mix = unique([
      ...genCards(alchemySet, alchCount),
      ...genCards(selectedSets, remaining),
    ]);
  }
  return mix;
}

function addReactionCards() {
  const f = form();
  const list = cardList()
    .filter((c) => REACTION_SETS.includes(c.set) && f[c.set].checked && c.type === 'Reaction')
    .map((c) => c.id);
  // NOTE: original picker pushes non-Reaction custom cards here (likely a bug,
  // condition was `type !== "Reaction"` instead of `===`). Behavior preserved.
  if (f.custom?.checked) {
    cardList()
      .filter((c) => c.set === 'custom' && c.type !== 'Reaction')
      .forEach((c) => list.push(c.id));
  }
  return list;
}

function smartAttackBalance(selectedCards) {
  const f = form();
  const result = [];
  const attackCards = selectedCards.filter(isAttack);
  for (const id of attackCards) {
    const name = cards[id].name;
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
  return unique(result);
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
    if (idx !== -1) picked[idx] = reactionId;
  } else {
    picked.pop();
    picked.push(reactionId);
  }
  return picked;
}

function pickBaneCard(selectedSets) {
  while (true) {
    const id = randomChoice(selectedSets);
    const c = cards[id];
    if ((c.cost === 2 || c.cost === 3) && c.subType !== 'potion') return c.id;
  }
}

function pickCards(numberOfCards) {
  const f = form();
  const selectedSets = determineSets();
  const useRandomAlchemy = f.alchemy.checked && f.randomAlchemy.checked;
  const optionsMode = hasCardOptions();

  let picked;
  do {
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
  const td = document.createElement('td');
  td.className = `card-cell set-${cardObj.set}`;
  const imgSrc = cardObj.set === 'custom' ? 'cards/000.png' : `cards/${cardObj.id}.jpg`;
  const title = ` Card Name: ${cardObj.name} Cost: ${cardObj.cost} Set: ${cardObj.set}`;

  if (cardObj.set === 'custom') {
    td.classList.add('custom');
    td.style.backgroundImage = `url(${imgSrc})`;
    const span = document.createElement('span');
    span.innerHTML = `${cardObj.name}<br />Cost: ${cardObj.cost}<br />Card Type: ${cardObj.type}`;
    td.appendChild(span);
  } else {
    const img = new Image(148, 228);
    img.src = imgSrc;
    img.alt = title;
    img.title = title;
    td.appendChild(img);
  }
  return td;
}

function makeTable(finalCards, generateNumber, cardLoopCounter) {
  const table = document.createElement('table');
  table.id = 'cardDisplay';
  table.className = generateNumber > 10 ? 'card-table card-table-large' : 'card-table';
  let row;
  for (let i = 0; i < cardLoopCounter; i++) {
    if (i % 5 === 0) {
      row = document.createElement('tr');
      table.appendChild(row);
    }
    row.appendChild(makeCardCell(cards[finalCards[i]]));
  }
  return table;
}

function ywTable(finalCards, baneIndex) {
  const table = document.createElement('table');
  table.id = 'banePile';
  table.className = 'bane-table';
  const row = document.createElement('tr');
  const titleTd = document.createElement('td');
  titleTd.className = 'bane-title';
  titleTd.textContent = 'Bane Pile';
  row.appendChild(titleTd);
  row.appendChild(makeCardCell(cards[finalCards[baneIndex]]));
  table.appendChild(row);
  return table;
}

function displayPicks(selObj) {
  const f = form();
  const gameTypeElement = document.getElementById('gameType');
  let generateNumber = 10;
  let finalCards;

  if (location.search && !pageLoaded) {
    finalCards = preGenCards(location.search.substring(1));
    pageLoaded = true;
  } else if (selObj) {
    const selVal = selObj[selObj.selectedIndex].value;
    if (selVal === '0') {
      alert('Please choose a card build!');
      return false;
    }
    finalCards = preGenCards(selVal);
  } else {
    if (!checkForm()) return false;
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
  gameTypeElement.className = type === 'Regular' ? 'regular' : 'red';
  content.style.display = 'block';
  return true;
}

function createPreGenMenu() {
  const preGenLoad = location.search ? parseInt(location.search.substring(1), 10) : 0;
  const select = document.createElement('select');
  select.name = 'preGen';
  select.options[0] = new Option('Choose your Cardset', '0');

  for (const key of Object.keys(preGenSets)) {
    const set = preGenSets[key];
    const opt = new Option(`${key}: ${set.name} with ${set.cardSet}`, key);
    if (parseInt(key, 10) === preGenLoad) opt.selected = true;
    select.options[select.options.length] = opt;
  }

  const container = document.getElementById('preGenContainer');
  container.appendChild(select);

  const goBtn = document.createElement('input');
  goBtn.type = 'button';
  goBtn.value = 'Go';
  goBtn.addEventListener('click', () => displayPicks(form().preGen));
  container.appendChild(goBtn);
  container.style.display = 'inline';
}

function toggleAllSets() {
  const checkboxes = [...form().elements].filter(
    (el) => el.type === 'checkbox' && parseInt(el.value, 10) < 20
  );
  const label = document.getElementById('allCardsText');
  if (label.innerHTML === 'Select&nbsp;All&nbsp;Sets') {
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
  if (label.innerHTML === 'Select&nbsp;All&nbsp;Promo&nbsp;Cards') {
    checkboxes.forEach((cb) => { cb.checked = true; });
    label.innerHTML = 'Reset&nbsp;set&nbsp;selection';
  } else {
    checkboxes.forEach((cb) => { cb.checked = false; });
    label.innerHTML = 'Select&nbsp;All&nbsp;Promo&nbsp;Cards';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createPreGenMenu();
  displayPicks();
  document.getElementById('newRandomBtn').addEventListener('click', () => displayPicks());
  document.getElementById('allSetsToggle').addEventListener('click', toggleAllSets);
  document.getElementById('allPromosToggle').addEventListener('click', toggleAllPromos);
});

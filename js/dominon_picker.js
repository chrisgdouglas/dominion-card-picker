// This script validates the form selections, gets the cardset, randomly chooses 10-16 cards, and dynamically creates the display
/*
Version History
	v1.0 - release
	v1.5 - added sort options
	v1.6 - added location.search pre-gen selection
	v1.7 - stores selected card sets so determineSets() only executes if there's been a card set option change
	v2.0 - added >10 generation, young witches table with bane card
	v2.1 - added No Attack card options
	v2.2 - fixed governor card not being selected and added select all features
	v2.3 - enabled an option for filtered reaction cards from the selected card sets that best represents a beneficial reaction to the attack
	v2.4 - fixed young witch card selection set & added support for custom sets for the offline version
	v2.5 - added support for Colony games
	v2.5.1 - removed Potion cards from Bane selection
	v2.5.2 - corrected error with Custom cards that would always choose "attack" cards even if the no attack option was enabled
	v2.6 - used new array features for performance increase, added support for multiple game types (regular, colony, shelters, etc)
	v2.7 - added alchemy set logic. If alchemy is selected, there will be 3-5 alchemy cards forced into the set. Also allows for an alchemy only game.
	v2.7.1 - added option for full random alchemy selection
	v2.7.2 - reverted full alchemy selection as default behaviour with the recommended 3-5 selection as an option
	v2.7.3 - fixed up game selection logic to properly select & display game type combinations
	v2.7.4 - added Smart Reactions for Dark Ages attack & reaction cards
	v2.8 - Added forced card selection feature, moved set generation to it's own function, minor visual improvements.
	v2.8.1 - moved table generators and game type selectors to their own functions, minor improvements in card selection logic.
	v2.8.2 - added Guilds card set.
*/

// Declare global variables
var previousRun = { 1 : { choice: '', storedSet: ''}};  //stores the form selections and card selection. Used to determine if determineSets() needs to executre again
// var allCardCount = cardsInSet(); // counts all the cards and provides the id number for the last one.
var alchemySet = []; // set a global variable for the alchemy set, so it only needs to get the cards once.
var pageLoaded = false;

function displayPicks(selObj) {
	var gameTypeElement = document.getElementById("gameType"), f = document.controlForm, generateNumber = 10,thisGameType; // default card number to generate, set for the pre-gens so the bane table renders properly if needed
	if (location.search && !pageLoaded) { // load pregen card set, where the pregen ID is taken from location.search
		finalCards = preGenCards(location.search.substring(1,location.search.length));
		pageLoaded = true; // loaded the pregen set so there's no need to do it anymore. This allows other random selection or pregens to be viewed
	} else if (arguments.length !== 0) { // Check to see if the form passed any values to this function. Only the pregen click action does this.
		selVal = selObj[selObj.selectedIndex].value;
		if (selVal !== "0") {  // make sure a valid selection has been made
			finalCards = preGenCards(selVal);
		} else {
		alert("Please choose a card build!");
		return false;
		}
	} else {
		if (checkForm()) { // make sure the checkbox selections don't contain any errors.
			generateNumber = parseInt(f.numberOfCards[f.numberOfCards.selectedIndex].value,10); //check to see how many cards to generate, convert it to a base 10 integer because it comes from the <option> tag as a string
			finalCards = pickCards(generateNumber); // grab the tableaux!
		} else {
			return false; // form error; abort.
		}
	}
	ywFlag = finalCards.some(isYoungWitch); //checks to see if there's a young witch & bane card in the set
	if (ywFlag) {  //if the Young Witch is selected, make sure the bane card is displayed
		cardLoopCounter = generateNumber;
	} else {  // no young witch, so just display the number of cards selected.
		cardLoopCounter = finalCards.length;
	}
	if (document.getElementById('cardDisplay') !== null) {  // if the table(s) already exist, clear it.
		clearTable();
	}
	document.getElementById('content').appendChild(makeTable(finalCards,generateNumber,cardLoopCounter)); // attach the table to the DIV container
	if (ywFlag) {  //create another table to display the bane pile
		document.getElementById('content').appendChild(ywTable(finalCards)); // attach the table to the DIV container		
	}
	thisGameType = gameType(finalCards); // Determine game type, add it to the display and color it appropriately.
	gameTypeElement.innerHTML = thisGameType;
	if (thisGameType === "Regular") {
		gameTypeElement.className = "regular";
	} else {
		gameTypeElement.className = "red";
	}
	document.getElementById('content').style.display = "block"; // all loaded, turn on the display.
}

// Dynamically create the pre-gen drop down list
function createPreGenMenu() {
	if (location.search) { // if there's a pre-selected set on page load, make sure that the drop down matches the set.
		var preGenLoad = parseInt(location.search.substring(1,location.search.length),10);
	} else {
		var preGenLoad = 0;
	}
	var preGenSelect = document.createElement('select');  // create the select box
		preGenSelect.name = "preGen";
		preGenSelect.options[0] = new Option("Choose your Cardset",0,1,0); 
	for (var x in preGenSets) { // load the options from the pregen sets
		var optionText = x + ": " + preGenSets[x].name + " with " + preGenSets[x].cardSet;
		if (x === preGenLoad) {
			preGenSelect.options[x] = new Option(optionText, x,0,1);
		} else {
			preGenSelect.options[x] = new Option(optionText, x,0,0);
		}
	}
	document.getElementById('preGenContainer').appendChild(preGenSelect); // attach it to the DOM
	var preGenButton = document.createElement('input'); // create an input button with an onClick event to call the scripting
		preGenButton.name = "preGenInputButton";
		preGenButton.value = "Go";
		preGenButton.setAttribute('type','button');
		preGenButton.onclick = function(){displayPicks(document.controlForm.preGen);};
	document.getElementById('preGenContainer').appendChild(preGenButton); // attach it to the DOM
	document.getElementById('preGenContainer').style.display="inline"; // display the DOM element now that it is created.
}

function preGenCards(selVal) {
	var pointer = parseInt(selVal,10); // convert it to a base 10 integer because it comes from the <option> tag as a string
	if (preGenSets[pointer] === undefined) { // make sure it's not an undefined card set. If it is, just display the first one.
		pointer = 1;
	}
	var finalCards = preGenSets[pointer].preGenSet; // load in the appropriate cardset from the pregen list
	return finalCards;
}

// form validation
function checkForm() {
	f = document.controlForm; //form shortcut
	// check to see if a card set is selected!
	if (!f.base.checked && !f.intrigue.checked && !f.seaside.checked && !f.alchemy.checked && !f.prosperity.checked && !f.cornucopia.checked && !f.hinterlands.checked && !f.darkages.checked && !f.guilds.checked) {
		alert("Please choose a cardset.");
		return false;
	}
	// if seaside or alchemy and attackbalance are selected, ask if the user wants to continue, as these sets do not have a reaction card
	// if they choose to continue, disable the attack balance option
	if (!f.base.checked && !f.intrigue.checked && !f.prosperity.checked && f.attackBalance.checked) {
		if (f.seaside.checked || f.alchemy.checked) {
			if (!confirm("Your selected card set does not have a reaction card..\nContinue without balancing attack/reaction?")) {
			return false;
			} else {
				f.attackBalance.checked = false;
			}
		}
	}
	// Make sure the selected attack options make sense.
	if (f.attackBalance.checked || f.smartAttackBalance.checked) {
		if (f.noAttack.checked) {
			alert("Your selected card set will not have any Attack cards. Attack Balance disabled.");
			f.attackBalance.checked = false;
			f.smartAttackBalance.checked = false;
		}
	}
	if (f.attackBalance.checked && f.smartAttackBalance.checked) {
		alert("Please choose only one attack balance feature.");
		f.attackBalance.checked = false;
		f.smartAttackBalance.checked = false;
		return false;
	}
	if (f.randomAlchemy.checked && !f.alchemy.checked) {
		if(confirm("You've selected the optional Alchemy set rules, but have not selected the Alchemy set.\nSelect Alchemy set?")) {
			f.alchemy.checked = true;
		}
	}
	// prevent an endless loop and enable default Alchemy card generation if only the Alchemy set is selected
	if (noneChecked("alchemy") && f.randomAlchemy.checked) {
		f.randomAlchemy.checked = false;
	}
	// prevent an endless loop of Alchecmy and +2 copper card selection is enabled.
	if (noneChecked("alchemy") && f.mustCoppers.checked) {
		alert("Alchemy does not have a +2 (or more) Copper card. A valid set cannot be returned. Please make a different selection.");
		return false;
	}
	return true;
}

function genCards(cardSet,cardAmount) {
	var pickedCards = [];
	while (pickedCards.length < cardAmount) { //pick selected number of cards
		cardNum = Math.floor((cardSet.length)*Math.random()); // select a random number from the predetermined set
		pickedCards[pickedCards.length] = cardSet[cardNum];
		pickedCards = unique(pickedCards); // make sure that only unique numbers make it in the final selection.
	}
	return pickedCards;
}

function pickCards(numberOfCards) {
	var selectedSets = determineSets(), f = document.controlForm, cornucopiaChecked = f.cornucopia.checked, alchemyChecked = f.alchemy.checked, attackBalance = f.attackBalance.checked, rndAlch = f.randomAlchemy.checked, pickedCards = [], cardNum = 0, pCardLength = 0, smartAttackBalanceCkd = f.smartAttackBalance.checked;
	// If there are card selection options enabled, generate sets until a match is found
	if (hasCardOptions()) {
		while (!checkSetOptions(pickedCards)) {
			if (alchemyChecked && rndAlch) {
				if (alchemySet.length === 0) {  // if we've already loaded the alchemy set, then don't bother doing it again.
					alchemySet = getAlchemySet();
				}
				var tmpAlch = [];
				while (tmpAlch.length < numberOfCards) {
					alchNum = Math.floor(Math.random() * (6 - 3) + 3);
					remainingCards = numberOfCards - alchNum;
					alchCards = genCards(alchemySet,alchNum);
					otherCards = genCards(selectedSets,remainingCards);
					tmpAlch = alchCards.concat(otherCards);
					tmpAlch = unique(tmpAlch);
				}
				pickedCards = tmpAlch;
			} else {
				pickedCards = genCards(selectedSets,numberOfCards);
			}
		}
	} else {
		if (alchemyChecked && rndAlch) {
			if (alchemySet.length === 0) {  // if we've already loaded the alchemy set, then don't bother doing it again.
				alchemySet = getAlchemySet();
			}
			var tmpAlch = [];
			while (tmpAlch.length < numberOfCards) {
				alchNum = Math.floor(Math.random() * (6 - 3) + 3);
				remainingCards = numberOfCards - alchNum;
				alchCards = genCards(alchemySet,alchNum);
				otherCards = genCards(selectedSets,remainingCards);
				tmpAlch = alchCards.concat(otherCards);
				tmpAlch = unique(tmpAlch);
			}
			pickedCards = tmpAlch;
		} else {
			pickedCards = genCards(selectedSets,numberOfCards);
		}
	}
	// Reaction Card for Attack cards requested?
	if (attackBalance) {
		// check to see if there are any Attack or Reaction cards already in the mix
		attackFlag = pickedCards.some(isAttack);
		reactionFlag = pickedCards.some(isReaction);
		// if there are Attack cards, but no Reaction cards, get the Reaction cards, select one at random and append it to the selected cards array.
		// use full random reaction cards
		if (attackFlag && !reactionFlag && attackBalance) {
			var reactionCards = addReactionCards();// get the reaction cards
			if (reactionCards.length > 1) { // an array length greater than one indicates that multiple reaction cards are present
				cardNum = parseInt(Math.random() * reactionCards.length, 10); // choose one card at random
			} else {
				cardNum = 0; // only 1 card in the array, so use it.
			}
			// if there are card selection options enabled, be sure to not nuke it, instead find the first card without a subtype value and replace it
			if (hasCardOptions()) {
				for (i=0;i<pickedCards.length;i++) {
					tmpNum = pickedCards[i];
					if (cards[tmpNum].subType === '' && cards[tmpNum].type !== "Attack") {
						pickedCards[i] = reactionCards[cardNum];
						break;  // we only need to do this once!
					}
				}
			} else {
				pickedCards.pop(); // clear off the last selected card to make room for the reaction card
				pickedCards.push(reactionCards[cardNum]); // add on the reaction card
			}
		}
	}
	// use the smart filtered reaction cards
	if (smartAttackBalanceCkd) {
		attackFlag = pickedCards.some(isAttack);
		if (attackFlag) {
			var reactionCards = smartAttackBalance(pickedCards);// get the reaction cards
			if (!compareArray(pickedCards,reactionCards)) { // checks to see if the reaction card already exists in the mix before continuing. If it's in there already, no need to proceed.
				if (reactionCards.length > 1) { // an array length greater than one indicates that multiple reaction cards are present
					cardNum = parseInt(Math.random() * reactionCards.length, 10); // choose one card at random
				} else {
					cardNum = 0; // only 1 card in the array, so use it.
				}
				// if there are card selection options enabled, be sure to not nuke it, instead find the first card without a subType value and replace it
				if (hasCardOptions()) {
					for (i=0;i<pickedCards.length;i++) {
						tmpNum = pickedCards[i];
						if (cards[tmpNum].subType === '' && cards[tmpNum].type !== "Attack") {
							pickedCards[i] = reactionCards[cardNum];
							break; // we only need to do this once!
						}
					}
				} else {
					pickedCards.pop(); // clear off the last selected card to make room for the reaction card
					pickedCards.push(reactionCards[cardNum]); // add on the reaction card
				}
			}
		}
	}
	// sort the cards alphabetically, by cost, or by set
	sortVal = selRadio(f.sortOption);
	pickedCards = sortCards(pickedCards, sortVal);
	//Check to see if the Young Witch card was picked, if so then pick a bane card. Push it to the end of the array.
	if (cornucopiaChecked) {
		if (pickedCards.some(isYoungWitch)) {
			costMatch = false;
			while (!costMatch) {	
				rndPick = Math.floor((selectedSets.length)*Math.random());
				tstCard = selectedSets[rndPick];			
				if (cards[tstCard].cost === 2 || cards[tstCard].cost === 3) {
					if (cards[tstCard].subType !== "potion") {
						costMatch = true;
						pickedCards.push(cards[tstCard].id);
					}
				}
			}
		}
	}
	return pickedCards;
}

// Get what sets are selected to send to the random generator. If the No Attack option is enabled, it creates a card set without any attack cards. If the set options haven't changed, they're stored so that this function doesn't need to run over and over again.
function determineSets() {
	var a = [], 
		f = document.controlForm,
		baseChecked = f.base.checked,
		intrigueChecked = f.intrigue.checked,
		seasideChecked = f.seaside.checked,
		alchemyChecked = f.alchemy.checked,
		prosperityChecked = f.prosperity.checked,
		cornucopiaChecked = f.cornucopia.checked,
		hinterlandsChecked = f.hinterlands.checked,
		darkagesChecked = f.darkages.checked,
		guildsChecked = f.guilds.checked,
		envoyChecked = f.envoy.checked,
		blackMarketChecked = f.blackMarket.checked,
		stashChecked = f.stash.checked,
		walledvillageChecked = f.walledvillage.checked,
		governorChecked = f.governor.checked,
		noAttackCards = f.noAttack.checked,
		rndAlch = f.randomAlchemy.checked,
		curSel = "",
		inputTags = f.elements,
		z = inputTags.length;
	if (alchemyChecked && rndAlch) { // if the 3-5 Alchemy option is used, don't load Alchemy cards in the main card set
		alchemyChecked = false;
	}
	if (f.custom !== undefined) { // the downloadable versions supports custom cards, check to see if the option is enabled
		customChecked = f.custom.checked;
	}
	for (i = 0;i<z;i++) {  // grab all the values of the current checkboxes 
		if (inputTags[i].type === "checkbox" && inputTags[i].checked) {
			curSel += inputTags[i].value;
		}
	}
	if (curSel === previousRun[1].choice) {  // check to see if current checkbox values match the previous selection
		a = previousRun[1].storedSet; // same selections, no need to grab the card sets again!
	} else {
		// Go through the cards, snagging only the sets that have been requested. These sets are returned in an array.
		if (noAttackCards) { // if the no attack option is enabled, then grab everything but attack cards
			for (var x in cards) {
				if (baseChecked && cards[x].set === "base" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (intrigueChecked && cards[x].set === "intrigue" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (seasideChecked && cards[x].set === "seaside" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (alchemyChecked && cards[x].set === "alchemy" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (prosperityChecked && cards[x].set === "prosperity" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (cornucopiaChecked && cards[x].set === "cornucopia" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (hinterlandsChecked && cards[x].set === "hinterlands" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (darkagesChecked && cards[x].set === "darkages" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (guildsChecked && cards[x].set === "guilds" && cards[x].type !== "Attack" ) {
					a.push(cards[x].id);
				}
				if (f.custom !== undefined) {
					if (customChecked && cards[x].set === "custom" && cards[x].type !== "Attack" ) {
						a.push(cards[x].id);
					}
				}
				if (envoyChecked && cards[x].name === "Envoy") {
					a.push(cards[x].id);
				}
				if (blackMarketChecked && cards[x].name === "Black Market") {
					a.push(cards[x].id);
				}
				if (stashChecked && cards[x].name === "Stash") {
					a.push(cards[x].id);
				}
				if (walledvillageChecked && cards[x].name === "Walled Village") {
					a.push(cards[x].id);
				}
				if (governorChecked && cards[x].name === "Governor") {
					a.push(cards[x].id);
				}
			}
		} else {
			for (var x in cards) {
				if (baseChecked && cards[x].set === "base") {
					a.push(cards[x].id);
				}
				if (intrigueChecked && cards[x].set === "intrigue") {
					a.push(cards[x].id);
				}
				if (seasideChecked && cards[x].set === "seaside") {
					a.push(cards[x].id);
				}
				if (alchemyChecked && cards[x].set === "alchemy") {
					a.push(cards[x].id);
				}
				if (prosperityChecked && cards[x].set === "prosperity") {
					a.push(cards[x].id);
				}
				if (cornucopiaChecked && cards[x].set === "cornucopia") {
					a.push(cards[x].id);
				}
				if (hinterlandsChecked && cards[x].set === "hinterlands") {
					a.push(cards[x].id);
				}
				if (darkagesChecked && cards[x].set === "darkages") {
					a.push(cards[x].id);
				}
				if (guildsChecked && cards[x].set === "guilds") {
					a.push(cards[x].id);
				}
				if (f.custom !== undefined) {
					if (customChecked && cards[x].set === "custom") {
						a.push(cards[x].id);
					}
				}
				if (envoyChecked && cards[x].name === "Envoy") {
					a.push(cards[x].id);
				}
				if (blackMarketChecked && cards[x].name === "Black Market") {
					a.push(cards[x].id);
				}
				if (stashChecked && cards[x].name === "Stash") {
					a.push(cards[x].id);
				}
				if (walledvillageChecked && cards[x].name === "Walled Village") {
					a.push(cards[x].id);
				}
				if (governorChecked && cards[x].name === "Governor") {
					a.push(cards[x].id);
				}
			}
		}
	}
	previousRun[1].choice = curSel;
	previousRun[1].storedSet = a;
	return a;  // send back all the valid numbers to choose from, ordered in an array.
}

// if the 3-5 Alchemy set option is enabled, grab only the alchemy cards for Alchemy only generation
function getAlchemySet() {
	var a = [], 
		f = document.controlForm,
		alchemyChecked = f.alchemy.checked,
		noAttackCards = f.noAttack.checked;
	if (noAttackCards) {
		for (var x in cards) {
			if (alchemyChecked && cards[x].set === "alchemy" && cards[x].type !== "Attack" ) {
				a.push(cards[x].id);
			}
		}
	} else {
		for (var x in cards) {
			if (alchemyChecked && cards[x].set === "alchemy") {
				a.push(cards[x].id);
			}
		}
	}
	return a;  // send back all the valid numbers to choose from, ordered in an array.
}

// Grabs all reaction cards and returns them in an array.
function addReactionCards() {
	var a = [], f = document.controlForm, baseChecked = f.base.checked, intrigueChecked = f.intrigue.checked, prosperityChecked = f.prosperity.checked, cornucopiaChecked = f.cornucopia.checked, hinterlandsChecked = f.hinterlands.checked, darkagesChecked = f.darkages.checked;
	for (var x in cards) {
		if (baseChecked && cards[x].set === "base" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (intrigueChecked && cards[x].set === "intrigue" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (prosperityChecked && cards[x].set === "prosperity" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (cornucopiaChecked && cards[x].set === "cornucopia" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (hinterlandsChecked && cards[x].set === "hinterlands" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (darkagesChecked && cards[x].set === "darkages" && cards[x].type == "Reaction") {
			a.push(cards[x].id);
		}
		if (f.custom !== undefined) {
			if (customChecked && cards[x].set === "custom" && cards[x].type !== "Reaction" ) {
				a.push(cards[x].id);
			}
		}
	}
	return a;
}

//Grabs reaction cards from the appropriate set that best represents a beneficial reaction to the attack
function smartAttackBalance(selectedCards) {
	var a = [], f = document.controlForm, baseChecked = f.base.checked, intrigueChecked = f.intrigue.checked, seasideChecked = f.seaside.checked, prosperityChecked = f.prosperity.checked, cornucopiaChecked = f.cornucopia.checked, hinterlandsChecked = f.hinterlands.checked, darkagesChecked = f.darkages.checked, guildsChecked = f.guilds.checked;
	for (i=0;i<selectedCards.length;i++) {
			if (cards[selectedCards[i]].type === "Attack") {
				cardName = cards[selectedCards[i]].name;
				if (baseChecked) {
					a.push(getCardId('Moat'));
				}
				if (intrigueChecked) {
					a.push(getCardId('Secret Chamber'));
				}
				if (seasideChecked) {
					a.push(getCardId('Lighthouse'));
				}
				if (cornucopiaChecked) {
					a.push(getCardId('Horse Traders'));
				}
				if (prosperityChecked) {
					if (cardName === "Witch" || cardName === "Saboteur" || cardName === "Swindler" || cardName === "Ambassador" || cardName === "Sea Hag" || cardName === "Familiar" || cardName === "Young Witch" ||  cardName === "Jester" || cardName === "Tournament" || cardName === "Noble Brigand" || cardName === "Soothsayer") {
						a.push(getCardId('Watchtower'));
					}
				}
				if (hinterlandsChecked) {
					switch(cardName) {
						case "Torturer": case "Sea Hag": case "Familiar": case "Mountebank": case "Jester": case "Tournament": case "Noble Brigand":
							a.push(getCardId('Tunnel'),getCardId('Trader'));
							break;
						case "Witch": case "Saboteur": case "Swindler": case "Ambassador": case "Scrying Pool": case "Young Witch": case "Oracle": case "Pillage":
							a.push(getCardId('Tunnel'));
							break;
						default:
							a.push(getCardId('Trader'));
							break;
					}
				}
				if (darkagesChecked) {
					if (cardName === "Militia" || cardName === "Spy" || cardName === "Thief" || cardName === "Minion" || cardName === "Saboteur" || cardName === "Pirate ship" || cardName === "Sea Hag" || cardName === "Scrying Pool" || cardName === "Rabble" || cardName === "Jester" || cardName === "Margrave" || cardName === "Noble Brigand" || cardName === "Oracle" || cardName === "Rogue" || cardName === "Taxman") {
						a.push(getCardId('Beggar'));
					}
					if (cardName === "Saboteur" || cardName === "Swindler" || cardName === "Noble Brigand" || cardName === "Rogue") {
						a.push(getCardId('Market Square')); // Market Square
					}
				}
		}
	}
	a = unique(a);
	return a;
}

// Sort the final card set
function sortCards(selCards, sortType) {
	var tmpCards = [],a = [];
	for (i=0;i<selCards.length;i++) {
		tmpCards.push(cards[selCards[i]]);
	}
	switch (sortType) {
		case "0":
			tmpCards = tmpCards.sort(sortByName);
			break;
		case "1":
			tmpCards = tmpCards.sort(sortByCost);
			break;
		case "2":
			tmpCards = tmpCards.sort(sortBySet);
			break;
		default:
			tmpCards = tmpCards.sort(sortByName);
			break;
	}
	for (i=0;i<tmpCards.length;i++) {
		a.push(tmpCards[i].id);
	}
	return a;
}

// toggle all base card set selection on or off. Uses innerHTML to update the toggle text.
function allCards() {
	var inputTags = document.controlForm.elements,i=0,elemTxt=document.getElementById('allCardsText');
	if (elemTxt.innerHTML === "Select&nbsp;All&nbsp;Sets") {  // select all sets
		while (inputTags[i].type === "checkbox" && parseInt(inputTags[i].value,10) < 20) {  // the checkboxes have hard coded values...30+ are not card sets, therefore don't need to be checked.
			if (!inputTags[i].checked) {
				inputTags[i].checked = true;
			}
			i++;
		}
		elemTxt.innerHTML = "Reset&nbsp;Set&nbsp;Selection";
	} else { // select none, leaves the base set checked to avoid form validation errors.
		while (inputTags[i].type === "checkbox" && parseInt(inputTags[i].value,10) < 20) {
			if (inputTags[i].value !== "1" && inputTags[i].checked) {
				inputTags[i].checked = false;
			}
			i++;
		}
		document.controlForm.randomAlchemy.checked = false;
		elemTxt.innerHTML = "Select&nbsp;All&nbsp;Sets";
	}
}

// toggle all promo cards selection on or off. Uses innerHTML to update the toggle text.
function allPromoCards() {
	var inputTags = document.controlForm.elements,i=0,elemTxt=document.getElementById('allPromoCardsText');
	if (elemTxt.innerHTML === "Select&nbsp;All&nbsp;Promo&nbsp;Cards") {
		while (inputTags[i].type === "checkbox") {
			if (parseInt(inputTags[i].value,10) >= 20 && parseInt(inputTags[i].value,10) <= 30) {
				if (!inputTags[i].checked) {
					inputTags[i].checked = true;
				}
			}
			i++;
		}
		elemTxt.innerHTML = "Reset&nbsp;set&nbsp;selection";
	} else { // select none.
		while (inputTags[i].type === "checkbox") {
			var cardCheckRange = parseInt(inputTags[i].value,10);
			if (cardCheckRange >= 20 && cardCheckRange <= 30) {
				if (inputTags[i].checked) {
					inputTags[i].checked = false;
				}
			}
			i++;
		}
		elemTxt.innerHTML = "Select&nbsp;All&nbsp;Promo&nbsp;Cards";
	}
}

// chooses a game type based on variant rules
function pickGameType(finalCards,chosenSet) {
	cardNum = Math.floor((finalCards.length)*Math.random());  //randomly choose a card, if it's part of the variant set, apply the variant rule
	checkCard = finalCards[cardNum];
	if (cards[checkCard].set === chosenSet) {
		retVal = chosenSet;
	} else {
		retVal = "";
	}
	return retVal;
}

// kill the table and hide the DIV for a new selection - this bypasses a page refresh
function clearTable() {
	document.getElementById('content').style.display = "none"; // turn off the display for faster DOM performance
	document.getElementById('content').removeChild(document.getElementById('cardDisplay'));
	if (document.getElementById('banePile') !== null) { //check for bane pile and nuke it too
		document.getElementById('content').removeChild(document.getElementById('banePile'));
	}
}

//checks to see if no other sets are checked. Used for game type determination and stand alone alchemy games.
function noneChecked(setID) {
	var f = document.controlForm,
	baseChecked = f.base.checked,
	intrigueChecked = f.intrigue.checked,
	seasideChecked = f.seaside.checked,
	alchemyChecked = f.alchemy.checked,
	cornucopiaChecked = f.cornucopia.checked,
	hinterlandsChecked = f.hinterlands.checked;
	prosperityChecked = f.prosperity.checked;
	darkagesChecked = f.darkages.checked;
	switch (setID) {
		case "prosperity" :
			if (hinterlandsChecked || cornucopiaChecked || alchemyChecked || seasideChecked || intrigueChecked || baseChecked || darkagesChecked) {
				return false;
			} else {
				return true;
			}
		case "darkages" :
			if (hinterlandsChecked || cornucopiaChecked || alchemyChecked || seasideChecked || intrigueChecked || baseChecked || prosperityChecked) {
				return false;
			} else {
				return true;
			}
		case "alchemy" :
			if (hinterlandsChecked || cornucopiaChecked || seasideChecked || intrigueChecked || baseChecked || prosperityChecked) {
				return false;
			} else {
				return true;
			}
		default:
			return true;
	}
}

// checks to see the generated set has the required card options
function checkSetOptions(genSet) {
	var f = document.controlForm,checkCount=0,optionCount=0;
	if (f.mustActions.checked) {
		checkCount++;
		if (genSet.some(hasActions)) {
			optionCount++;
		}
	}
	if (f.mustCards.checked) {
		checkCount++;
		if (genSet.some(hasCards)) {
			optionCount++;
		}
	}
	if (f.mustBuys.checked) {
		checkCount++;
		if (genSet.some(hasBuy)) {
			optionCount++;
		}
	}
	if (f.mustCoppers.checked) {
		checkCount++;
		if (genSet.some(hasCopper)) {
			optionCount++;
		}
	}
	if (checkCount === optionCount) {
		return true;
	} else {
		return false;
	}
}

// checks to see if any of the card requirement options are checked
function hasCardOptions() {
	var f = document.controlForm;
	if (f.mustActions.checked || f.mustCards.checked ||  f.mustBuys.checked || f.mustCoppers.checked) {
		return true;
	} else {
		return false;
	}
}

// removes dupes from the final card array. http://www.martienus.com/code/javascript-remove-duplicates-from-array.html
function unique(a) {
   var r = [];
   o:for(var i = 0, n = a.length; i < n; i++) {
      for(var x = i + 1 ; x < n; x++) {
         if(a[x]===a[i]) continue o;
      }
      r[r.length] = a[i];
   }
   return r;
}

// compares one array to another, returns true at the first match
function compareArray(arr1,arr2) {
	for(var i = 0; i<arr1.length; i++){
		for(var j=0; j<arr2.length; j++){
			if(arr1[i] === arr2[j]){
				return true;
			}
		}
	}
	return false;
}

// returns the selected radio object's value
function selRadio(radObj) {
	retVal = false;
	for (i=0;i<radObj.length;i++) {
		if (radObj[i].checked) {
			retVal = radObj[i].value;
		}
	}
	return retVal;
}

// Array fuctions, tied to the .some() method
function isYoungWitch(element) {
	return (cards[element].name === 'Young Witch');
}

function isAttack(element) {
	return (cards[element].type === 'Attack');
}

function isReaction(element) {
	return (cards[element].type === 'Reaction');
}

function isLooter(element) {
	var retVal;
	if (cards[element].subType.indexOf('looter') === -1) {
		retVal = false;
	} else {
		retVal = true;
	}
	return retVal;
}

function hasActions(element) {
	var retVal;
	if (cards[element].subType.indexOf('action') === -1) {
		retVal = false;
	} else {
		retVal = true;
	}
	return retVal;
}

function hasCards(element) {
	var retVal;
	if (cards[element].subType.indexOf('card') === -1) {
		retVal = false;
	} else {
		retVal = true;
	}
	return retVal;
}

function hasBuy(element) {
	var retVal;
	if (cards[element].subType.indexOf('buy') === -1) {
		retVal = false;
	} else {
		retVal = true;
	}
	return retVal;
}

function hasCopper(element) {
	var retVal;
	if (cards[element].subType.indexOf('copper') === -1) {
		retVal = false;
	} else {
		retVal = true;
	}
	return retVal;
}

function isKnight(element) {
	return (cards[element].name === 'Knights');
}

function isProsperity(element) {
	return (cards[element].set === 'prosperity');
}

function isDarkages(element) {
	return (cards[element].set === 'darkages');
}

// sorting functions
function sortByName(a, b) {
	var x = a.name.toLowerCase();
	var y = b.name.toLowerCase();
	return ((x < y) ? -1 : ((x > y) ? 1 : 0));
}

function sortByCost(a, b) {
	var x = a.cost;
	var y = b.cost;
	return ((x < y) ? -1 : ((x > y) ? 1 : 0));
}

function sortBySet(a, b) {
	var x = a.set;
	var y = b.set;
	return ((x < y) ? -1 : ((x > y) ? 1 : 0));
}

function makeTable(finalCards,generateNumber,cardLoopCounter) {
	var parentTable = document.createElement('table'); // create the table
		parentTable.id = "cardDisplay";
		parentTable.setAttribute('width', '750');
		parentTable.setAttribute('bgcolor', '#CCCCCC');
		parentTable.setAttribute('cellpadding', '2');
		parentTable.setAttribute('cellspacing', '2');
		if (generateNumber>10) {
			parentTable.setAttribute('height', '690');
		} else {
			parentTable.setAttribute('height', '460');
		}
	for (i=0;i < cardLoopCounter;i++) {
		var pointer = finalCards[i]; // reference the array only once per loop
		// load variables up with data from the cards object
		cardSet = " Set: "+cards[pointer].set;
		cardName = " Card Name: "+cards[pointer].name;
		cardCost = " Cost: "+cards[pointer].cost;
		cardType = " Card Type: "+cards[pointer].type;
		if (cards[pointer].set === "custom") {
			imgSrc = "cards/000.png";
		} else {
			imgSrc = "cards/" + cards[pointer].id + ".jpg";
		}
		var tableColumn = document.createElement('td');  //create the table cell
			// tableColumn.setAttribute('nowrap', 'true');
			tableColumn.setAttribute('width', '150');
			tableColumn.setAttribute('height', '230');
			tableColumn.setAttribute('bgcolor', bgClr(cards[pointer].set));
		var cardImage = new Image(148,228);
			cardImage.src = imgSrc;
			cardImage.setAttribute('border', "0");
			cardImage.setAttribute('title', cardName + cardCost + cardSet);
			cardImage.setAttribute('alt', cardName + cardCost + cardSet);
		if (cards[pointer].set === "custom") {
			var tdTxt = document.createElement('span');
				cardContent = cards[pointer].name + "<br />" + cardCost + "<br />" + cardType;
				tdTxt.innerHTML = cardContent;
				tableColumn.setAttribute('class','custom');
				tableColumn.style.backgroundImage = "url("+imgSrc+")";
				tableColumn.style.backgroundRepeat = "none";
			tableColumn.appendChild(tdTxt);
		} else {	
			tableColumn.appendChild(cardImage); // attach the image to the TD container
		}
		if (i % 5 === 0) { // make rows of 5 columns each
			var tableRow = document.createElement('tr');
				tableRow.id = "row"+i;
				parentTable.appendChild(tableRow); // attach the row to the table
		}
			tableRow.appendChild(tableColumn); // attach the column to the row
	}
	return parentTable;
}
function ywTable(finalCards) {
	var parentTable = document.createElement('table'); // create the table
		parentTable.id = "banePile";
		parentTable.setAttribute('width', '152');
		parentTable.setAttribute('bgcolor', '#CCCCCC');
		parentTable.setAttribute('cellpadding', '2');
		parentTable.setAttribute('cellspacing', '2');
		parentTable.setAttribute('height', '228');
	var titleColumn =  document.createElement('td');
		titleColumn.setAttribute('nowrap', 'true');
		titleColumn.setAttribute('bgcolor', 'black');
		titleColumn.setAttribute('width', '150');
		titleColumn.setAttribute('height', '230');
		titleColumn.setAttribute('valign', 'middle');
		titleColumn.innerHTML = "Bane Pile";
	var pointer = finalCards[cardLoopCounter];
	// load variables up with data from the cards object
	cardSet = " Set: "+cards[pointer].set;
	cardName = " Card Name: "+cards[pointer].name;
	cardCost = " Cost: "+cards[pointer].cost;
	cardType = " Card Type: "+cards[pointer].type;
	if (cards[pointer].set === "custom") {
		imgSrc = "cards/000.png";
	} else {
		imgSrc = "cards/" + cards[pointer].id + ".jpg";
	}
	var tableColumn = document.createElement('td');
		tableColumn.setAttribute('nowrap', 'true');
		tableColumn.setAttribute('width', '150');
		tableColumn.setAttribute('height', '230');
		tableColumn.setAttribute('bgcolor', bgClr(cards[pointer].set));
	var cardImage = new Image(148,228);
		cardImage.src = imgSrc;
		cardImage.setAttribute('border', "0");
		cardImage.setAttribute('title', cardName + cardCost + cardSet);
		cardImage.setAttribute('alt', cardName + cardCost + cardSet);
	if (cards[pointer].set === "custom") { //displays any custom cards that have been selected
		var tdTxt = document.createElement('span');
			cardContent = cards[pointer].name + "<br />" + cardCost + "<br />" + cardType;
			tdTxt.innerHTML = cardContent;
			tableColumn.setAttribute('class','custom');
			tableColumn.style.backgroundImage = "url("+imgSrc+")";
			tableColumn.style.backgroundRepeat = "none";
		tableColumn.appendChild(tdTxt);
	} else {	
		tableColumn.appendChild(cardImage); // attach the image to the TD container
	}
	var tableRow = document.createElement('tr');
		parentTable.appendChild(tableRow); // attach the row to the table
		tableRow.appendChild(titleColumn); // attach the column to the row
		tableRow.appendChild(tableColumn); // attach the column to the row
	return parentTable;
}

// color code the background for different card sets
function bgClr(selCard) {
	switch (selCard) {
		case "base" :
			backgroundClr = "red";
			break;
		case "intrigue" :
			backgroundClr = "blue";
			break;
		case "seaside" :
			backgroundClr = "orange";
			break;
		case "alchemy" :
			backgroundClr = "purple";
			break;
		case "prosperity" :
			backgroundClr = "green";
			break;
		case "cornucopia" :
			backgroundClr = "yellow";
			break;
		case "hinterlands" :
			backgroundClr = "chartreuse";
			break;
		case "darkages" :
			backgroundClr = "LightSlateGray";
			break;
		case "guilds" :
			backgroundClr = "white";
			break;
		case "custom" :
			backgroundClr = "#CCCCCC";
			break;
		default :
			backgroundClr = "red";
	}
	return backgroundClr;
}

// Check to see if a selected cardset brings a variant rule into play. If only the variant set is selected, force the variant rule. Otherwise, randomly choose a card to see if the rule is used.
function gameType(finalCards) {
	var retVal = "regular", prosperityChecked = finalCards.some(isProsperity), darkagesChecked = finalCards.some(isDarkages);
	if (prosperityChecked && noneChecked("prosperity")) {
		retVal = "prosperity";
	}
	if (darkagesChecked && noneChecked("darkages")) {
		retVal = "darkages";
	}
	if (retVal === "regular") {
		if (prosperityChecked) {
			rndGame = pickGameType(finalCards,"prosperity");
			if (rndGame !== "") {
				retVal = "prosperity";
			}
		}
		if (darkagesChecked) {
			rndGame = pickGameType(finalCards,"darkages");
			if (rndGame !== "") {
				if (retVal.indexOf('prosperity') !== -1) {
					retVal = retVal+"darkages";
				} else {
					retVal = rndGame;
				}
			}
		}
	}
	if (finalCards.some(isLooter)) { // If there's a looter card, add it to the game type.
		retVal = retVal+"looter";
	}
	switch(retVal) { // Return the game type in plain english
		case "prosperity":
			return "Colony";
		case "darkages":
			return "Shelter";
		case "looter":
			return "Looter";
		case "regularlooter":
			return "Regular & Looter";
		case "darkageslooter":
			return "Shelter & Looter";
		case "prosperitylooter":
			return "Colony & Looter";
		case "prosperitydarkages":
			return "Colony & Shelter";
		case "prosperitydarkageslooter":
			return "Colony & Shelter & Looter";
		default:
			return "Regular";
	}
}

// Find the last card added to card_data.js. Yes, I could hard code it, but then it becomes a point of failure for future updates. Not used at the moment.
function cardsInSet() {
	var a = [],b;
	for (var x in cards) {
		a[x] = cards[x].id;
	}
	a.sort(function(a,b){return b-a;})[0];
	return(a[0]);
}

// get the ID number of a specific card
function getCardId(cardName) {
    for (var x in cards) {
        if (cards[x].name === cardName) {
            return cards[x].id;
        }
    }
}

//Searches the text name of the card and returns all matching IDs in an array.
function searchCards(cardName) {
	var searchTerm = cardName.toLowerCase(),
		searchResults = [];
    for (var x in cards) {
		inCardName = cards[x].name.toLowerCase();
        if (inCardName.indexOf(searchTerm) !== -1) {
            searchResults.push(cards[x].id);
        }
    }
	return searchResults;
}
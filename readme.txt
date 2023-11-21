The file js/card_data.js contains all the information on the cards and pre-generated sets. You can use notepad, notepad++, or any decent text editor to work on it.

This means you can edit any card, or add any custom cards you'd like.

The data is loaded into an array of objects. You just need to follow the template below

192 : { id: 192, set: 'darkages', name: 'Knights', cost: 5, type: 'Action', subType: '' },

So, your custom sets would be entered like:

193 : { id: 193, set: 'custom', name: 'Custom Card 1', cost: 5, type: 'Action', subType:''},
.
.
.
200 : { id: 200, set: 'custom', name: 'Custom Card 7', cost: 3, type: 'Attack', subType:'action,buy'}


It's important to note that the last card entry MUST NOT have a comma after the }

SubType is used to let the generator know if the card is special in any way. Valid entries are:
potion - a potion card, will not be used for Bane pile
action - provides +2 or more actions
copper - provides +2 or more coppers
buy - provides +1 or more buys
card - provides +2 or more card draws
looter - is a looter card

These can be added in any or all combinations, simply seperate each entry with a comma.


Once you finish adding your custom cards, save the file and reload "dominion.html" in your browser. Check mark the "Custom Set" and the script will grab any card that has a "set" value of "custom". A card border will display and it will fill in the pertinent details in text.

If you want to add to the pre-generated card sets, it's also stored in js/card_data.js and uses the following template

111 : { name: 'Rio Grande: Blue Harvest', cardSet: 'Cornucopia & Hinterlands', preGenSet: new Array(120,122,123,125,128,140,145,148,156,157) },

The object "preGenSet" is an array of 10 or 11 numbers. Each number references a card ID from the cards array. If you enter in 11 numbers, the generator assumes one of the cards is "Young Witch" and the 11th card is for the Bane Pile.

Just like the cards array, it's important that the last pre-gen entry MUST NOT have a comma after the }

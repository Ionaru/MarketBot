# Discord MarketBot for EVE Online

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of the [EVE-Central API](https://eve-central.com/home/develop.html), [stop.hammerti.me.uk](https://stop.hammerti.me.uk/citadelhunt/getstarted), the [EVE Swagger Interface](https://esi.tech.ccp.is/) and the [Static Data Export](https://developers.eveonline.com/resource/resources) provided by CCP.

## Usage
[Add this bot to your Discord server!](https://discordapp.com/oauth2/authorize?client_id=302011421523443713&scope=bot)

#### Commands this bot will respond to
* `/price <item-name> /region <region-name>` - Fetch the lowest and average prices for an item, both buy and sell orders.
* `/sell <item-name> /region <region-name> /limit <limit-number>` - Fetch the cheapest market sell orders for an item.
* `/buy <item-name> /region <region-name> /limit <limit-number>` - Fetch the highest market buy orders for an item.
* `/data /limit <limit-number>` - Show a list of the top searched items.
* `/info` - Print a message with usage information

*`/region` and `/limit` are always optional.*

#### Aliases for the above commands
* `/price` `/p` `/value`
* `/sell` `/s`
* `/buy` `/b`
* `/data` `/d`
* `/info` `/i` `/about` `/help`
* `/region` `/r`
* `/limit` `/l`

## Screenshots
The bot in action

![Image of price command](https://cloud.githubusercontent.com/assets/3472373/25203767/b7760c62-255a-11e7-9cea-37b8a482b6f8.png)

![Image of sell command](https://cloud.githubusercontent.com/assets/3472373/25203930/886d9a10-255b-11e7-833f-217aa1f9f3c6.png)

![Image of price command with wrong spelling](https://cloud.githubusercontent.com/assets/3472373/25204009/e3a0d74e-255b-11e7-87bd-8f91b1b213bb.png)

## Logging
This bot keeps records of issued commands, this data is used to monitor performance, usage and accuracy of the bot.

What information does it save?
* The channel in which the command was issued.
  * For counting how many unique channels/servers this bot is active in.
* The username and id of the user who issued a command to the bot.
  * This helps me count how many unique channels the bot is active in, because the above logging does not include Direct Message channels
* The item-parameter of the command and the item the bot did the search for.
  * For monitoring the accuracy of the bot's guessing system and tracking which items are most often searched for. This data will allow me to build shortcuts in the guessing system to improve performance.
* The region-parameter of the command and the region the bot did the search for.
  * For counting which regions are most often selected to search in. I have a feeling it'll be The Forge, but with this data I can build new functionality that can search a select few regions at the same time to get you the best item price. It is impractical to have this feature search all regions in New Eden.

## Feature requests
Please open an [issue](https://github.com/Ionaru/MarketBot/issues/new) if you have any feature ideas for this bot
or are missing any functionality.

Alternatively you can contact me in EVE Online: `Ionaru Otsada`, or on Discord: `Ionaru#3801`.

## Developer information
Want to contribute? Awesome!
Just follow these steps to get started:
1. Clone this repository into a directory of your choice.
2. Run `npm install` or `yarn` in a command prompt to install dependencies.
3. Create a `token.txt` and place it in the `config` folder.
4. Download the Static Data Export from [https://developers.eveonline.com/resource/resources](https://developers.eveonline.com/resource/resources) and place `typeIDs.yaml` in the `data` folder.
5. Make your changes and create a pull request.

## To-Do
1. Search for best buy orders
2. Better/Faster fuzzy word search, at the moment it's slow and sometimes inaccurate
3. Shortcuts for commonly used searches (e.g. PLEX)

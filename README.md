# Discord MarketBot for EVE Online

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of the [EVE-Central API](https://eve-central.com/home/develop.html), the [EVE Swagger Interface](https://esi.tech.ccp.is/) and the [Static Data Export](https://developers.eveonline.com/resource/resources) provided by CCP.

## Usage
[Add this bot to your Discord server!](https://discordapp.com/oauth2/authorize?client_id=302011421523443713&scope=bot)

The bot will respond to the following commands:
* `/p <item-name> [/r <region-name>]` - Fetch the lowest and average prices for an item, both buy and sell orders.
* `/c <item-name> [/r <region-name>] [/l <limit>]` - Fetch the cheapest market sell orders for an item.
* `/i` - Print a message with usage information

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

# Discord MarketBot for EVE Online
[![Build Status](https://travis-ci.org/Ionaru/MarketBot.svg?branch=master)](https://travis-ci.org/Ionaru/MarketBot)
[![codecov](https://codecov.io/gh/Ionaru/MarketBot/branch/master/graph/badge.svg)](https://codecov.io/gh/Ionaru/MarketBot)
[![Trading is serious business](https://img.shields.io/badge/trading-is%20serious%20business-2F849E.svg "Spaceships are as well!")](https://www.eveonline.com/)

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of data from [EVEMarketer](https://evemarketer.com/), [stop.hammerti.me.uk](https://stop.hammerti.me.uk/citadelhunt/getstarted), and the [EVE Swagger Interface](https://esi.tech.ccp.is/) provided by CCP.

## Usage
[Add this bot to your Discord server!](https://discordapp.com/oauth2/authorize?client_id=302011421523443713&scope=bot) or alternatively you can [try it out first on my dev server](https://discord.gg/uza8mpH).

#### Bot commands
[Commands can be found on the MarketBot website](https://ionaru.github.io/MarketBot/commands/)

## Screenshots
The bot in action

![Image of price command](https://cloud.githubusercontent.com/assets/3472373/25491154/668c3504-2b6f-11e7-8419-2ff21500e9b8.png)

![Image of sell command](https://cloud.githubusercontent.com/assets/3472373/25491068/2213ccc0-2b6f-11e7-8562-46dbf7587596.png)

![Image of price command with wrong spelling](https://cloud.githubusercontent.com/assets/3472373/25491110/4227c17e-2b6f-11e7-8609-46ee6e5ad291.png)

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

## Self-hosting
It is possible to self-host this bot, it requires NodeJS 8 or greater.

#### Step one: Creating a bot user
1. Go to [https://discordapp.com/developers/applications/me](https://discordapp.com/developers/applications/me).
2. Create a new App, give it a name and picture. The "redirect URL" is not needed. Click "Create App".
3. Click on "Create a Bot User" and confirm.
4. Click the link next to "Token" to reveal your Discord Bot Token, you will need it later.
5. Invite the bot to your server by placing the bot's Client ID in this link: `https://discordapp.com/oauth2/authorize?client_id=PLACE_CLIENT_ID_HERE&scope=bot`
6. Paste the link in your web browser and follow the steps on the Discord website.

#### Step two: Installing the bot
1. Install [NodeJS](https://nodejs.org/en/download/current/).
2. Go to the [Releases page](https://github.com/Ionaru/MarketBot/releases), download and extract the latest release.
3. Install dependencies with `npm install`.
4. Go to the config folder, create a copy of `marketbot.template.ini` and name the copy `marketbot.ini`. Set the Discord Bot Token to the one you created.
5. Go back to the main folder and run `npm start`.

Contact me in EVE Online: `Ionaru Otsada` or on Discord: `Ionaru#3801` if you need any assistance.

## To-Do & Ideas
- [x] Support for searches in Jita, Amarr & other trade hubs
- [ ] % difference between lowest sell order and highest buy order
- [ ] Show volume in price history
- [ ] Show deviation between low and high in price history
- [x] Darker graphs to better match Discord colors
- [x] More information in price command output (low/high)

## Developer information
Want to contribute? Awesome!
Just follow these steps to get started:
1. Fork this repository and clone the fork into a directory of your choice.
2. Follow the Self-hosting steps to get a development version of the bot up and running
3. Make your changes, test them and create a pull request.

# Discord MarketBot for EVE Online
[![Build Status](https://travis-ci.org/Ionaru/MarketBot.svg?branch=master)](https://travis-ci.org/Ionaru/MarketBot)
[![codecov](https://codecov.io/gh/Ionaru/MarketBot/branch/master/graph/badge.svg)](https://codecov.io/gh/Ionaru/MarketBot)
[![Internet spaceships are serious business](https://img.shields.io/badge/internet%20spaceships-are%20serious%20business-2F849E.svg)](https://www.eveonline.com/)

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of data from [Evepraisal](https://evepraisal.com/) and the [EVE Swagger Interface](https://esi.evetech.net/) provided by CCP.

## Usage
[Add this bot to your Discord server!](https://discordapp.com/oauth2/authorize?client_id=302011421523443713&scope=bot%20applications.commands) or alternatively you can [try it out first on my dev server](https://discord.gg/uza8mpH).

#### Bot commands
[Commands can be found on the MarketBot website's commands page.](https://ionaru.github.io/MarketBot/commands/)

#### Discord permissions
[Required permissions can be found on the MarketBot website's permissions page.](https://ionaru.github.io/MarketBot/permissions/)

## Screenshots
MarketBot in action! (Some images are a bit out-of-date)

![Image of price command](https://user-images.githubusercontent.com/3472373/37924487-42f77698-3132-11e8-9df4-c316ee4457f5.png)

![Image of sell command](https://user-images.githubusercontent.com/3472373/37924510-560e97b6-3132-11e8-9fd3-54df753bbc1f.png)

![Image of item command](https://user-images.githubusercontent.com/3472373/37924531-7113853a-3132-11e8-94ca-c920e356bbb1.png)

![Image of history command](https://user-images.githubusercontent.com/3472373/37924569-8c5fa3a0-3132-11e8-9b56-e6bbbcee37bc.png)

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

Alternatively you can contact me in EVE Online: `Ionaru Otsada`, or on Discord: `@ionaru`.

## Self-hosting
It is possible to self-host this bot. It requires Docker with the Compose v2 plugin, and images are
published to `ghcr.io/ionaru/marketbot`.

The instructions used to live here and had drifted out of date. They are now kept in one place, in
the repository's
[README](https://github.com/Ionaru/MarketBot#self-hosting), alongside the Compose file they describe.

Contact me in EVE Online: `Ionaru Otsada` or on Discord: `@ionaru` if you need any assistance.

## To-Do & Ideas
- [x] Support for searches in Jita, Amarr & other trade hubs
- [ ] % difference between lowest sell order and highest buy order
- [ ] Show volume in price history
- [ ] Show deviation between low and high in price history
- [ ] EVE Online quotes in bot (error) messages
- [x] Darker graphs to better match Discord colors
- [x] More information in price command output (low/high)

## Developer information
Want to contribute? Awesome!
Just follow these steps to get started:
1. Fork this repository and clone the fork into a directory of your choice.
2. Follow the Self-hosting steps to get a development version of the bot up and running
3. Make your changes, test them and create a pull request.

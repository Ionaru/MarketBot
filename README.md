# Discord MarketBot for EVE Online

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of the [EVE-Central API](https://eve-central.com/home/develop.html), the [EVE Swagger Interface](https://esi.tech.ccp.is/) and the [Static Data Export](https://developers.eveonline.com/resource/resources) provided by CCP.

## Usage
The bot will respond to the following commands:
* `/p <item-name> [/r <region-name>]` - Fetch the lowest and average prices for an item, both buy and sell orders.
* `/c <item-name> [/r <region-name>] [/l <limit>]` - Fetch the cheapest market orders for an item.
* `/i` - Print a message with usage information

## Developer information
Want to contribute? Awesome!
Just follow these steps to get started:
1. Clone this repository into a directory of your choice.
2. Run `npm install` or `yarn` in a command prompt to install dependencies.
3. Create a `token.txt` and place it in the `config` folder.
4. Download the Static Data Export from [https://developers.eveonline.com/resource/resources](https://developers.eveonline.com/resource/resources) and place `typeIDs.yaml` in the `data` folder.
5. Make your changes and create a pull request.
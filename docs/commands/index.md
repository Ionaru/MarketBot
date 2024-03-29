#### [MarketBot](/MarketBot) > [commands](/MarketBot/commands)

---

##### Syntax information
`<` and `>` mark a required section, the command will not work without this section.

`[` and `]` are optional sections, you can leave those out and the command will use defaults.

`/command-name <required option> [optional option]`

# Commands for MarketBot

## /price
[More information](price)

##### Description
Fetch the lowest and average prices for an item, both buy and sell orders.

##### Syntax
`/price <item name> [system-name]`


## /item
[More information](item)

##### Description
Show information about an item.

##### Syntax
`/item <item name>`


## /sell-orders
[More information](sell-orders)

##### Description
Show the cheapest sell orders for an item in a region.

##### Syntax
`/sell-orders <item-name> [region-name] [limit-amount]`


## /buy-orders
[More information](buy-orders)

##### Description
Show the highest buy orders for an item in a region.

##### Syntax
`/buy-orders <item-name> [region-name] [limit-amount]`


## /history
[More information](history)

##### Description
Show history information and a graph showing the average price in the last 20 days.

##### Syntax
`/history <item-name> <region-name>`


## /info
[More information](info)

##### Description
Print a message with information and help.

##### Syntax
`/info`


## /data
[More information](data)

##### Description
Show some gathered statistics from the bot.

##### Syntax
`/data`


## /track-sell-order
[More information](track-sell-order)

##### Description
This will enable sell price tracking for an item in a specific region, you will get notifications of changes in the item price.

##### Syntax
`/track-sell-order <item-name> [region-name] [limit-amount]`


## /track-buy-order
[More information](track-buy-order)

##### Description
This will enable buy price tracking for an item in a specific region, you will get notifications of changes in the item price.

##### Syntax
`/track-buy-order <item-name> [region-name] [limit-amount]`


## /track-list
[More information](track-list)

##### Description
List all orders that are being tracked by MarketBot for you.

##### Syntax
`/track-list`


## /track-clear
[More information](track-clear)

##### Description
Clear all price tracking entries in a channel, optionally for a specific item.

##### Syntax
`/track-clear [item-name]`

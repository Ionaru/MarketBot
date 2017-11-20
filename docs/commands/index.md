#### [MarketBot](/MarketBot) > [commands](/MarketBot/commands)

---

##### Syntax information
`<` and `>` mark a required section, the command will not work without this section.

`[` and `]` are optional sections, you can leave those out and the command will use defaults.

`[<` and `>]` mark a required section inside an optional section, this means if you include the optional section then you have to add the required section as well.

`/command-name <required item name> [/optional-modifiers <required modifier options>]`

# Commands for MarketBot

## /price
[More information](price)

##### Description
Fetch the lowest and average prices for an item, both buy and sell orders.

##### Syntax
`/price <item name> [/region <region name>]`


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
`/sell-orders <item-name> [/region <region-name>] [/limit <limit-number>]`


## /buy-orders
[More information](buy-orders)

##### Description
Show the highest buy orders for an item in a region.

##### Syntax
`/buy-orders <item-name> [/region <region-name>] [/limit <limit-number>]`


## /history
[More information](history)

##### Description
Show history information and a graph showing the average price in the last 20 days.

##### Syntax
`/history <item-name> /region <region-name>`


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


# Commands for MarketBot (old, slowly converting them all to the above style)
* `/track-sell-order <item-name> /region <region-name> /limit <limit-number>` - This will enable sell price tracking for an item in a specific region I will notify you of changes in the item price. The limit is minimum the amount of ISK the price needs to change before a notification is sent.
* `/track-buy-order <item-name> /region <region-name> /limit <limit-number>` - This will enable buy price tracking for an item in a specific region. I will notify you of changes in the item price. The limit is minimum the amount of ISK the price needs to change before a notification is sent.
* `/track-clear [item-name]` - Clear all price tracking entries in a channel, optionally for a specific item.

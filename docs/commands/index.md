###### [Back to homepage](/marketbot)

#### Commands for MarketBot
* `/price <item-name> /region <region-name>` - Fetch the lowest and average prices for an item, both buy and sell orders.
* `/item <item-name>` - Show information about an item.
* `/sell <item-name> /region <region-name> /limit <limit-number>` - Fetch the cheapest market sell orders for an item.
* `/buy <item-name> /region <region-name> /limit <limit-number>` - Fetch the highest market buy orders for an item.
* `/history <item-name> /region <region-name>` - Show history information and a graph showing the average price in the last 20 days.
* `/track-sell-order <item-name> /region <region-name> /limit <limit-number>` - This will enable sell price tracking for an item in a specific region I will notify you of changes in the item price. The limit is minimum the amount of ISK the price needs to change before a notification is sent.
* `/track-buy-order <item-name> /region <region-name> /limit <limit-number>` - This will enable buy price tracking for an item in a specific region. I will notify you of changes in the item price. The limit is minimum the amount of ISK the price needs to change before a notification is sent.
* `/track-clear [item-name]` - Clear all price tracking entries in a channel, optionally for a specific item.
* `/data /limit <limit-number>` - Show a list of the top searched items.
* `/info` - Print a message with information and help.

*`/region` and `/limit` are always optional.*

 <!-- #### Aliases for the above commands -->
 <!-- * `/price` `/p` `/value` -->
 <!-- * `/sell-orders` `/so` `/sell` `/s` -->
 <!-- * `/buy-orders` `/bo` `/buy` `/b` -->
 <!-- * `/data` `/d` -->
 <!-- * `/info` `/i` `/about` `/help` -->
 <!-- * `/region` `/r` -->
 <!-- * `/limit` `/l` -->

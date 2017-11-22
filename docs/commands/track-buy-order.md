#### [MarketBot](/MarketBot) > [commands](/MarketBot/commands) > [track-buy-order](/MarketBot/commands/track-buy-order)

---

## /track-buy-order
##### Description
The /track-buy-order command enables buy price tracking for an item in a specific region. You will receive a notification when the highest buy price for an item has changed.
The notification will say the amount it has changed, the new price and the amount of items on demand at the new price.

##### Note
The default region is The Forge and the default limit is 1.00 ISK.

##### Syntax
`/track-buy-order <item-name> [/region <region-name>] [/limit <limit-number>]`

##### Aliases
* `/tbo`

##### Examples
`/track-buy-order technetium /region querious /limit 0.04`
`/tbo azbel /limit 4500000`
`/track-buy-order amarr fuel block /region khanid`
`/track-buy-order veldspar`

##### Result
![Track-buy-orders command result](https://user-images.githubusercontent.com/3472373/33133916-94204568-cf9e-11e7-8a7a-5be19ba7a293.png)

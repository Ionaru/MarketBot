#### [MarketBot](/MarketBot) > [commands](/MarketBot/commands) > [track-sell-order](/MarketBot/commands/track-sell-order)

---

## /track-sell-order
##### Description
The /track-sell-order command enables sell price tracking for an item in a specific region. You will receive a notification when the lowest sell price for an item has changed.
The notification will say the amount it has changed, the new price and the amount of items for sale at the new price.

##### Note
The default region is The Forge and the default limit is 1.00 ISK.

**This command can not show or track sell orders in citadels!**
##### Syntax
`/track-sell-order <item-name> [/region <region-name>] [/limit <limit-number>]`

##### Aliases
* `/tso`
* `/track`

##### Examples
`/track-sell-order tritanium /region domain /limit 0.01`
`/tso plex`
`/track machariel /limit 7`
`/track-sell-order liquid ozone /region metropolis`

##### Result
![Track-sell-orders command result](https://user-images.githubusercontent.com/3472373/33133916-94204568-cf9e-11e7-8a7a-5be19ba7a293.png)

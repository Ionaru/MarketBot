#### [MarketBot](/MarketBot) > [commands](/MarketBot/commands) > [buy-orders](/MarketBot/commands/buy-orders)

---

## /buy-orders
##### Description
The /buy-orders command will fetch the highest buy orders for an item in a region. It will show the price, the amount of items in the order, the range of the order and the location.

If the buy order has a minimum amount of items required, then a warning in bold text will be shown.

##### Note
The default region is The Forge and the default limit is 5. If you choose a limit higher than will fit in a single message, then the bot will only print the amount that will fit.

##### Syntax
`/buy-orders <item-name> [/region <region-name>] [/limit <limit-number>]`

##### Aliases
* `/buy`
* `/bo`
* `/b`

##### Examples
`/buy-orders passive targeting array I /region domain /limit 7`
`/bo helium isotopes /region providence`
`/buy tritanium /limit 7`
`/b 150mm railgun I`

##### Result
![Buy-orders command result](https://user-images.githubusercontent.com/3472373/32986178-421f535a-cccc-11e7-815a-04ab9c1d77d9.png)

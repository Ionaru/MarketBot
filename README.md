# Discord MarketBot for EVE Online
[![MarketBot CD](https://img.shields.io/github/actions/workflow/status/Ionaru/MarketBot/cd.yml?branch=master&style=for-the-badge)](https://github.com/Ionaru/MarketBot/actions/workflows/cd.yml)
[![codecov](https://img.shields.io/codecov/c/github/Ionaru/MarketBot/master.svg?style=for-the-badge)](https://codecov.io/gh/Ionaru/MarketBot)
[![Internet spaceships are serious business](https://img.shields.io/badge/internet%20spaceships-are%20serious%20business-2F849E.svg?style=for-the-badge)](https://www.eveonline.com/)

## General information
The purpose of this bot is to get fast information on the EVE Online market for specific items and in specific regions.

It uses a combination of data from [Fuzzwork](https://www.fuzzwork.co.uk/) and the [EVE Swagger Interface](https://esi.evetech.net/) provided by CCP.

## Usage
[Add this bot to your Discord server!](https://discord.com/oauth2/authorize?client_id=302011421523443713&scope=bot+applications.commands) or alternatively you can [try it out first on my dev server](https://discord.gg/uza8mpH).

#### Bot commands
[Commands can be found on the MarketBot website's commands page.](https://ionaru.github.io/MarketBot/commands/)

#### Discord permissions
[Required permissions can be found on the MarketBot website's permissions page.](https://ionaru.github.io/MarketBot/permissions/)

## Screenshots
MarketBot in action!

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
It is possible to self-host this bot. It requires Docker with the Compose v2 plugin.

### Step one: Creating a bot user
1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications) and create a new application.
2. On **General Information**, copy the **Application ID** and the **Public Key**.
3. Go to **Bot**, then **Reset Token**, and copy the token. Discord only shows it once.
4. Under **OAuth2 > URL Generator**, select the `bot` and `applications.commands` scopes, and the
   `View Channel`, `Send Messages`, `Embed Links` and `Attach Files` bot permissions.
5. Open the generated URL in your browser and add the bot to your server.

### Step two: Installing the bot
1. Install [Docker Engine](https://docs.docker.com/engine/install/), which includes the Compose v2 plugin.
2. Clone this repository, or [download](https://github.com/Ionaru/MarketBot/archive/master.zip) and extract it.
3. Create the configuration file. MarketBot reads its credentials from an ini file rather than from
   the environment:

   ```bash
   mkdir -p /absolute/path/to/your/config
   cp config/marketbot.template.ini /absolute/path/to/your/config/marketbot.ini
   ```

   Edit that copy and fill in the `[discord]` `token`, `id` and `key` from step one.

4. Create a `.env` file in the root of the checkout:

   ```dotenv
   MARKETBOT_CONFIG_VOLUME=/absolute/path/to/your/config
   MARKETBOT_DATA_VOLUME=/absolute/path/to/your/data
   ```

5. Start the bot:

   ```bash
   docker compose --project-name marketbot --env-file "$PWD/.env" --file deploy/compose.yaml up -d
   ```

   The `--env-file` flag is not optional. The Compose file lives in `deploy/`, so Compose looks for a
   `.env` next to it and will **not** find the one in the root of the checkout. Without the flag the
   bot runs `:latest` against empty Docker named volumes, with neither your configuration nor your
   database.

6. Check that it came up:

   ```bash
   docker compose --project-name marketbot --env-file "$PWD/.env" --file deploy/compose.yaml logs -f
   ```

Run `docker compose ... config` instead of `up` at any point to print the fully resolved
configuration. That is the quickest way to confirm your directories are what you expect: both
volumes should show as `type: bind` pointing at your paths. If either says `type: volume`, the
`.env` is not being read.

The first start is slow. MarketBot downloads and caches every EVE Online item, region and system
before it connects to Discord, which takes a few minutes. Later starts reuse the cache in
`/app/data`.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MARKETBOT_CONFIG_VOLUME` | No | Directory holding `marketbot.ini`. Defaults to a Docker named volume. |
| `MARKETBOT_DATA_VOLUME` | No | Where MarketBot keeps its database and caches. Defaults to a Docker named volume. |
| `MARKETBOT_GIT_REVISION` | No | Image tag to run. Defaults to `latest`. |
| `DEBUG` | No | Set to `marketbot*` or `*` for extra logging output. |
| `DISABLE_TRACKING_CYCLE` | No | Set to `true` to stop the periodic price-tracking checks. |

Everything else, including the Discord credentials, lives in `config/marketbot.ini`.

Both volume variables must be either left unset, which uses the named volumes declared in the
Compose file, or set to an **absolute** host path. A relative path such as `./data` resolves against
`deploy/`, not the root of the checkout. The container runs as the unprivileged `node` user, so a
host directory needs to be writable by UID 1000.

A bind-mounted config directory hides the template that ships inside the image, so `marketbot.ini`
has to be there before the first start. The bot says so and exits if it is missing.

### What lives where
`/app/data` holds the SQLite database (`marketbot.db`) with the command log and the price-tracking
subscriptions, the cached item, region and system lists, the ESI response cache, and the graph
images generated by `/history`. Only the database is irreplaceable; everything else rebuilds itself.

### A note on architecture
The prebuilt `ghcr.io/ionaru/marketbot` images are `linux/amd64` only. On other architectures the
pull fails with a manifest error, and you will need to build the image locally instead:

```bash
docker compose --project-name marketbot --env-file "$PWD/.env" --file deploy/compose.yaml up -d --build
```

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
Want to contribute? Awesome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

MarketBot is written in TypeScript and requires **Node.js 24 or newer**.

```bash
npm ci         # Install dependencies
npm test       # Lint and run the unit tests
npm run build  # Compile TypeScript to dist/
npm start      # Build and run the bot
```

Running the bot outside Docker still needs `config/marketbot.ini`; copy it from
`config/marketbot.template.ini` in the same directory.

The `/history` command renders its graph by screenshotting an SVG with Puppeteer, so it needs a
Chromium available. Inside the image that is Debian's `chromium` package, pointed at with
`PUPPETEER_EXECUTABLE_PATH`; locally, `npx puppeteer browsers install chrome` gets you one.

# Special thanks
[![Bugsnag](https://images.typeform.com/images/QKuaAssrFCq7/image/default)](https://bugsnag.com)

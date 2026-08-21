# MarketBot Changelog
All notable changes to MarketBot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Deployment to a Debian host via GHCR and SSH `docker compose`, replacing TeamCity
- Dependabot configuration for npm, GitHub Actions and Docker updates
- A `CONTRIBUTING.md`
- A startup check that reports a missing `config/marketbot.ini` in plain language. A bind-mounted
  config directory hides the template inside the image, so this used to surface as an `ENOENT` on
  `copyfile` from inside the config library

### Changed
- Moved the Docker setup to `deploy/`, with a Compose v2 `compose.yaml`
- The image is built on Debian trixie and installs Debian's own `chromium`. The old image added
  Google's apt repository with `apt-key add`, a command Debian has removed, so it could no longer be
  built at all. Trixie rather than bookworm because sqlite3's prebuilt binary needs GLIBC 2.38
- The container runs as the unprivileged `node` user, and with an init process to reap the Chromium
  renderers that `/history` forks
- Updated to Node.js 24, TypeScript 5.9, discord.js 14, slash-create 7, TypeORM 0.3, puppeteer 25,
  sqlite3 6, axios 1, d3 7 and jest 30
- Embeds are built as slash-create's own structures rather than discord.js ones. They were only ever
  sent through slash-create, and the mismatch needed a `@ts-ignore` at every call site
- `npm audit --omit=dev` reports no vulnerabilities and now gates CI. It had been commented out
  because jsdom 9, pulled in by d3-node 2, carried `request` and `tough-cookie` advisories with no
  fix available in range
- Command logging no longer appends `#0` to usernames, Discord having retired discriminators

### Removed
- `@ionaru/array-utils`, which went ESM-only and only ever provided two sorting functions. They are
  now `src/helpers/sort.ts`
- The `disconnect` handler, which listened for an event that has not existed since discord.js v12
  and forced a destroy/login cycle that fought discord.js's own reconnection. Shard disconnects are
  reported instead

### Fixed
- The self-hosting instructions, which described a `docker-compose up` in a directory containing no
  Compose file, and an invite link on a retired domain

### Note
- `eslint-plugin-unicorn`'s recommended set grew considerably between v42 and v51. The new rules flag
  pre-existing style throughout `src/` rather than anything in this release, and are switched off in
  `.eslintrc.json` for now. Adopting them is a separate cleanup

## [3.0.0] - 2022-04-02
### BREAKING CHANGES
- Removed Winston logging from the bot, fully using stderr, stdout and `debug` now.
- Switched from Sentry to Bugsnag for error logging.
- Rewrote all commands as Discord Slash Commands.

### Added
- A new generic command class.
- Ported price command to new command class.
- Ported info command to new command class.
- Ported data command to new command class.
- /track-list command.

### Changed
- Improved item guessing with unpublished items in the results.
- Optimized item guessing. Unpublished item filtering will exit on the first good item found.
- Started switching to debug and native logging  instead of Winston
- Switched to esi-service package instead of local code.

## [2.3.0] - 2019-04-23
### Added
- 1% of spacing to the top and bottom of the `/history` graphs.
- The name of the region to the `/buy` output text when a citadel name is unknown.

### Changed
- Replaced local configurator script with configurator package from npm.
- Replaced local array sorting script with one from array-utils package from npm.

### Fixed
- Error when Fuse returns `undefined`.

## [2.2.0] - 2018-11-21
### BREAKING CHANGES
- `botlog.db` has been renamed and moved to `data/marketbot.db`.
- Configuration file `config/marketbot.ini` needs to be created from `config/marketbot.template.ini` and edited.
- `config/token.txt` has been removed and merged into the new `config/marketbot.ini`.
- The `typeIDs.yaml` file from the SDE is no longer needed.
- The `Embed links` Discord permission is now required for the `/price` and `/info` commands.

### Added
- A new configuration system with more options.
- Performance logging to Elastic APM.
- Error logging to Sentry.
- Automatic updates to region, system and item caches.
- Information about required bot permissions in documentation.
- Improvements to the item guessing system
    - Can now match multiple words: "avatar jubilee skin" -> "Avatar Imperial Jubilee SKIN".
    - Can match items with quotes in their name: "excavator mining drone" -> "'Excavator' Mining Drone".

### Changed
- Graphs from `/history` are now dark and more eye-pleasing.
- Non-published items are no longer included in any command result.
- `/price` command output has a new look.
- `/item` command output has a new look.

## [1.3.1] - 2017-11-28
### Added
- Bot version number in `/info` and in console output.

### Fixed
- `/track-clear` executing `/track-sell-orders` instead ([#2]).

## [1.3.0] - 2017-11-22
### Added
- Command documentation on <https://ionaru.github.io/MarketBot/commands/>.
- `/history` command, used to get information about the price history of an item.
- `/item` command, used to get info and details about an item.
- Ability for `/track-clear` to remove entries of a single item, instead of everything.

### Changed
- Api now fully uses EVEMarketer instead of EVE-Central.
- Tracking commands can now be used in public channels.
- Slowly implementing a new ORM: TypeORM instead of Sequelize.

### Removed
- Time limit for tracking commands.

## [1.2.0] - 2017-09-21
### Added
- Backup API for `/price` command, now when EVE-Central is unavailable, EVEMarketer is used.

### Changed
- Item search is now only marked as a "guess" when Fuse is used.

## [1.1.0] - 2017-09-05
### Added
- Price tracking command `/track-sell-order` & `/track-buy-order`.

### Fixed
- A lot of bugs.

### Removed
- All swagger client code and implemented API calls into the bot source.

## [1.0.0] - 2017-06-17
First stable release of MarketBot.

<!-- Linked issues -->
[#2]: https://github.com/Ionaru/MarketBot/issues/2

<!-- Linked versions -->
[Unreleased]: https://github.com/Ionaru/MarketBot/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/Ionaru/MarketBot/compare/2.3.0...v3.0.0
[2.3.0]: https://github.com/Ionaru/MarketBot/compare/2.2.0...2.3.0
[2.2.0]: https://github.com/Ionaru/MarketBot/compare/1.3.1...2.2.0
[1.3.1]: https://github.com/Ionaru/MarketBot/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/Ionaru/MarketBot/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/Ionaru/MarketBot/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/Ionaru/MarketBot/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/Ionaru/MarketBot/compare/4f86fdcc...1.0.0

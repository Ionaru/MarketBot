# MarketBot Changelog
All notable changes to MarketBot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
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
[Unreleased]: https://github.com/Ionaru/MarketBot/compare/2.3.0...HEAD
[2.3.0]: https://github.com/Ionaru/MarketBot/compare/2.2.0...2.3.0
[2.2.0]: https://github.com/Ionaru/MarketBot/compare/1.3.1...2.2.0
[1.3.1]: https://github.com/Ionaru/MarketBot/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/Ionaru/MarketBot/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/Ionaru/MarketBot/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/Ionaru/MarketBot/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/Ionaru/MarketBot/compare/4f86fdcc...1.0.0

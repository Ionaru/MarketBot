#!/bin/sh
# The bot reads its credentials from config/marketbot.ini. When /app/config is a bind
# mount, it shadows the template baked into the image, so a missing configuration
# surfaces from deep inside the config library as:
#
#   Error: ENOENT: no such file or directory, copyfile
#     'config/marketbot.template.ini' -> 'config/marketbot.ini'
#
# That is a confusing way to learn you forgot a file, and it is the single most
# likely thing to go wrong on a first deploy. Say so plainly instead.
#
# Only the bot itself is checked; ad-hoc commands (a debugging shell, a one-off
# node script) still run without a configuration.
set -e

case "$*" in
    *dist/src/index.js*)
        if [ ! -f /app/config/marketbot.ini ]; then
            echo "MarketBot: no marketbot.ini found in the mounted config directory." >&2
            echo "" >&2
            echo "Copy config/marketbot.template.ini from the repository into that directory" >&2
            echo "as marketbot.ini, then set at least the [discord] token, id and key." >&2
            exit 1
        fi
        ;;
esac

exec "$@"

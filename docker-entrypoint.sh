#!/bin/sh
set -e

# If first argument is "http", run HTTP server
if [ "$1" = "http" ]; then
    exec node server/http-server.js
fi

# If no arguments or first argument is "stdio", run stdio MCP server
if [ $# -eq 0 ] || [ "$1" = "stdio" ]; then
    exec node server/index.js
fi

# Otherwise, execute whatever command was passed
exec "$@"

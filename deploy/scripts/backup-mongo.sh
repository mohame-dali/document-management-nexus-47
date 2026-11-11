#!/usr/bin/env bash
# [NON TESTÉ, à exécuter sur une VM de recette]
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "${SCRIPT_DIR}/backup-all.sh" "$@"

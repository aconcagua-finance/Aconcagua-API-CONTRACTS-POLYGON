#!/usr/bin/env bash
set -e

echo "testing... on $HARDHAT_NETWORK_NAME"

# jest $@ --expand --setupFiles dotenv/config

jest --selectProjects localTests --expand --setupFiles dotenv/config

echo "test complete!"


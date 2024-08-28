#!/usr/bin/env bash
set -e

echo "testing..."

# Set the Hardhat network to localhost
export HARDHAT_NETWORK_NAME=localhost

jest $@ --expand --setupFiles dotenv/config

echo "test complete!"


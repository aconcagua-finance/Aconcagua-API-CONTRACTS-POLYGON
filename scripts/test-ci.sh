#!/usr/bin/env bash
set -e

echo "Running CI tests on Sepolia network..."
export HARDHAT_NETWORK_NAME=sepolia
jest --selectProjects ciTests --collectCoverage --colors --forceExit --setupFiles dotenv/config
codecov --token=${CODECOV_TOKEN}

echo "CI test complete!"

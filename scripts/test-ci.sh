#!/usr/bin/env bash
set -e

echo "Running CI tests on Sepolia network..."
export HARDHAT_NETWORK_NAME=sepolia
npm run test -- --collectCoverage --colors --forceExit
codecov --token=${CODECOV_TOKEN}

echo "CI test complete!"

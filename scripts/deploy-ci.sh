#!/usr/bin/env bash
set -e

echo "deploying..."

# echo "//registry.npmjs.org/:_authToken=${VS_GITHUB_NPM_TOKEN}" >> .npmrc
# echo "@abdalamichel:registry=https://npm.pkg.github.com/:_authToken=${VS_GITHUB_NPM_TOKEN}" >> .npmrc
# echo "@abdalamichel:registry=https://npm.pkg.github.com/:_authToken=${VS_GITHUB_NPM_TOKEN}" >> .npmrc
# echo "//npm.pkg.github.com/:_authToken=${VS_GITHUB_NPM_TOKEN}" >> .npmrc
 
 # ~/.npmrc

rm -f .npmrc
touch .npmrc

echo "//npm.pkg.github.com/:_authToken=${VS_GITHUB_NPM_TOKEN}" >> .npmrc

rm -f .env
touch .env

echo "ENVIRONMENT="${ENVIRONMENT} >> .env
echo "FIREB_PROJECT_ID="${FIREB_PROJECT_ID} >> .env
echo "FIREB_API_KEY="${FIREB_API_KEY} >> .env
echo "FIREB_AUTH_DOMAIN="${FIREB_AUTH_DOMAIN} >> .env
echo "FIREB_STORAGE_BUCKET="${FIREB_STORAGE_BUCKET} >> .env
echo "FIREB_MESSAGING_SENDER_ID="${FIREB_MESSAGING_SENDER_ID} >> .env
echo "FIREB_APP_ID="${FIREB_APP_ID} >> .env
echo "FIREB_MEASURAMENT_ID="${FIREB_MEASURAMENT_ID} >> .env

echo "SYS_ADMIN_EMAIL="${SYS_ADMIN_EMAIL} >> .env
echo "GMAIL_EMAIL="${GMAIL_EMAIL} >> .env
echo "GMAIL_EMAIL_BCC="${GMAIL_EMAIL_BCC} >> .env
echo "GMAIL_APP_PASSWORD="${GMAIL_APP_PASSWORD} >> .env
echo "NEW_USERS_TEMP_PASSWORD="${NEW_USERS_TEMP_PASSWORD} >> .env

echo "DEPLOYER_PRIVATE_KEY="${DEPLOYER_PRIVATE_KEY} >> .env
echo "SWAPPER_PRIVATE_KEY="${SWAPPER_PRIVATE_KEY} >> .env
echo "ALCHEMY_API_KEY="${ALCHEMY_API_KEY} >> .env
echo "HARDHAT_API_URL="${HARDHAT_API_URL} >> .env
echo "HARDHAT_NETWORK_NAME="${HARDHAT_NETWORK_NAME} >> .env
echo "PROVIDER_NETWORK_NAME="${PROVIDER_NETWORK_NAME} >> .env
echo "POLYGONSCAN_API_KEY="${POLYGONSCAN_API_KEY} >> .env
echo "ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY} >> .env
echo "USDC_TOKEN_ADDRESS="${USDC_TOKEN_ADDRESS} >> .env
echo "USDT_TOKEN_ADDRESS="${USDT_TOKEN_ADDRESS} >> .env
echo "USDM_TOKEN_ADDRESS="${USDM_TOKEN_ADDRESS} >> .env
echo "WBTC_TOKEN_ADDRESS="${WBTC_TOKEN_ADDRESS} >> .env
echo "WETH_TOKEN_ADDRESS="${WETH_TOKEN_ADDRESS} >> .env
echo "QUOTER_CONTRACT_ADDRESS="${QUOTER_CONTRACT_ADDRESS} >> .env
echo "SWAP_ROUTER_V3_ADDRESS="${SWAP_ROUTER_V3_ADDRESS} >> .env
echo "SWAPPER_ADDRESS="${SWAPPER_ADDRESS} >> .env
echo "OPERATOR1_ADDRESS="${OPERATOR1_ADDRESS} >> .env
echo "OPERATOR2_ADDRESS="${OPERATOR2_ADDRESS} >> .env
echo "OPERATOR3_ADDRESS="${OPERATOR3_ADDRESS} >> .env
echo "DEFAULT_RESCUE_WALLET_ADDRESS="${DEFAULT_RESCUE_WALLET_ADDRESS} >> .env
echo "DEFAULT_WITHDRAW_WALLET_ADDRESS="${DEFAULT_WITHDRAW_WALLET_ADDRESS} >> .env

# QA only
echo "ALIQ1_ADDRESS="${ALIQ1_ADDRESS} >> .env
echo "ALIQ2_ADDRESS="${ALIQ2_ADDRESS} >> .env

echo "GAS_STATION_URL="${GAS_STATION_URL} >> .env
echo "COINGECKO_URL="${COINGECKO_URL} >> .env
echo "KRAKEN_URL="${KRAKEN_URL} >> .env
echo "BINANCE_URL="${BINANCE_URL} >> .env
echo "API_PATH_QUOTES="${API_PATH_QUOTES} >> .env

# Set Credentials
echo "${FIREBASE_SERVICE_ACCOUNT_KEY}" > /tmp/serviceAccountKey.json
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/serviceAccountKey.json
echo "Deploy proyecto $FIREB_PROJECT_ID"

firebase deploy --project $FIREB_PROJECT_ID --only functions:vaultsPolygon,functions:cronFetchVaultsBalances,functions:onVaultUpdate,functions:onVaultCreate,functions:market

echo "deploy complete!"

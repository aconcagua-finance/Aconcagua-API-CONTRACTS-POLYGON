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

echo "CONFIG_NETWORK_COLLECTION="${CONFIG_NETWORK_COLLECTION} >> .env
echo "DEPLOYER_PRIVATE_KEY_POLYGON="${DEPLOYER_PRIVATE_KEY_POLYGON} >> .env
echo "DEPLOYER_PRIVATE_KEY_ROOTSTOCK="${DEPLOYER_PRIVATE_KEY_ROOTSTOCK} >> .env
echo "SWAPPER_PRIVATE_KEY_POLYGON="${SWAPPER_PRIVATE_KEY_POLYGON} >> .env
echo "SWAPPER_PRIVATE_KEY_ROOTSTOCK="${SWAPPER_PRIVATE_KEY_ROOTSTOCK} >> .env

echo "COINGECKO_URL="${COINGECKO_URL} >> .env
echo "KRAKEN_URL="${KRAKEN_URL} >> .env
echo "BINANCE_URL="${BINANCE_URL} >> .env
echo "API_PATH_QUOTES="${API_PATH_QUOTES} >> .env

# Set Credentials
echo "${FIREBASE_SERVICE_ACCOUNT_KEY}" > /tmp/serviceAccountKey.json
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/serviceAccountKey.json
echo "Deploy proyecto $FIREB_PROJECT_ID"

firebase deploy --project $FIREB_PROJECT_ID --only functions:vaultsPolygon,functions:cronFetchVaultsBalances,functions:onVaultUpdate,functions:onVaultCreate,functions:sendEmailBalance,functions:market

echo "deploy complete!"

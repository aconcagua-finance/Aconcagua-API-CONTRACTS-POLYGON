const admin = require('firebase-admin'); // Para Firestore
const {
  CONFIG_NETWORK_COLLECTION,
  DEPLOYER_PRIVATE_KEY_POLYGON,
  DEPLOYER_PRIVATE_KEY_ROOTSTOCK,
  SWAPPER_PRIVATE_KEY_POLYGON,
  SWAPPER_PRIVATE_KEY_ROOTSTOCK,
} = require('../../config/appConfig');

// Crear un mapa de variables
const envVariablesMap = {
  DEPLOYER_PRIVATE_KEY_POLYGON,
  DEPLOYER_PRIVATE_KEY_ROOTSTOCK,
  SWAPPER_PRIVATE_KEY_POLYGON,
  SWAPPER_PRIVATE_KEY_ROOTSTOCK,
};

function isBasicAddressFormat(address) {
  // Verifica que el valor sea un string, comience con "0x", tenga 42 caracteres y sea hexadecimal
  const isValidHex = /^(0x)?[0-9a-fA-F]{40}$/i.test(address);
  return isValidHex && address.length === 42 && address.startsWith('0x');
}

// Mapa de equivalencias de redes
export const networkEquivalences = {
  SEPOLIA: 'POLYGON',
  ROOTSTOCKTESTNET: 'ROOTSTOCK',
  // Agrega más equivalencias de redes aquí si es necesario
};

export async function getEnvVariable(variableName, networkName = null) {
  const secretsVariables = ['DEPLOYER_PRIVATE_KEY', 'SWAPPER_PRIVATE_KEY'];

  // Normalize network name once at the beginning
  const normalizedNetworkName = networkName ?
    networkEquivalences[networkName.toUpperCase()] || networkName.toUpperCase() :
    'GENERAL';

  try {
    if (secretsVariables.includes(variableName)) {
      const fullVariableName = `${variableName}_${normalizedNetworkName}`;
      const envValue = envVariablesMap[fullVariableName];

      if (!envValue) {
        throw new Error(`La variable ${fullVariableName} no está definida en el entorno`);
      }

      return envValue;
    }

    // Use the already normalized network name
    const docRef = admin.firestore().collection(CONFIG_NETWORK_COLLECTION).doc(normalizedNetworkName);

    const doc = await docRef.get();

    if (!doc.exists) {
      console.warn(`El documento ${normalizedNetworkName} no se encontró en Firestore`);
      return null;
    }

    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, variableName)) {
      console.warn(
        `La variable ${variableName} no se encontró en el documento ${normalizedNetworkName}`
      );
      return null;
    }

    const value = data[variableName];
    return value;
  } catch (error) {
    console.error(
      `Error al obtener la variable ${variableName} en el documento ${normalizedNetworkName}:`,
      error
    );
    throw error;
  }
}

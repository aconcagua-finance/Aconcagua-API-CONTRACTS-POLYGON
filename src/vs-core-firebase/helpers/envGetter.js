const admin = require('firebase-admin'); // Para Firestore
const {
  CONFIG_NETWORK_COLLECTION,
  DEPLOYER_PRIVATE_KEY_POLYGON,
  DEPLOYER_PRIVATE_KEY_ROOTSTOCK,
} = require('../../config/appConfig');

// Crear un mapa de variables
const envVariablesMap = {
  DEPLOYER_PRIVATE_KEY_POLYGON,
  DEPLOYER_PRIVATE_KEY_ROOTSTOCK,
};

const hre = require('hardhat');

function isBasicAddressFormat(address) {
  // Verifica que el valor sea un string, comience con "0x", tenga 42 caracteres y sea hexadecimal
  const isValidHex = /^(0x)?[0-9a-fA-F]{40}$/i.test(address);
  return isValidHex && address.length === 42 && address.startsWith('0x');
}

exports.getEnvVariable = async function (variableName, networkName = null) {
  // Lista de variables que deben ser devueltas desde los secretos de GitHub
  const secretsVariables = ['DEPLOYER_PRIVATE_KEY', 'SWAPPER_PRIVATE_KEY'];

  // Mapa de equivalencias de redes
  const networkEquivalences = {
    SEPOLIA: 'POLYGON',
    ROOTSTOCKTESTNET: 'ROOTSTOCK',
    // Agrega más equivalencias de redes aquí si es necesario
  };

  let finalNetworkName;

  try {
    if (secretsVariables.includes(variableName)) {
      // Si es una de las variables sensibles, construir el nombre de la variable según la red final
      const normalizedNetworkName = networkName ?
        networkEquivalences[networkName.toUpperCase()] || networkName.toUpperCase() :
        'GENERAL';

      // Construir el nombre completo de la variable según la red (por ejemplo, DEPLOYER_PRIVATE_KEY_POLYGON)
      const fullVariableName = `${variableName}_${normalizedNetworkName}`;

      // Obtener el valor de la variable de entorno
      const envValue = envVariablesMap[fullVariableName];
      console.log(' fullVariableName es ', fullVariableName);
      console.log(' envVariablesMap[fullVariableName] es ', envVariablesMap[fullVariableName]);

      if (!envValue) {
        throw new Error(`La variable ${fullVariableName} no está definida en el entorno`);
      }

      return envValue; // Devuelve el valor desde las variables de entorno
    }

    // Si no se proporciona networkName o es null, usar 'GENERAL' para buscar en Firestore
    if (!networkName) {
      finalNetworkName = 'GENERAL';
    } else {
      // Convertir networkName a mayúsculas para consistencia
      const normalizedNetworkName = networkName.toUpperCase();

      // Verificar si la red tiene una equivalencia en el mapa
      finalNetworkName = networkEquivalences[normalizedNetworkName] || normalizedNetworkName;
    }

    // Formar la referencia al documento usando el nombre de la red (o GENERAL si es null)
    const docRef = admin
      .firestore()
      .collection(CONFIG_NETWORK_COLLECTION) // Nombre de la colección
      .doc(finalNetworkName); // Documento de la red (ROOTSTOCK, POLYGON, GENERAL, etc.)

    const doc = await docRef.get();

    if (!doc.exists) {
      // Advertencia si el documento de la red no existe
      console.warn(`El documento ${finalNetworkName} no se encontró en Firestore`);
      return null;
    }

    // Verifica si la variable existe en el documento de la red o GENERAL
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, variableName)) {
      console.warn(
        `La variable ${variableName} no se encontró en el documento ${finalNetworkName}`
      );
      return null;
    }

    // Obtener el valor de la variable
    const value = data[variableName];

    // **3. Retorna el valor (con checksum si es una dirección)**
    return value;
  } catch (error) {
    // Manejo de errores si falla la lectura desde Firestore o el entorno
    console.error(
      `Error al obtener la variable ${variableName} en el documento ${finalNetworkName}:`,
      error
    );
    throw error; // Lanza el error para que sea gestionado adecuadamente
  }
};

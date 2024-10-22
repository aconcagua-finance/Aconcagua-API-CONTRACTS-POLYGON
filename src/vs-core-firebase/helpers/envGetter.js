const admin = require('firebase-admin'); // Para Firestore
const { CONFIG_NETWORK_COLLECTION } = require('../../config/appConfig');
const hre = require('hardhat');

// Lista de variables que deben ser devueltas desde los secretos de GitHub
const secretsVariables = ['DEPLOYER_PRIVATE_KEY', 'SWAPPER_PRIVATE_KEY'];

function isBasicAddressFormat(address) {
  // Verifica que el valor sea un string, comience con "0x", tenga 42 caracteres y sea hexadecimal
  const isValidHex = /^(0x)?[0-9a-fA-F]{40}$/i.test(address);
  return isValidHex && address.length === 42 && address.startsWith('0x');
}

exports.getEnvVariable = async function (variableName, networkName = null) {
  // Definir el valor por defecto para networkFallback dentro de la función
  const networkFallback = 'POLYGON';
  let finalNetworkName;

  try {
    // **1. Verificar si la variable solicitada es una de los secretos definidos**
    if (secretsVariables.includes(variableName)) {
      // Si es una de las variables sensibles, siempre devolver desde el entorno
      const envValue = process.env[variableName];
      if (!envValue) {
        throw new Error(`La variable ${variableName} no está definida en el entorno`);
      }
      return envValue; // Devuelve el valor desde las variables de entorno
    }

    // **2. Si no es una de las variables de secretos, buscar en Firestore**

    // Si networkName es SEPOLIA, usar POLYGON como fallback para los parámetros
    if (networkName && networkName.toUpperCase() === 'SEPOLIA') {
      finalNetworkName = 'POLYGON';
    } else {
      // Si networkName es null o undefined, usar el fallback POLYGON
      finalNetworkName = networkName ? networkName.toUpperCase() : networkFallback;
    }

    // Formar la referencia al documento usando el nombre de la red (ya sea proporcionada o el fallback)
    const docRef = admin
      .firestore()
      .collection(CONFIG_NETWORK_COLLECTION) // Nombre de la colección
      .doc(finalNetworkName); // Documento de la red (ROOTSTOCK, POLYGON, etc.)

    const doc = await docRef.get();

    if (!doc.exists) {
      // Advertencia si el documento de la red no existe
      console.warn(`La red ${finalNetworkName} no se encontró en Firestore`);
      return null;
    }

    // Verifica si la variable existe en el documento de la red
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, variableName)) {
      console.warn(`La variable ${variableName} no se encontró en la red ${finalNetworkName}`);
      return null;
    }

    // Obtener el valor de la variable
    const value = data[variableName];

    // **3. Retorna el valor (con checksum si es una dirección)**
    return value;
  } catch (error) {
    // Manejo de errores si falla la lectura desde Firestore o el entorno
    console.error(
      `Error al obtener la variable ${variableName} en la red ${finalNetworkName}:`,
      error
    );
    throw error; // Lanza el error para que sea gestionado adecuadamente
  }
};

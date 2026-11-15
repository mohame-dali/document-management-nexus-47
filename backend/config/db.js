const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const dbUri = process.env.MONGODB_URI;

    if (!dbUri) {
      if (isProduction) {
        console.error('🔴 FATAL: MONGODB_URI est absent en production. Arrêt du serveur.');
        process.exit(1);
      }
      console.warn('[Database] MONGODB_URI non défini — démarrage hors base autorisé uniquement hors production.');
      return null;
    }

    console.log('[Database] Connexion à MongoDB en cours...');
    const isLocalOrStandalone = !dbUri.includes('+srv') && !dbUri.includes('replicaSet');
    const conn = await mongoose.connect(dbUri, {
      ...(isLocalOrStandalone ? { directConnection: true } : {}),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB connecté : ${conn.connection.host}`);
    return conn;
  } catch (_error) {
    if (isProduction) {
      console.error('🔴 FATAL: Échec de connexion à MongoDB en production. Arrêt du serveur.');
      process.exit(1);
    }
    console.warn('[Database] MongoDB indisponible hors production.');
    return null;
  }
};

module.exports = connectDB;
connectDB.connectDB = connectDB;
connectDB.mongoose = mongoose;

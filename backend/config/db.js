const net = require('net');
const mongoose = require('mongoose');
mongoose.set('bufferCommands', false);

const isLocalHost = (hostname) =>
  hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';

const canReachTcpPort = (host, port, timeoutMs = 400) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

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

    const isLocalOrStandalone = !dbUri.includes('+srv') && !dbUri.includes('replicaSet');

    if (!isProduction && isLocalOrStandalone) {
      try {
        const parsed = new URL(dbUri);
        const host = parsed.hostname;
        const port = Number(parsed.port || 27017);
        if (isLocalHost(host)) {
          const reachable = await canReachTcpPort(host, port, 400);
          if (!reachable) {
            console.warn('[Database] MongoDB local indisponible hors production — démarrage rapide sans blocage.');
            return null;
          }
        }
      } catch (_urlErr) {
        // Poursuivre avec mongoose.connect si l'URI n'est pas parsable par URL
      }
    }

    console.log('[Database] Connexion à MongoDB en cours...');
    const conn = await mongoose.connect(dbUri, {
      ...(isLocalOrStandalone ? { directConnection: true } : {}),
      serverSelectionTimeoutMS: isProduction ? 5000 : 2000,
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

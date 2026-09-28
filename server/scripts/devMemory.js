/**
 * Development entry point that needs no local MongoDB installation.
 *
 * Starts a throwaway in-memory MongoDB, points the app at it, loads the demo
 * data and then serves the API exactly like `npm start` does. Everything lives
 * in RAM, so the database is discarded when you stop the process.
 *
 * Use `npm start` for anything you intend to keep.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  console.log('[dev:memory] starting an in-memory MongoDB (first run downloads it)...');

  const memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri('straycare');

  // Must be set before `config/env` is required, because that module reads
  // process.env once at load time. `dotenv` does not overwrite existing values,
  // so this wins over whatever MONGO_URI says in .env.
  process.env.MONGO_URI = uri;

  const app = require('../src/app');
  const env = require('../src/config/env');
  const { connectDB, disconnectDB } = require('../src/config/db');
  const { seed } = require('./seed');

  await connectDB();
  await seed({ disconnect: false });

  const server = app.listen(env.port, () => {
    console.log('');
    console.log('  StrayCare API (in-memory database)');
    console.log(`  -> http://localhost:${env.port}/api`);
    console.log(`  -> health check: http://localhost:${env.port}/api/health`);
    console.log('  -> data is NOT persisted. Use "npm start" with MongoDB for that.');
    console.log('');
  });

  const shutdown = async (signal) => {
    console.log(`\n[dev:memory] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      await memoryServer.stop().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[dev:memory] failed to start:', err);
  process.exit(1);
});

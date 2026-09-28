const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error('[db] Failed to connect to MongoDB:', err.message);
    console.error('');
    console.error('  The API needs MongoDB before it can serve any request.');
    console.error('');
    console.error('  Easiest option, no MongoDB installation required:');
    console.error('      npm run dev:memory');
    console.error('');
    console.error('  Or start MongoDB yourself and check MONGO_URI in .env, then:');
    console.error(`      current MONGO_URI: ${env.mongoUri}`);
    console.error('');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log('');
    console.log('  StrayCare API');
    console.log(`  -> http://localhost:${env.port}/api`);
    console.log(`  -> health check: http://localhost:${env.port}/api/health`);
    console.log(`  -> environment: ${env.nodeEnv}`);
    console.log('');
  });

  const shutdown = (signal) => {
    console.log(`\n[app] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();

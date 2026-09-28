const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  const { host, name } = mongoose.connection;
  console.log(`[db] MongoDB connected -> ${host}/${name}`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
}

module.exports = { connectDB, disconnectDB, mongoose };

// main.js
/* eslint-disable no-console */
const config = require('./src/config');
const { createServer } = require('./src/server');

// Initialize storage and validate encryption before starting server
try {
  console.log('🔐 Initializing secure storage...');
  const storage = require('./src/utils/storage');
  console.log('✅ Storage initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize storage:', error.message);
  console.error('💡 Please check your ENCRYPTION_KEY environment variable');
  console.error('📖 See ENCRYPTION_SETUP.md for detailed setup instructions');
  process.exit(1);
}

// Create and start the server
const server = createServer();

server.listen(config.PORT, () => {
  console.log(`Server on ${config.PUBLIC_URL}`);
  console.log(`Configure at ${config.PUBLIC_URL}/configure`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

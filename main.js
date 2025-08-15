// main.js
/* eslint-disable no-console */
const config = require('./src/config');
const { createServer } = require('./src/server');

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

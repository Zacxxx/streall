#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || 3000;

console.log('🚀 Starting Streall in production mode...');
console.log(`📡 Server will be available at http://localhost:${process.env.PORT}`);

// Start the backend server (which will also serve frontend static files)
const serverProcess = spawn('node', ['backend/server.js'], {
  stdio: 'inherit',
  cwd: path.resolve(__dirname),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT || 3000
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Streall...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Streall...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

serverProcess.on('exit', (code) => {
  console.log(`\n📊 Server process exited with code ${code}`);
  process.exit(code);
}); 
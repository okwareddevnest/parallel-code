// Main entry point for the MCP server package
const path = require('path');

module.exports = {
  // Server class for programmatic usage
  MCPServer: require('./server'),
  
  // Utility functions
  startServer: function(options = {}) {
    const serverPath = path.join(__dirname, 'server.js');
    const { spawn } = require('child_process');
    
    const port = options.port || process.env.PORT || 8080;
    const host = options.host || process.env.HOST || 'localhost';
    
    return spawn('node', [serverPath], {
      env: { ...process.env, PORT: port, HOST: host },
      stdio: options.stdio || 'inherit'
    });
  },
  
  // Package info
  version: require('./package.json').version,
  name: require('./package.json').name
};
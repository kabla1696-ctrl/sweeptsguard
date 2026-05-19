// Simple test server for SweepGuard
// Run: node test-server.js
// Open: http://localhost:3000/test-airdrop.html

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse URL
  let filePath = req.url === '/' ? '/test-airdrop.html' : req.url;
  
  // Remove query string
  filePath = filePath.split('?')[0];
  
  // Get file extension
  const ext = path.extname(filePath);
  
  // Set content type
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  // Read file
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      // Try with .html extension
      const htmlPath = fullPath + '.html';
      fs.readFile(htmlPath, (err2, data2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found: ' + filePath);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🛡️  SweepGuard Test Server`);
  console.log(`========================`);
  console.log(`\n🌐 Server running at: http://localhost:${PORT}`);
  console.log(`\n📄 Test pages:`);
  console.log(`   - http://localhost:${PORT}/test-airdrop.html`);
  console.log(`\n💡 Press Ctrl+C to stop\n`);
});

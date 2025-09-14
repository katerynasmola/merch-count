const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

// Функція для створення запиту
function makeRequest(targetUrl, res) {
  const parsedUrl = url.parse(targetUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Proxy Server)'
    }
  };

  const client = parsedUrl.protocol === 'https:' ? https : http;
  
  const req = client.request(options, (response) => {
    // Додаємо CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');
    
    response.pipe(res);
  });

  req.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(500);
    res.end('Proxy error: ' + err.message);
  });

  req.end();
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Обробляємо CORS preflight запити
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.writeHead(200);
    res.end();
    return;
  }

  // Проксуємо запити до Netlify
  if (req.url === '/inventory') {
    makeRequest('https://merch-count1.netlify.app/.netlify/functions/inventory', res);
  } else if (req.url === '/update-inventory' && req.method === 'POST') {
    // Обробляємо POST запити
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const parsedUrl = url.parse('https://merch-count1.netlify.app/.netlify/functions/update-inventory');
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'Mozilla/5.0 (compatible; Proxy Server)'
        }
      };

      const proxyReq = https.request(options, (response) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Content-Type', 'application/json');
        
        response.pipe(res);
      });

      proxyReq.on('error', (err) => {
        console.error('Proxy POST error:', err);
        res.writeHead(500);
        res.end('Proxy error: ' + err.message);
      });

      proxyReq.write(body);
      proxyReq.end();
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /inventory');
  console.log('  POST /update-inventory');
});

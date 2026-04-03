const chokidar = require('chokidar');
const path = require('path');
const config = require('../config/config');

class WatcherService {
  constructor() {
    this.watcher = null;
    // Bug fix #7: lista de clientes SSE conectados
    this.clients = new Set();
  }

  start() {
    this.watcher = chokidar.watch(config.vaultPath, {
      ignored: config.ignoredPaths.map(p => path.join(config.vaultPath, p)),
      persistent: true,
      ignoreInitial: true
    });

    this.watcher
      .on('change', (filePath) => this.broadcast('change', filePath))
      .on('add', (filePath) => this.broadcast('add', filePath))
      .on('unlink', (filePath) => this.broadcast('delete', filePath));

    console.log(`File watcher started: ${config.vaultPath}`);
  }

  broadcast(event, filePath) {
    const vaultBase = path.resolve(config.vaultPath);
    const relativePath = filePath.replace(vaultBase + path.sep, '');
    const data = JSON.stringify({ event, path: relativePath });

    for (const res of this.clients) {
      try {
        res.write(`data: ${data}\n\n`);
      } catch {
        this.clients.delete(res);
      }
    }
  }

  // Adiciona cliente SSE e o remove quando a conexão fechar
  addClient(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = new WatcherService();

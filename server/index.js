const express = require('express');
const path = require('path');
const config = require('./config/config');
const fileRoutes = require('./routes/files');
const authMiddleware = require('./middleware/auth');
const { helmetMiddleware, defaultLimiter, authLimiter } = require('./middleware/security');
const watcherService = require('./services/watcherService');

const app = express();

// Confia no proxy reverso mais próximo (Cloudflare Tunnel / cloudflared)
// Necessário para express-rate-limit identificar IPs corretamente via X-Forwarded-For
app.set('trust proxy', 1);

// 1. Segurança (headers) — primeiro, sem exceções
app.use(helmetMiddleware);

// 2. Rate limit global padrão
app.use(defaultLimiter);

// 3. Rate limit rigoroso nas tentativas de autenticação
app.use('/api/', authLimiter);

// 4. Body parsing
app.use(express.json({ limit: '10mb' }));

// 5. Arquivos estáticos (HTML/CSS/JS/libs) — sem autenticação
//    O browser precisa deles antes de poder exibir a tela de login
app.use(express.static(path.join(__dirname, '..', 'public')));

// 6. Autenticação em todas as rotas de API
app.use('/api/', authMiddleware);

// 7. Rotas de API
app.use('/api/files', fileRoutes);

// 8. Health check (autenticado)
app.get('/api/health', authMiddleware, (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
    },
    uptime: Math.round(process.uptime()),
    vault: config.vaultPath
  });
});

// Inicia o file watcher
watcherService.start();

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`LONEV running on http://localhost:${PORT}`);
  console.log(`Vault: ${config.vaultPath}`);
});

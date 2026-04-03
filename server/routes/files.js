const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');
const watcherService = require('../services/watcherService');
const { writeLimiter } = require('../middleware/security');

// Lista todos os arquivos e diretórios do vault
router.get('/list', async (req, res) => {
  try {
    const files = await fileService.listFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lê um arquivo e retorna content + frontmatter separados
router.get('/read', async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: 'Path required' });

    const fileData = await fileService.readFile(path);
    res.json(fileData);
  } catch (error) {
    const status = error.message.includes('not allowed') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Salva conteúdo (preserva frontmatter existente)
router.post('/write', writeLimiter, async (req, res) => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) {
      return res.status(400).json({ error: 'Path and content required' });
    }

    const result = await fileService.writeFile(path, content);
    res.json(result);
  } catch (error) {
    const status = error.message.includes('not allowed') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Cria novo arquivo
router.post('/create', writeLimiter, async (req, res) => {
  try {
    const { path, content } = req.body;
    if (!path) return res.status(400).json({ error: 'Path required' });

    const result = await fileService.createFile(path, content || '');
    res.json(result);
  } catch (error) {
    const status = error.message === 'File already exists' ? 409 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Deleta arquivo
router.delete('/delete', writeLimiter, async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'Path required' });

    const result = await fileService.deleteFile(path);
    res.json(result);
  } catch (error) {
    const status = error.message.includes('not allowed') ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Bug fix #7: SSE endpoint para notificações de mudanças externas
router.get('/watch', (req, res) => {
  watcherService.addClient(res);
});

module.exports = router;

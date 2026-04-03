require('dotenv').config();
const path = require('path');

module.exports = {
  vaultPath: process.env.VAULT_PATH || '/home/jvpg/Documentos/Estudos',
  port: parseInt(process.env.PORT, 10) || 3000,
  auth: {
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'changeme'
  },
  allowedExtensions: ['.md', '.markdown'],
  ignoredPaths: ['.obsidian', '.trash', 'node_modules', '.git']
};

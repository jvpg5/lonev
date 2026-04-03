const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const config = require('../config/config');

class FileService {
  constructor() {
    this.vaultPath = path.resolve(config.vaultPath);
  }

  // Bug fix #2: usa path.sep para evitar falso positivo em prefixos de nome
  validatePath(filePath) {
    const resolved = path.resolve(this.vaultPath, filePath);
    const safeBase = this.vaultPath.endsWith(path.sep)
      ? this.vaultPath
      : this.vaultPath + path.sep;

    if (!resolved.startsWith(safeBase) && resolved !== this.vaultPath) {
      throw new Error('Invalid path: outside vault');
    }
    return resolved;
  }

  // Bug fix #1: diretórios agora são adicionados ao resultado
  async listFiles(dirPath = '') {
    const fullPath = this.validatePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    const result = [];
    for (const entry of entries) {
      if (config.ignoredPaths.includes(entry.name)) continue;

      const itemRelPath = dirPath ? path.join(dirPath, entry.name) : entry.name;
      const item = {
        name: entry.name,
        path: itemRelPath,
        type: entry.isDirectory() ? 'directory' : 'file'
      };

      if (entry.isDirectory()) {
        item.children = await this.listFiles(itemRelPath);
        result.push(item); // fix: diretórios agora entram no resultado
      } else if (config.allowedExtensions.includes(path.extname(entry.name))) {
        result.push(item);
      }
    }

    // Ordena: pastas primeiro, depois arquivos, ambos alfabéticos
    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });

    return result;
  }

  async readFile(filePath) {
    const fullPath = this.validatePath(filePath);
    const ext = path.extname(filePath);
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error('File type not allowed');
    }

    const raw = await fs.readFile(fullPath, 'utf-8');
    const stats = await fs.stat(fullPath);
    const parsed = matter(raw);

    return {
      path: filePath,
      content: parsed.content,
      frontmatter: parsed.data,
      modified: stats.mtime
    };
  }

  async writeFile(filePath, content) {
    const fullPath = this.validatePath(filePath);
    const ext = path.extname(filePath);
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error('File type not allowed');
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Preserva o frontmatter original se existir
    let finalContent = content;
    try {
      const existing = await fs.readFile(fullPath, 'utf-8');
      const parsed = matter(existing);
      if (Object.keys(parsed.data).length > 0) {
        finalContent = matter.stringify(content, parsed.data);
      }
    } catch {
      // Arquivo novo, sem frontmatter a preservar
    }

    await fs.writeFile(fullPath, finalContent, 'utf-8');
    return { success: true, path: filePath };
  }

  async createFile(filePath, content = '') {
    const fullPath = this.validatePath(filePath);
    const ext = path.extname(filePath);
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error('File type not allowed');
    }

    try {
      await fs.access(fullPath);
      throw new Error('File already exists');
    } catch (err) {
      if (err.message === 'File already exists') throw err;
      // ENOENT: arquivo não existe, prosseguir
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true, path: filePath };
  }

  async deleteFile(filePath) {
    const fullPath = this.validatePath(filePath);
    const ext = path.extname(filePath);
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error('File type not allowed');
    }
    await fs.unlink(fullPath);
    return { success: true };
  }
}

module.exports = new FileService();

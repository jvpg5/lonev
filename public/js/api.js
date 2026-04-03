const API = {
  baseURL: '/api/files',

  async listFiles() {
    const res = await fetch(`${this.baseURL}/list`);
    if (!res.ok) throw new Error('Failed to list files');
    return res.json();
  },

  async readFile(filePath) {
    const res = await fetch(`${this.baseURL}/read?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error('Failed to read file');
    return res.json();
  },

  async writeFile(filePath, content) {
    const res = await fetch(`${this.baseURL}/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    });
    if (!res.ok) throw new Error('Failed to write file');
    return res.json();
  },

  async createFile(filePath, content = '') {
    const res = await fetch(`${this.baseURL}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to create file');
    }
    return res.json();
  },

  async deleteFile(filePath) {
    const res = await fetch(`${this.baseURL}/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return res.json();
  },

  // Bug fix #7: SSE para notificações de mudanças externas
  watchFiles(onEvent) {
    const source = new EventSource(`${this.baseURL}/watch`);
    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {
        // ignora mensagens mal formadas
      }
    };
    source.onerror = () => {
      // Reconexão automática pelo browser após falha
    };
    return source;
  }
};

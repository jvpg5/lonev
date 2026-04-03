const Editor = {
  currentFile: null,
  isDirty: false,
  saveTimeout: null,
  externalChangeDetected: false,

  init() {
    const editorEl = document.getElementById('editor');
    const btnSave  = document.getElementById('btn-save');

    // Atualiza preview e marca dirty a cada input, com debounce de 400ms no preview
    editorEl.addEventListener('input', () => {
      this.isDirty = true;
      btnSave.disabled = false;
      this.setSaveStatus('Não salvo');

      // Debounce: cancela auto-save anterior e agenda novo
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => this.save(), 2000);

      // Preview com debounce mais curto
      clearTimeout(this._previewTimeout);
      this._previewTimeout = setTimeout(() => Preview.render(editorEl.value), 300);
    });

    // Ctrl+S salva imediatamente
    editorEl.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });

    btnSave.addEventListener('click', () => this.save());

    document.getElementById('btn-new-file').addEventListener('click', () => this.createNewFile());

    // Banner de mudança externa
    document.getElementById('btn-reload-file').addEventListener('click', () => this.reloadCurrentFile());
    document.getElementById('btn-dismiss-banner').addEventListener('click', () => this.dismissBanner());

    // Bug fix #7: SSE — notifica quando arquivo aberto muda externamente
    API.watchFiles((data) => {
      if (!this.currentFile) return;
      // Normaliza separadores para comparação
      const changedPath = data.path.replace(/\\/g, '/');
      const openPath = this.currentFile.replace(/\\/g, '/');
      if (changedPath === openPath || changedPath === '/' + openPath) {
        this.externalChangeDetected = true;
        document.getElementById('external-change-banner').classList.remove('hidden');
      }
    });

    // Inicializa os outros módulos
    FileTree.init();
    Preview.init();
  },

  loadFile(fileData) {
    this.currentFile = fileData.path;
    this.isDirty = false;
    this.externalChangeDetected = false;

    document.getElementById('editor').value = fileData.content;
    document.getElementById('current-file').textContent = fileData.path;
    document.getElementById('btn-save').disabled = true;
    this.setSaveStatus('');
    this.dismissBanner();

    Preview.render(fileData.content);
    FileTree.setActive(fileData.path);
  },

  async reloadCurrentFile() {
    if (!this.currentFile) return;
    try {
      const fileData = await API.readFile(this.currentFile);
      this.loadFile(fileData);
    } catch (error) {
      alert('Erro ao recarregar arquivo: ' + error.message);
    }
  },

  dismissBanner() {
    this.externalChangeDetected = false;
    document.getElementById('external-change-banner').classList.add('hidden');
  },

  async save() {
    if (!this.currentFile || !this.isDirty) return;

    clearTimeout(this.saveTimeout);
    this.setSaveStatus('Salvando...');

    try {
      const content = document.getElementById('editor').value;
      await API.writeFile(this.currentFile, content);

      this.isDirty = false;
      document.getElementById('btn-save').disabled = true;
      this.setSaveStatus('Salvo');
      setTimeout(() => this.setSaveStatus(''), 2000);
    } catch (error) {
      this.setSaveStatus('Erro ao salvar');
      console.error('Editor.save:', error);
      alert('Erro ao salvar arquivo: ' + error.message);
    }
  },

  async createNewFile() {
    const fileName = prompt('Nome do arquivo (ex: notas.md ou Pasta/arquivo.md):');
    if (!fileName) return;

    if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown')) {
      alert('O arquivo deve ter extensão .md ou .markdown');
      return;
    }

    try {
      await API.createFile(fileName, '');
      await FileTree.init();
      // Abre o arquivo recém-criado
      const fileData = await API.readFile(fileName);
      this.loadFile(fileData);
    } catch (error) {
      alert('Erro ao criar arquivo: ' + error.message);
    }
  },

  setSaveStatus(text) {
    document.getElementById('save-status').textContent = text;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Editor.init();
});

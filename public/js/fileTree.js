const FileTree = {
  async init() {
    const container = document.getElementById('file-tree');
    container.innerHTML = '<span class="loading">Carregando...</span>';
    try {
      const files = await API.listFiles();
      container.innerHTML = '';
      this.render(files, container, 0);
    } catch (error) {
      container.innerHTML = '<span class="loading">Erro ao carregar arquivos.</span>';
      console.error('FileTree.init:', error);
    }
  },

  render(items, container, level) {
    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'file-item';
      div.style.paddingLeft = `${level * 14 + 8}px`;

      if (item.type === 'directory') {
        div.classList.add('directory');
        div.textContent = `▶ ${item.name}`;
        div.dataset.open = 'false';

        const childContainer = document.createElement('div');
        childContainer.className = 'directory-children';
        childContainer.style.display = 'none';

        div.addEventListener('click', () => {
          const isOpen = div.dataset.open === 'true';
          div.dataset.open = isOpen ? 'false' : 'true';
          div.textContent = `${isOpen ? '▶' : '▼'} ${item.name}`;
          childContainer.style.display = isOpen ? 'none' : 'block';
        });

        container.appendChild(div);

        if (item.children && item.children.length > 0) {
          this.render(item.children, childContainer, level + 1);
        }
        container.appendChild(childContainer);
      } else {
        div.textContent = `  ${item.name}`;
        div.dataset.path = item.path;
        div.addEventListener('click', () => this.openFile(item.path, div));
        container.appendChild(div);
      }
    }
  },

  setActive(path) {
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
    const target = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
    if (target) {
      target.classList.add('active');
      // Expande pastas pai se necessário
      let parent = target.previousElementSibling;
      while (parent) {
        if (parent.classList.contains('directory-children')) {
          parent.style.display = 'block';
          const dir = parent.previousElementSibling;
          if (dir && dir.dataset.open === 'false') {
            dir.dataset.open = 'true';
            dir.textContent = dir.textContent.replace('▶', '▼');
          }
        }
        parent = parent.previousElementSibling;
      }
    }
  },

  async openFile(filePath, element) {
    try {
      document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      const fileData = await API.readFile(filePath);
      Editor.loadFile(fileData);
    } catch (error) {
      console.error('FileTree.openFile:', error);
      alert('Erro ao abrir arquivo: ' + error.message);
    }
  }
};

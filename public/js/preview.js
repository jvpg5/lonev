const Preview = {
  visible: true,

  init() {
    document.getElementById('preview-pane').classList.add('visible');
    document.getElementById('btn-toggle-preview').addEventListener('click', () => this.toggle());
  },

  toggle() {
    this.visible = !this.visible;
    document.getElementById('preview-pane').classList.toggle('visible', this.visible);
    document.getElementById('btn-toggle-preview').textContent = this.visible ? 'Ocultar Preview' : 'Preview';
  },

  render(markdown) {
    if (!this.visible) return;

    // marked v9+ usa marked.parse() que retorna string
    const html = marked.parse(markdown || '');
    const preview = document.getElementById('preview');
    preview.innerHTML = html;

    // Renderiza LaTeX com KaTeX (executado após o DOM ser atualizado)
    if (typeof renderMathInElement !== 'undefined') {
      renderMathInElement(preview, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$',  right: '$',  display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    }
  }
};

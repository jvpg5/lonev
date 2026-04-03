# LONEV

**L**ightweight **O**bsidian **N**otes **E**ditor and **V**iewer

Editor web minimalista para vaults Obsidian, com renderização LaTeX em tempo real. Projetado para rodar em Raspberry Pi 3B com menos de 80MB de RAM.

---

## Funcionalidades

- Edição e visualização de arquivos `.md` diretamente no filesystem
- Preview em tempo real com suporte a LaTeX via KaTeX
- Interface split-pane (editor | preview)
- Navegação de arquivos com árvore expansível
- Auto-save com debounce de 2 segundos (Ctrl+S para forçar)
- Notificação em tempo real quando um arquivo é modificado externamente (Syncthing, terminal, etc.)
- Autenticação HTTP Basic em todas as rotas da API
- Preservação de YAML frontmatter do Obsidian ao salvar
- Sem dependências de CDN externo — todas as libs bundladas localmente

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 18+ |
| Backend | Express 4, express-basic-auth, helmet, express-rate-limit |
| Parser | gray-matter (frontmatter YAML), marked (Markdown) |
| File watch | chokidar + Server-Sent Events |
| Frontend | HTML5 + CSS3 + JS vanilla |
| LaTeX | KaTeX (bundlado localmente) |

---

## Requisitos

- Node.js 18 ou superior
- npm 9+

---

## Instalação

```bash
# 1. Clonar ou copiar o projeto
git clone <repo> ~/obsidian-web-editor
cd ~/obsidian-web-editor

# 2. Instalar dependências
npm install --production

# 3. Criar arquivo de configuração
cp .env.example .env
```

Edite o `.env` com suas configurações:

```bash
VAULT_PATH=/home/jvpg/Documentos/Estudos   # caminho absoluto do vault
PORT=3000
AUTH_USERNAME=jvpg
AUTH_PASSWORD=SuaSenhaSegura123!
NODE_ENV=production
```

```bash
# 4. Iniciar
npm start
```

Acesse `http://localhost:3000` no browser.

---

## Desenvolvimento

```bash
npm run dev   # reinicia automaticamente ao salvar com nodemon
```

---

## Deploy no Raspberry Pi

### 1. Instalar Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Copiar projeto e instalar

```bash
mkdir -p ~/obsidian-web-editor
# copiar arquivos (rsync, scp, git clone...)
cd ~/obsidian-web-editor
npm install --production
cp .env.example .env
nano .env   # configurar vault path e senha
```

### 3. Criar serviço systemd

```bash
sudo cp deploy/lonev.service /etc/systemd/system/
```

Edite o serviço com os valores do seu ambiente (usuário, caminhos, vault):

```bash
sudo nano /etc/systemd/system/lonev.service
```

Os campos que precisam ser ajustados estão marcados com comentários no arquivo. Consulte a seção **Serviço systemd** abaixo para detalhes.

Ative e inicie:

```bash
sudo systemctl daemon-reload
sudo systemctl enable lonev
sudo systemctl start lonev
sudo systemctl status lonev
```

### 4. Firewall

Bloquear acesso direto à porta (o acesso externo deve ser feito via Cloudflare Tunnel):

```bash
sudo ufw deny 3000
```

### 5. Cloudflare Tunnel

Adicione ao `~/.cloudflared/config.yml`:

```yaml
ingress:
  - hostname: obsidian-editor.seudominio.com
    service: http://localhost:3000
  # ... outras regras
  - service: http_status:404
```

```bash
sudo systemctl restart cloudflared
```

---

## Estrutura do projeto

```
lonev/
├── server/
│   ├── index.js                  # Entry point
│   ├── config/
│   │   └── config.js             # Configurações via .env
│   ├── middleware/
│   │   ├── auth.js               # HTTP Basic Auth
│   │   └── security.js           # Helmet + rate limiters por rota
│   ├── routes/
│   │   └── files.js              # API REST + endpoint SSE /watch
│   └── services/
│       ├── fileService.js        # Leitura/escrita/listagem de arquivos
│       └── watcherService.js     # chokidar + broadcast SSE
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── api.js                # Cliente HTTP + EventSource
│   │   ├── editor.js             # Coordenação geral + auto-save
│   │   ├── fileTree.js           # Sidebar com árvore de arquivos
│   │   └── preview.js            # Renderização Markdown + KaTeX
│   └── libs/
│       ├── katex/                # KaTeX bundlado (sem CDN)
│       └── marked/               # marked bundlado (sem CDN)
├── deploy/
│   └── lonev.service              # Unidade systemd
├── .env.example
├── .gitignore
└── package.json
```

---

## API

Todas as rotas `/api/` requerem autenticação HTTP Basic.

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/files/list` | Lista arquivos e pastas do vault |
| `GET` | `/api/files/read?path=<caminho>` | Lê um arquivo (retorna `content` + `frontmatter`) |
| `POST` | `/api/files/write` | Salva conteúdo (preserva frontmatter existente) |
| `POST` | `/api/files/create` | Cria novo arquivo |
| `DELETE` | `/api/files/delete` | Remove arquivo |
| `GET` | `/api/files/watch` | Stream SSE de mudanças no vault |
| `GET` | `/api/health` | Status do servidor e uso de memória |

### Exemplo com curl

```bash
# Listar arquivos
curl -u jvpg:senha http://localhost:3000/api/files/list

# Ler arquivo
curl -u jvpg:senha "http://localhost:3000/api/files/read?path=Anotacoes/teste.md"

# Salvar arquivo
curl -u jvpg:senha -X POST http://localhost:3000/api/files/write \
  -H "Content-Type: application/json" \
  -d '{"path":"teste.md","content":"# Teste\n$E=mc^2$"}'

# Verificar saúde
curl -u jvpg:senha http://localhost:3000/api/health
```

---

## Segurança

- **Path traversal**: caminhos fora do vault são rejeitados com erro 403
- **Whitelist de extensões**: apenas `.md` e `.markdown` são permitidos
- **Rate limiting**: limites diferenciados por tipo de operação (writes: 500 req/15min; list: 200 req/15min; auth: 20 req/15min)
- **Helmet.js**: headers de segurança em todas as respostas
- **Arquivos estáticos públicos**: HTML/CSS/JS são servidos sem auth (necessário para o browser carregar a interface); apenas `/api/` é protegida
- **HTTPS via Cloudflare Tunnel**: não expor a porta diretamente na internet

---

## Uso de recursos (Raspberry Pi 3B)

| Componente | RAM |
|------------|-----|
| Node.js base | ~20MB |
| Express + deps | ~30MB |
| Em uso normal | ~60-80MB RSS |

---

## Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+S` | Salvar imediatamente |

---

## Serviço systemd

O arquivo `deploy/lonev.service` contém placeholders comentados para facilitar a configuração. Campos a editar:

| Campo | O que colocar |
|---|---|
| `User` | Usuário do sistema com acesso ao projeto e ao vault |
| `WorkingDirectory` | Caminho absoluto da pasta do projeto |
| `ExecStart` | Confirme o caminho do node com `which node` |
| `EnvironmentFile` | Caminho absoluto do `.env` (dentro da pasta do projeto) |
| `ReadWritePaths` | Caminho absoluto do vault Obsidian |

> O systemd **não expande `~`** — use sempre caminhos absolutos.

---

## Compatibilidade com Syncthing

O LONEV trabalha diretamente com os arquivos do vault — sem banco de dados, sem cache interno. O Syncthing pode sincronizar os arquivos normalmente. Quando um arquivo aberto é modificado externamente, um banner amarelo aparece no topo do editor com a opção de recarregar ou ignorar.

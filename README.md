# AutoShorts 🚀

Sistema de criação automática de shorts/clips para TikTok, YouTube Shorts e Instagram Reels usando AI.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Funcionalidades

- 📤 **Upload de Vídeo** - Envie arquivos MP4, MOV ou WebM
- 🔗 **Import YouTube** - Cole uma URL do YouTube para importar
- 🤖 **AI Highlights** - Detecção automática dos melhores momentos
- ✂️ **Geração de Clips** - Crie shorts automaticamente (9:16)
- 💬 **Legendas Automáticas** - Transcrição e legendas estilizadas
- ⬇️ **Download** - Exporte clips individuais ou em ZIP

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React + Vite |
| **Backend** | Node.js + Express |
| **AI** | OpenAI GPT-4V |
| **Captions** | AssemblyAI |
| **Storage** | Cloudflare R2 / AWS S3 |
| **Video** | FFmpeg |

## 📋 Pré-requisitos

- Node.js 18+
- FFmpeg (para processamento de vídeo)
- Contas API (veja configuração abaixo)

## ⚡ Quick Start

### 1. Clone o projeto

```bash
git clone <repo-url> autoshorts
cd autoshorts
```

### 2. Configure as variáveis de ambiente

```bash
cp server/.env.example server/.env
```

Edite o arquivo `.env` com suas chaves de API:

```env
# Obrigatório para AI
OPENAI_API_KEY=sk-...

# Obrigatório para legendas
ASSEMBLYAI_API_KEY=...

# Obrigatório para import YouTube
YOUTUBE_API_KEY=...

# Storage (R2 é gratuito)
R2_ENDPOINT=https://...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=autoshorts
```

### 3. Instale as dependências

```bash
# Servidor
cd server && npm install

# Cliente
cd ../client && npm install
```

### 4. Execute

```bash
# Terminal 1 - Servidor
cd server && npm run dev

# Terminal 2 - Cliente
cd client && npm run dev
```

Acesse http://localhost:5173

## 🐳 Docker Compose (Produção)

```bash
# Configure as variáveis no arquivo
cp .env.example .env

# Execute
docker-compose up -d
```

Acesse http://localhost:5173

## 📦 Serviços API

### Upload

```bash
# Upload de arquivo
POST /api/upload/video
Content-Type: multipart/form-data

# Import YouTube
POST /api/upload/youtube
{"url": "https://youtube.com/watch?v=..."}
```

### Highlights

```bash
# Análise de AI
POST /api/highlights/analyze-full/:videoId
{"minDuration": 15, "maxDuration": 60}
```

### Clips

```bash
# Gerar clips
POST /api/clips/generate/:videoId
{"timestamps": [{"start": 0, "end": 30}]}
```

### Captions

```bash
# Gerar legendas
POST /api/captions/generate/:clipId
{"style": "default"}

# Baixar legendas
GET /api/captions/export/:clipId?format=srt|vtt
```

### Download

```bash
# Download clip
GET /api/download/clip/:clipId

# Download todos (ZIP)
GET /api/download/video/:videoId
```

## 📁 Estrutura

```
autoshorts/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   └── services/       # Serviços API
│   └── public/            # Arquivos estáticos
├── server/               # Backend Node.js
│   ├── src/
│   │   ├── routes/       # Rotas API
│   │   ├── services/      # Serviços de negócio
│   │   └── index.js       # Entry point
│   └── .env.example      # Variáveis de ambiente
├── docker-compose.yml    # Orquestração Docker
└── README.md            # Este arquivo
```

## 🔧 Configuração de APIs

### OpenAI (AI Highlights)
1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova chave API
3. Adicione credits (~$5-10)
4. Cole no arquivo `.env`

### AssemblyAI (Legendas)
1. Acesse https://www.assemblyai.com/
2. Crie uma conta gratuita
3. Copie sua API key
4. Cole no arquivo `.env`

### YouTube Data API
1. Acesse https://console.cloud.google.com/
2. Crie um projeto
3. Ative YouTube Data API v3
4. Crie credenciais (API Key)
5. Cole no arquivo `.env`

### Cloudflare R2 (Storage Grátis)
1. Acesse https://dash.cloudflare.com/
2. Crie um Worker e R2
3. Adicione sua API key e endpoint
4. Crie um bucket público

## 📝 Stories do Projeto

Veja `docs/stories/backlog.md` para todas as user stories e prioridades.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - sinta-se livre para usar e modificar.

---

Feito com ❤️ para criadores de conteúdo

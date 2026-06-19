# Abastece.app — Setup e fluxo de trabalho com Git

Guia para (1) configurar o projeto em um computador novo e (2) manter o GitHub
sempre atualizado, trabalhando em mais de uma máquina sem perder versões.

Repositório: https://github.com/fxlipecdr/abastece.app

---

## 1. Pré-requisitos

- **Git** — https://git-scm.com/download/win
- **Node.js LTS** — https://nodejs.org (versão usada: v24.x). Confirme com `node -v` e `npm -v`.
- (Opcional) **Supabase CLI** — para aplicar migrations e Edge Functions.

## 2. Migrar para um computador novo (clonar do GitHub)

No PowerShell, na pasta onde quer o projeto (ex.: `Documents`):

```powershell
git clone https://github.com/fxlipecdr/abastece.app.git
cd abastece.app
npm install            # instala todos os workspaces
```

Configurar variáveis de ambiente (NUNCA vão para o git):

```powershell
Copy-Item apps\web\.env.example apps\web\.env.local
# Edite apps\web\.env.local com a URL e a anon key do seu projeto Supabase
```

Rodar o web:

```powershell
npm run web            # atalho na raiz; abre o Vite (http://localhost:5173)
```

> O que **não** vem no clone (precisa recriar): `node_modules` (via `npm install`),
> `.env.local`/`.env` (via cópia do `.env.example`), e a pasta `dist/`/build.
> Tudo isso é ignorado de propósito (`.gitignore`).

## 3. Backend Supabase (uma vez por ambiente)

1. Crie o projeto em supabase.com.
2. SQL Editor → rode em ordem: `supabase/migrations/001`, `002`, `003`, `004`, depois `seed.sql`.
3. Em **Project Settings → API**, copie URL + anon key para o `.env.local`.
4. (Opcional, via CLI) `supabase functions deploy validate-price-report` e defina a
   env `ALLOWED_ORIGINS` para travar o CORS em produção.

## 4. Fluxo Git para trabalhar em 2 computadores

**Regra de ouro:** sempre `pull` antes de começar e `push` ao terminar. Assim o
"computador principal" e este aqui ficam sincronizados pelo GitHub.

### Início de cada sessão
```powershell
git pull --rebase origin main
```

### Fim de cada sessão (enviar tudo para o GitHub)
```powershell
npm run sync           # atalho: add + commit + push (ver scripts/sync.ps1)
```
ou manualmente:
```powershell
git add -A
git commit -m "feat: descrição do que foi feito"
git push origin main
```

### Conflitos
Se o `git pull --rebase` apontar conflito, resolva os arquivos marcados, depois:
```powershell
git add <arquivo-resolvido>
git rebase --continue
```

## 5. Boas práticas
- Faça commits pequenos e descritivos.
- Nunca commite segredos. Se um `.env` real aparecer no `git status`, **pare** — ele
  deveria estar ignorado.
- O `package-lock.json` **deve** ser versionado (instalação reprodutível).
- Build de verificação antes de push em mudanças grandes: `cd apps/web && npm run build`.

# =============================================================================
# Abastece.app — sincronização rápida com o GitHub
# -----------------------------------------------------------------------------
# Uso:  npm run sync                  (mensagem automática com timestamp)
#       npm run sync -- "mensagem"    (mensagem de commit personalizada)
#
# Fluxo seguro: integra remoto (rebase) -> commita mudanças locais -> envia.
# Aborta se houver conflito de rebase para você resolver manualmente.
# =============================================================================
$ErrorActionPreference = 'Stop'

# Mensagem de commit: argumento ou timestamp.
$msg = if ($args.Count -gt 0 -and $args[0]) { $args[0] }
       else { "chore: sync $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

Write-Host "==> Integrando alteracoes do GitHub (pull --rebase)..." -ForegroundColor Cyan
git pull --rebase origin main
if ($LASTEXITCODE -ne 0) {
  Write-Host "Conflito no rebase. Resolva os arquivos, rode 'git rebase --continue' e tente de novo." -ForegroundColor Yellow
  exit 1
}

# Há algo para commitar?
$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
  Write-Host "Nada novo para commitar. Repositorio ja esta sincronizado." -ForegroundColor Green
} else {
  Write-Host "==> Commitando: $msg" -ForegroundColor Cyan
  git add -A
  git commit -m $msg
}

Write-Host "==> Enviando para o GitHub (push)..." -ForegroundColor Cyan
git push origin main
Write-Host "Sincronizacao concluida." -ForegroundColor Green

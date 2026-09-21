# Cronograma de Estudos — MVP web

Sistema web pessoal (multiusuário desde já) que substitui a planilha de estudo:
edital verticalizado (checklist de assuntos), diário de estudo em formato board
(arrastar um assunto de um dia pro outro), geração automática de revisão
espaçada (24h / 7 dias / 15 dias / 30 dias) quando um assunto é concluído, e
acompanhamento de horas/questões por matéria.

## Stack

- **API**: Node.js + Express + TypeScript, autenticação JWT, banco SQLite via
  `better-sqlite3` (arquivo único, zero configuração — dá pra trocar depois
  por Postgres sem mudar a lógica, só a camada de acesso a dados).
- **Web**: React + Vite + TypeScript, drag-and-drop com `@dnd-kit`.
- Cada usuário que se cadastra já recebe o edital do cargo 405 (Analista de
  TI / Desenvolvimento de Sistemas — MPMS) pré-carregado como matérias e
  assuntos.

## Rodando localmente (sem Docker)

```bash
# API
cd api
npm install
npm run dev        # http://localhost:4000

# Web (em outro terminal)
cd web
npm install
npm run dev         # http://localhost:5173
```

## Rodando com Docker (recomendado pro seu homelab)

Da raiz do projeto:

```bash
docker compose up -d --build
```

- API fica em `http://<ip-do-host>:4000`
- Web fica em `http://<ip-do-host>:8080`

O frontend fala com a API pelo próprio nginx (`/api`), então funciona de qualquer
dispositivo da rede, sem trocar IP nem rebuildar.

**Segredo do JWT**: se `JWT_SECRET` não for definido (variável de ambiente ou
arquivo `.env` na raiz), a API gera um segredo aleatório e o guarda no volume de
dados (`.jwt-secret`). Para forçar um valor próprio: `JWT_SECRET=... docker compose up -d`.
`CORS_ORIGIN` (lista separada por vírgula) restringe as origens aceitas.

Os dados ficam persistidos no volume `estudo-data` (arquivo SQLite), então
sobrevivem a rebuilds/restarts dos containers.

## Deploy na VPS com CI/CD (GitHub Actions)

Fluxo: a cada push na `main`, o Actions roda os testes (tipos da API, build do web e um
teste de fumaça com Docker) e, se passar, envia a release por SSH. **O build é feito na
própria VPS** (funciona em ARM), com health check e **rollback automático** se a nova
versão não ficar saudável. Antes de cada deploy é feito um backup do banco.

O acesso público é por um túnel Cloudflare: nenhuma porta do app fica aberta no host.
Você pode usar um **túnel próprio** ou **reaproveitar um túnel que já roda** na VPS.

### Configuração única

1. **Túnel** (escolha um):
   - **Reaproveitar um túnel existente** (túneis gerenciados pelo painel Zero Trust):
     descubra a rede Docker dele com
     `docker inspect <container-do-tunel> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'`
     (precisa ser uma rede criada por compose, não a `bridge` padrão). No painel do túnel
     (Networks → Tunnels → o túnel → Public Hostname) adicione o hostname com serviço
     `http://estudo-web:80`. Prefira um túnel de um app menos sensível: o `web` entra na
     rede desse túnel.
   - **Túnel novo:** crie um túnel, copie o token e adicione o hostname com serviço `http://web:80`.
2. **Na VPS**, crie `~/concursei/.env` (use `TUNNEL_NETWORK` **ou** `TUNNEL_TOKEN`):
   ```
   TUNNEL_NETWORK=<rede do túnel existente>   # reaproveitando um túnel
   # TUNNEL_TOKEN=<token do túnel>            # ou: túnel novo (sobe o cloudflared junto)
   ALLOW_REGISTRATION=true     # deixe true só até criar sua conta; depois troque para false
   # JWT_SECRET=...            # opcional (senão é gerado e guardado no volume)
   # CORS_ORIGIN=https://seu.dominio
   ```
   O usuário do deploy precisa estar no grupo `docker`.
3. **Chave SSH de deploy** (na sua máquina): `ssh-keygen -t ed25519 -f concursei_deploy -N ""`;
   coloque `concursei_deploy.pub` em `~/.ssh/authorized_keys` da VPS.
4. **Secrets no GitHub** (Settings → Secrets and variables → Actions):
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (conteúdo de `concursei_deploy`),
   `VPS_KNOWN_HOSTS` (saída de `ssh-keyscan -H <host>`) e, se não for a 22, `VPS_PORT`.
   Recomenda-se criar o *Environment* `production` com aprovação manual.

### Operação

- **Deploy manual/reexecução:** aba Actions → CI/CD → *Run workflow*.
- **Backup manual:** `~/concursei/current/scripts/backup.sh ~/concursei/backups` (mantém 14).
- **Restaurar dados de outra instalação:** copie o `.db` para o volume antes do primeiro
  start (`docker run --rm -v concursei_estudo-data:/d -v $PWD:/b alpine cp /b/arquivo.db /d/data.db`).
- **Logs:** `docker logs estudo-api` (ou Dozzle, se já usa).
- As 3 últimas releases ficam em `~/concursei/releases`; `current` aponta para a ativa.

## O que o app faz

- **Painel**: tempo de estudo, desempenho, progresso no edital, constância, contagem
  regressiva da prova, metas semanais, revisões pendentes e planejamento do dia.
- **Diário**: quadro semanal; arraste cards entre dias, guarde para depois na bandeja
  "Guardados" ou mova para qualquer data. Cada dia mostra quanto tempo ainda cabe.
- **Revisões**: 24h / 7 / 15 / 30 dias geradas ao concluir um assunto (programadas,
  atrasadas, concluídas, ignoradas).
- **Cronômetro**: botão flutuante que registra a sessão (tempo, questões, acertos).
- **Plano**: gera o Diário inteiro até uma data-alvo (assuntos por peso e intercalados,
  revisões 24h/7/15/30, simulados quinzenais), respeitando horários e compromissos. É um
  algoritmo determinístico, sem IA; "substituir" refaz só o que foi gerado automaticamente.
- **Rotina**: janelas de estudo por dia da semana e compromissos fora do estudo.
- **Edital**: matérias e assuntos editáveis, conclusão manual, desempenho por assunto.
- **Simulados** e **Caderno de erros** (com padrão dos motivos de erro).
- **Histórico** (lista por dia, evolução de 30 dias, tempo por matéria) e **Importar**
  (planilha Excel com modelo para baixar, ou texto colado do edital; tem prévia e não duplica).
- **Lembretes** do navegador (início da janela de estudo e revisões do dia).
- **Horas** (por peso) e **Guia** de estudo com técnicas e links.
- Cadastro em branco ou a partir de um modelo (MPMS 405 – Analista de TI).

Script útil: `docker compose exec api node dist/scripts/syncSeed.js` atualiza cores,
pesos e assuntos das contas criadas a partir do modelo MPMS.

## Próximos passos possíveis

- Ler o PDF do edital automaticamente (exige um serviço de IA).
- Grade com horário de início nos cards do Diário.
- Vários concursos por conta, conquistas, modo escuro, lembretes por e-mail/push.
- Trocar SQLite por Postgres quando o número de usuários crescer.

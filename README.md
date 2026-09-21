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
- **Horas** (por peso) e **Guia** de estudo com técnicas e links.
- Cadastro em branco ou a partir de um modelo (MPMS 405 – Analista de TI).

Script útil: `docker compose exec api node dist/scripts/syncSeed.js` atualiza cores,
pesos e assuntos das contas criadas a partir do modelo MPMS.

## Próximos passos possíveis

- Importar edital por Excel ou colando texto/PDF (estruturado por IA).
- Grade com horário de início nos cards do Diário.
- Lembretes (notificação/e-mail), vários concursos por conta, conquistas, modo escuro.
- Trocar SQLite por Postgres quando o número de usuários crescer.

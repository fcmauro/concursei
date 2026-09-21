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

**Importante**: o `docker-compose.yml` builda o frontend com
`VITE_API_URL=http://localhost:4000`. Isso só funciona se você acessar o site
do mesmo host onde os containers rodam. Se for acessar de outro dispositivo
na rede (celular, notebook), troque esse valor pelo IP real do host antes do
build, ex:

```yaml
web:
  build:
    args:
      VITE_API_URL: http://192.168.1.50:4000
```

e rode `docker compose build web && docker compose up -d`.

Os dados ficam persistidos no volume `estudo-data` (arquivo SQLite), então
sobrevivem a rebuilds/restarts dos containers.

## Como funciona o fluxo principal

1. Cria conta → edital do cargo já vem populado (matérias + assuntos).
2. Na aba **Diário**, cada dia é uma coluna; adiciona um assunto num dia, e
   se não der tempo, **arrasta o card pra outro dia** — a data muda sozinha,
   sem duplicar nada.
3. Ao marcar **Concluir**, informa quantas questões fez/acertou. Isso:
   - marca o assunto como "matei" (persistente, independente do dia real em
     que foi estudado) — visível na aba **Edital**;
   - gera automaticamente 4 sessões de revisão (24h, 7 dias, 15 dias, 30
     dias) nos dias certos, sem você precisar calcular nada.
4. A aba **Horas** mostra, por matéria, quanto peso ela tem, quantas horas
   por semana deveria receber, e quantas horas já foram de fato lançadas.

## Próximos passos possíveis (não implementados ainda)

- Editar/criar matérias e assuntos próprios pela UI (hoje só via API).
- Tela "Controle de Questões" semanal (equivalente à aba da planilha) — os
  dados já existem via `/stats/weekly`, falta só a tela.
- Caderno de erros (hoje só existe na planilha).
- Notificação (push/e-mail) quando uma revisão vence no dia.
- Trocar SQLite por Postgres quando o número de usuários crescer — o
  `docker-compose.yml` já está estruturado pra receber um serviço `db`
  adicional.

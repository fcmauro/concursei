# Handoff: Cronograma de Estudos (app de estudo para concursos)

## Overview
App para organizar a preparação de concursos públicos: diário de estudo semanal (kanban por dia), edital com progresso por matéria/assunto, distribuição de horas por matéria e uma seção de técnicas de estudo baseadas em evidência. Inclui elementos leves de gamificação (XP, nível, streak).

## About the Design Files
Os arquivos deste pacote são **referências de design feitas em HTML** — um protótipo mostrando aparência e comportamento pretendidos, não código de produção para copiar diretamente. A tarefa é **recriar este design HTML no ambiente/stack real do projeto** (React, Vue, mobile nativo etc.), usando os padrões e bibliotecas já estabelecidos no codebase — ou, se ainda não houver um ambiente definido, escolher o framework mais adequado e implementar ali.

## Fidelity
**Alta fidelidade (hifi)**: cores, tipografia, espaçamento e interações finais já definidos. Recrie a UI fielmente, usando as bibliotecas/padrões existentes do codebase de destino.

## Screens / Views

### 1. Login / Criar conta
- **Purpose**: autenticação (mock no protótipo — sem backend real).
- **Layout**: tela cheia, centralizada, fundo com gradiente radial claro (`radial-gradient(circle at 20% 15%, #EDE9FF 0%, #F6F7FC 55%)`). Card branco 400px de largura máx, `border-radius: 24px`, `padding: 32px`, sombra `0 20px 50px rgba(108,92,231,0.18)`.
- **Components**:
  - Badge de ícone 52×52px, `border-radius: 16px`, gradiente `135deg, #6C5CE7 → #4D96FF`, ícone troféu (phosphor `ph-fill ph-trophy`) branco 26px.
  - Título "Cronograma de Estudos" — Poppins 700, 24px, cor `#1F2333`.
  - Subtítulo — Inter 13px, `#6B7093`.
  - Toggle segmentado "Entrar" / "Criar conta": fundo `#F0F1F9`, `border-radius: 14px`, padding 4px; aba ativa fundo branco + sombra.
  - Campo "Nome" (só no modo Criar conta), "E-mail", "Senha": label 12px/600 `#4B4F6B`; input 44px altura mín, fundo `#F8F9FD`, borda 2px `#EAEBF6`, `border-radius: 12px`.
  - Botão primário full-width: texto branco, gradiente `135deg, #6C5CE7 → #4D96FF`, `border-radius: 12px`, padding 13px, Poppins 700 15px, sombra `0 10px 24px rgba(108,92,231,0.35)`. Label: "Entrar" ou "Criar conta e gerar edital".
  - Texto de ajuda (só registro): 12px `#8388A8`.

### 2. Shell do app (barra superior, presente em todas as telas internas)
- **Layout**: barra branca, `padding: 14px 24px`, sombra `0 2px 10px rgba(31,35,51,0.06)`, flex-wrap.
- **Components** (da esquerda para a direita):
  - Logo: badge 36×36px gradiente + ícone troféu, texto "Cronograma de Estudos" Poppins 700 17px.
  - Badge streak: pílula `#FFF4E5` bg / `#E8590C` texto, ícone chama (`ph-fill ph-flame`), texto "N dias".
  - Badge XP/nível: pílula `#EDE9FF` bg / `#6C5CE7` texto, ícone estrela (`ph-fill ph-star`), "N xp · nível N".
  - Navegação em 4 abas (pílulas dentro de container `#F0F1F9` `border-radius: 12px`): Diário, Edital, Horas, Técnicas. Aba ativa: fundo branco + sombra, texto `#6C5CE7`; inativa: transparente, texto `#6B7093`.
  - Botão "Sair" (ghost), ícone sign-out.

### 3. Diário de estudo (board semanal)
- **Purpose**: ver e gerenciar sessões de estudo do dia/semana.
- **Layout**: navegação de semana (setas + label + botão "Hoje") seguida de 7 colunas (dias) em flex row com scroll horizontal, `gap: 14px`.
- **Column**: fundo `#EFF0F8` (ou tint da cor de marca se for o dia de hoje), `border-radius: 18px`, `padding: 14px`, min-width 215px. Dia de hoje tem contorno `0 0 0 2px #6C5CE7`.
  - Header: nome do dia (Poppins 700 14px) + data (`#9296B4` 11px); total de horas do dia (11px/700 `#9296B4`).
  - Lista de cards de sessão (`gap: 10px`), cada card:
    - Fundo branco, `border-radius: 14px`, `padding: 10px 12px`, sombra `0 3px 10px rgba(31,35,51,0.06)`, borda esquerda 4px na **cor da matéria** (ver tabela de cores abaixo). Opacidade 0.5 se adiada.
    - Ícone da matéria (cor da matéria) + tag de tipo (pílula, texto na cor da matéria, fundo tint 12%): Estudo / Simulado / Revisão 24h / 7 dias / 15 dias / 30 dias.
    - Nome da matéria (13px/700) e, se houver, nome do assunto (12px `#6B7093`).
    - Se concluída: linha verde `#2EA95C` com ícone check + "acertos/questões".
    - Ações: botão "Concluir" (preenchido, cor de marca), "Adiar" (outline), ícone "x" remover (alinhado à direita).
    - Expandido (ao clicar Concluir): campos numéricos "Questões" e "Acertos" + botão "Salvar e concluir".
  - Botão "+ adicionar" no fim da coluna: borda tracejada, abre modal de nova sessão.
- **Modal "Nova sessão"**: overlay `rgba(31,35,51,0.45)`, card branco 420px, `border-radius: 20px`, campos Matéria (select), Assunto (opcional), Tipo (Estudo/Simulado), botões Cancelar/Adicionar.

### 4. Edital
- **Purpose**: progresso por matéria e por assunto.
- **Layout**: lista vertical de cards de matéria, `gap: 16px`.
- **Subject card**: fundo branco, `border-radius: 20px`, `padding: 18px 20px`, sombra leve, **borda superior 5px na cor da matéria**.
  - Header: badge de ícone 38×38px na cor da matéria + nome (Poppins 700 18px) + tag "peso N" + barra de progresso (fundo `#F0F1F9`, preenchimento na cor da matéria) + label "%".
  - Tabela de assuntos: colunas Assunto, Teoria (tag Sim/Não), Questões (acertos/total ou "—"), Status (tag "Matei" verde / "Pendente" cinza).

### 5. Horas
- **Purpose**: distribuição prevista x realizada de horas de estudo por matéria (18h/semana total).
- **Layout**: dois cards de resumo (Previstas/semana — gradiente de marca; Lançadas no diário — branco) seguidos de tabela com todas as matérias (peso, % do peso, horas/semana, horas lançadas) + linha TOTAL.

### 6. Técnicas de estudo
- **Purpose**: apresentar técnicas de estudo por eficácia, com base em Dunlosky et al. (2013).
- **Layout**: 3 grupos (Alta eficácia — verde `#2EC4B6`, Moderada — laranja `#FF9F1C`, Baixa — vermelho `#C1121F`), cada grupo com tag colorida + grid responsivo de cards (`repeat(auto-fit, minmax(260px,1fr))`).
- **Technique card**: fundo branco, `border-radius: 16px`, `padding: 16px 18px`, borda esquerda 5px na cor do grupo; título (Poppins 700 15px), descrição (12.5px `#4B4F6B`), linha de uso prático (12px, cor do grupo, 600).
- **Resumo prático**: card gradiente de marca, texto branco, lista de 3 dicas.

## Interactions & Behavior
- Toda navegação é client-side (sem reload) — troca de "screen" no estado local.
- Semana do board: `weekOffset` inteiro, soma/subtrai 7 dias da data atual; botão "Hoje" zera o offset.
- Sessão de estudo: estados `TODO` → `DONE` (com input de questões/acertos) ou `POSTPONED`; pode ser removida.
- Adicionar sessão abre modal; ao confirmar, cria nova sessão no dia clicado, tipo Estudo por padrão.
- XP = sessões concluídas × 40; Nível = `floor(xp / 150) + 1`. Streak é mockado (não persistido).
- Hover/active: botões com gradiente clareiam levemente no hover (`filter: brightness(1.06)`), escurecem no active (`brightness(0.95)`); dashed "+ adicionar" fica com borda/texto na cor de marca no hover.
- Foco de teclado: outline 3px `#6C5CE7`, offset 2px, em todos os elementos interativos.

## State Management
- `screen`: "login" | "board" | "edital" | "stats" | "techniques"
- `authMode`: "login" | "register" (só visual)
- `weekOffset`: number
- `sessions`: array de `{ id, subjectId, topicName, type, status, minutes, questions, correct, dayIndex, weekOffset }`
- `expanded`: map de sessionId → boolean (card expandido para concluir)
- `drafts`: map de sessionId → `{ questions, correct }` (valores em edição antes de salvar)
- `modalOpen`, `modalDayIndex`, `modalSubjectId`, `modalTopic`, `modalType`: estado do modal de nova sessão
- Dados de matérias/assuntos/técnicas são estáticos no protótipo (viriam de uma API/DB real).

## Design Tokens

**Cores base**
- Fundo da app: `#F6F7FC`
- Texto principal: `#1F2333`
- Texto secundário: `#6B7093` / `#8388A8` / `#9296B4` (tons decrescentes de ênfase)
- Superfície (cards): `#FFFFFF`
- Divisores/inputs: `#EAEBF6` / `#F0F1F9`
- Marca (accent): `#6C5CE7` → gradiente com `#4D96FF` (`135deg`)
- Sucesso: `#2EA95C` (texto), `#E4F8EA` (fundo tag)
- Streak: `#E8590C` (texto), `#FFF4E5` (fundo)

**Cores por matéria** (usadas em ícone, tag de tipo, borda de card, barra de progresso):
| Matéria | Cor |
|---|---|
| Língua Portuguesa | `#FF6B6B` |
| Direito Constitucional | `#4D96FF` |
| Direito Administrativo | `#2EC4B6` |
| Legislação Institucional do Órgão | `#8338EC` |
| Engenharia de Software | `#57CC99` |
| Arquitetura de Software | `#FF9F1C` |
| Linguagens de Programação | `#E1AD01` |
| Qualidade de Software | `#06AED5` |
| Estrutura de Dados e Algoritmos | `#FF5DA2` |
| Arquitetura / Banco de Dados | `#5C6BC0` |
| Segurança da Informação | `#C1121F` |

**Tipografia**
- Heading: Poppins 600/700/800
- Body: Inter 400/500/600/700
- Escala usada: 11–13px (meta/label), 14–15px (corpo), 17–18px (títulos de card), 24–26px (títulos de tela)

**Raio de borda**: 8–12px (inputs/botões), 14–16px (cards pequenos), 18–24px (cards grandes/modais)
**Sombras**: `0 3px 10px rgba(31,35,51,0.06)` (cards), `0 4px 18px rgba(31,35,51,0.06)` (cards grandes), `0 10–24px rgba(108,92,231,0.3–0.35)` (elementos com gradiente de marca)

## Assets
- Ícones: [Phosphor Icons](https://phosphoricons.com), via webfont `@phosphor-icons/web` (classes `ph` / `ph-fill`).
- Fontes: Google Fonts — Poppins e Inter.
- Sem imagens/fotos no protótipo.

## Files
- `Cronograma de Estudos.dc.html` — protótipo completo (todas as telas, lógica de estado em JS, estilos inline).

## Content reference
Dados de matérias/assuntos/pesos foram extraídos de uma planilha real de cronograma de concurso (edital MPMS – Analista de TI), mas a estrutura foi pensada para ser genérica — qualquer concurso pode substituir a lista de matérias/assuntos sem mudar a arquitetura da tela.

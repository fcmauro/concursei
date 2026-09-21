export interface Tecnica {
  name: string;
  what: string;
  usage: string;
}

export interface GrupoTecnicas {
  key: "ALTA" | "MODERADA" | "BAIXA";
  label: string;
  hint: string;
  color: string;
  items: Tecnica[];
}

export const TECNICAS: GrupoTecnicas[] = [
  {
    key: "ALTA",
    label: "Alta eficácia",
    hint: "priorize sempre",
    color: "#2EC4B6",
    items: [
      {
        name: "Active Recall (prática de recuperação)",
        what: "Testar-se ativamente — fechar o material e tentar lembrar, responder questões, recitar em voz alta — em vez de reler. É a técnica com maior efeito comprovado sobre retenção de longo prazo.",
        usage: "No app: conclua cada assunto informando questões e acertos antes de considerá-lo dominado.",
      },
      {
        name: "Repetição Espaçada (Spaced Repetition)",
        what: "Revisar o mesmo conteúdo em intervalos crescentes (1, 7, 15, 30 dias) em vez de estudar tudo de uma vez. Cada revisão no momento certo fortalece a memória muito mais que reestudar tudo (cramming).",
        usage: "No Diário: cards de Revisão 24h / 7 / 15 / 30 dias são gerados sozinhos ao concluir um assunto.",
      },
      {
        name: "Intercalação (Interleaving)",
        what: "Misturar matérias numa mesma sessão, em vez de estudar um assunto isolado até a exaustão. Parece mais difícil no curto prazo, mas melhora a capacidade de aplicar o conhecimento certo na hora certa.",
        usage: "Distribua as matérias em rodízio pelos dias da semana, nunca em blocos fechados de uma matéria só.",
      },
    ],
  },
  {
    key: "MODERADA",
    label: "Eficácia moderada",
    hint: "bom complemento",
    color: "#FF9F1C",
    items: [
      {
        name: "Elaboração (Self-Explanation)",
        what: "Perguntar e responder 'por quê' e 'como' sobre o conteúdo, em vez de só memorizar o 'o quê'. Explicar com suas próprias palavras cria conexões mais profundas.",
        usage: "Ao errar uma questão, registre o fundamento da resposta certa com suas palavras.",
      },
      {
        name: "Exemplos Concretos",
        what: "Associar conceitos abstratos a exemplos e situações reais e específicas. Ajuda a lembrar e a transferir o conhecimento para questões com contextos diferentes.",
        usage: "Ao estudar Direito ou legislação, relacione com situações reais que você já vivencia.",
      },
      {
        name: "Prática Distribuída",
        what: "Estudar em sessões mais curtas e frequentes ao longo do tempo, em vez de sessões longas e raras. É o princípio da repetição espaçada aplicado à carga diária.",
        usage: "Rotina de 2h em dias úteis + 4h no fim de semana, em vez de uma maratona.",
      },
    ],
  },
  {
    key: "BAIXA",
    label: "Baixa eficácia",
    hint: "evite usar sozinha",
    color: "#C1121F",
    items: [
      {
        name: "Releitura",
        what: "Ler o mesmo material várias vezes. Dá uma falsa sensação de domínio, mas o efeito real sobre a retenção é fraco quando usada sozinha, sem teste ativo.",
        usage: "Use só como primeiro contato com o conteúdo, nunca como método principal de revisão.",
      },
      {
        name: "Grifar e Destacar",
        what: "Marcar trechos do texto como importantes. É passivo, exige pouco esforço cognitivo e não força a reorganização da informação na memória.",
        usage: "Ajuda a localizar informação depois, mas não substitui fazer questões.",
      },
      {
        name: "Resumos",
        what: "Reescrever o conteúdo de forma condensada. Funciona bem para quem já sabe resumir, mas tem eficácia inconsistente.",
        usage: "Útil para organizar o material antes de estudar — depois, teste-se com active recall.",
      },
    ],
  },
];

export const DICAS_PRATICAS = [
  "Priorize sempre: fazer questões (active recall) + revisar em intervalos crescentes (repetição espaçada) + misturar matérias (intercalação).",
  "O erro mais comum é inverter a ordem: estudar teoria exaustivamente e deixar questões só para o fim. Comece a fazer questões cedo, mesmo errando muito no início.",
  "Releitura, grifar e resumir sozinhos dão sensação de progresso, mas retêm pouco — use-os só como preparação, nunca como substituto de se testar.",
];

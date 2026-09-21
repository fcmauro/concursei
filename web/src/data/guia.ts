export interface Passo {
  titulo: string;
  texto: string;
}

export interface Bloco {
  id: string;
  titulo: string;
  intro?: string;
  itens: string[];
}

export interface Recurso {
  titulo: string;
  url: string;
  tipo: "Vídeo" | "Artigo" | "Estudo" | "Curso";
}

export interface GrupoRecursos {
  tema: string;
  recursos: Recurso[];
}

export const PASSOS_APP: Passo[] = [
  {
    titulo: "1. Monte seu edital",
    texto:
      "Na aba Edital, cadastre cada matéria (com peso e cor) e os assuntos de cada uma. Use o edital do seu concurso; se ainda não saiu, o do último concurso da mesma banca/órgão serve de base e você ajusta depois.",
  },
  {
    titulo: "2. Planeje a semana no Diário",
    texto:
      "Defina seus horários de estudo e compromissos na aba Rotina; cada dia do Diário mostra quanto tempo ainda cabe. Cada dia é uma coluna. Clique em + adicionar, escolha matéria e assunto. Não deu tempo? Arraste o card para outro dia — a data muda sozinha, sem duplicar nada.",
  },
  {
    titulo: "3. Conclua informando questões",
    texto:
      "Ao clicar em Concluir, informe quantas questões fez e quantas acertou. O assunto passa a contar como \"matei\" no Edital e o desempenho por assunto é calculado.",
  },
  {
    titulo: "4. Deixe as revisões com o app",
    texto:
      "Ao concluir um assunto, o app cria sozinho as revisões de 24h, 7, 15 e 30 dias no Diário. Elas aparecem como cards no dia certo — é só fazer e concluir.",
  },
  {
    titulo: "5. Confira as Horas uma vez por semana",
    texto:
      "A aba Horas divide o tempo disponível entre as matérias de acordo com o peso (a meta de horas vem do Painel ou da aba Rotina) e compara com as horas lançadas no Diário. Reequilibre a semana seguinte se alguma matéria ficou para trás.",
  },
];

export const BLOCOS: Bloco[] = [
  {
    id: "rotina",
    titulo: "Como montar a rotina",
    itens: [
      "Comece pelo objetivo (qual concurso e quando é a prova) e liste as horas realmente livres de cada dia. Só depois distribua as matérias.",
      "Distribua o tempo pelo peso: número de questões da matéria no edital (ou na última prova da banca) dividido pelo total.",
      "Alterne matérias em rodízio em vez de blocos longos de uma só (intercalação).",
      "Sessões curtas e frequentes rendem mais que maratonas raras. Referência: cerca de 1h30 por matéria/dia, com 15 min revisando o que já viu, 1h de conteúdo novo e 15 min de fixação.",
      "Perdeu um ou dois dias? Retome de onde parou; não tente compensar acumulando tudo no mesmo dia.",
      "Se o edital ainda não saiu, comece pelo do último concurso da banca. O programa costuma se repetir.",
    ],
  },
  {
    id: "topico",
    titulo: "Como estudar um assunto",
    itens: [
      "1ª leitura: leia o assunto inteiro sem marcar nada, só para compreender. Não tente decorar ainda.",
      "2ª leitura: releia grifando ou anotando o que vale revisar depois.",
      "Videoaula sozinha não é estudo completo: estudar é ler, resumir, fazer questões e revisar.",
      "Em videoaulas, anote em tópicos curtos; não transcreva o professor.",
      "Ao resolver questões, leve para o material só enunciado e gabarito das mais importantes ou recorrentes.",
    ],
  },
  {
    id: "revisao",
    titulo: "Como revisar",
    itens: [
      "Revisar não é reler tudo: revise o que você marcou — grifos, erros, lei seca e um resumo rápido.",
      "Intervalos-base: 24 horas, 7, 15 e 30 dias (algumas pessoas acrescentam 60). O app já gera esses cards.",
      "Revisão cumulativa: a cada uma ou duas aulas novas, revise as anteriores.",
      "Reserve um dia fixo (ex.: domingo) para zerar revisões atrasadas; não deixe tudo para a última semana.",
    ],
  },
  {
    id: "questoes",
    titulo: "Questões: quando e quanto",
    itens: [
      "Comece a fazer questões cedo, logo depois da teoria. Deixar tudo para o final é o erro mais comum.",
      "Defina uma meta diária de questões e mantenha, mesmo nos dias curtos.",
      "No início priorize qualidade: leia o comentário dos acertos e dos erros — você pode acertar com o raciocínio errado.",
      "Nas semanas finais priorize volume e simulados cronometrados.",
      "Duas semanas antes da prova troque quase todos os blocos por questões, começando pelos assuntos menos vistos.",
    ],
  },
  {
    id: "erros",
    titulo: "Caderno de erros",
    intro: "Use a aba Erros do app: escolha matéria e assunto, classifique o motivo e escreva o fundamento com suas palavras. O gráfico de padrão mostra onde você mais erra.",
    itens: [
      "Registre: matéria/assunto, banca/ano/órgão, data estudada, data para repetir, motivo do erro e o fundamento da resposta certa com suas palavras.",
      "Classifique o motivo: desatenção, desconhecimento ou esquecimento. Se for sempre desatenção, o problema é ritmo de prova, não teoria.",
      "Regra prática: resolva cerca de 10 questões por assunto e leve ao caderno só as 2 ou 3 que mais confundiram.",
      "Não anote toda questão errada — o caderno precisa ser curto para ser revisado.",
    ],
  },
  {
    id: "prova",
    titulo: "Simulados e dia da prova",
    itens: [
      "Calcule o tempo por questão (ex.: 210 min para 120 itens, reservando 20 min para o gabarito, dá cerca de 1min38s por item) e treine cronometrado com provas da banca.",
      "Comece pelas matérias que você domina e, em caso de dúvida, pule e volte depois.",
      "Confira no edital as notas mínimas por bloco: reprovar em um bloco elimina mesmo com total alto.",
      "Se o tempo apertar, use a incidência por subtópico em provas anteriores da banca para priorizar o que mais cai.",
    ],
  },
  {
    id: "semana",
    titulo: "Rotina diária em 6 passos",
    itens: [
      "Veja a tarefa do dia e as revisões que vencem.",
      "Estude e faça questões.",
      "Lance questões e acertos ao concluir.",
      "Confira o status do assunto no Edital.",
      "Registre os erros relevantes.",
      "Uma vez por semana, olhe Edital (progresso) e Horas (previsto x realizado).",
    ],
  },
];

export const RECURSOS: GrupoRecursos[] = [
  {
    tema: "Ciclo de estudos e cronograma",
    recursos: [
      { titulo: "Como fazer um ciclo de estudos para concurso público do zero", url: "https://www.youtube.com/watch?v=uIf3ryViKLc", tipo: "Vídeo" },
      { titulo: "4 passos para montar seu ciclo de estudos para qualquer concurso", url: "https://www.youtube.com/watch?v=AG-DKb9uzQk", tipo: "Vídeo" },
    ],
  },
  {
    tema: "Revisão espaçada",
    recursos: [
      { titulo: "Método de revisão espaçada — como estudar para concurso público", url: "https://www.youtube.com/watch?v=kBHIPtXi5W8", tipo: "Vídeo" },
      { titulo: "Como fazer revisão espaçada para ser aprovado em concurso", url: "https://www.youtube.com/watch?v=XxlbFEMIs14", tipo: "Vídeo" },
      { titulo: "How to Study for Exams — Spaced Repetition (inglês)", url: "https://www.youtube.com/watch?v=Z-zNHHpXoMM", tipo: "Vídeo" },
      { titulo: "Como aplicar a revisão espaçada nos estudos", url: "https://concurseirozero1.com.br/blog/como-aplicar-revisao-espacada-nos-estudos/", tipo: "Artigo" },
    ],
  },
  {
    tema: "Caderno de erros",
    recursos: [
      { titulo: "Como fazer um caderno de erros para concursos públicos", url: "https://www.youtube.com/watch?v=U_SrJrnw2JE", tipo: "Vídeo" },
      { titulo: "Caderno de erros para concursos (modelo Notion)", url: "https://www.youtube.com/watch?v=Z2ce_Wq-NQo", tipo: "Vídeo" },
      { titulo: "Caderno de erros para concurso: como montar e revisar", url: "https://www.estrategiaconcursos.com.br/blog/caderno-de-erros-para-concurso/", tipo: "Artigo" },
    ],
  },
  {
    tema: "Estudar por questões",
    recursos: [
      { titulo: "Como fazer revisão por questões para concursos", url: "https://blog.provasbrasil.com.br/metodos-de-estudo/como-fazer-revisao-por-questoes-para-concursos/", tipo: "Artigo" },
      { titulo: "Como estudar por questões: guia prático", url: "https://www.aprovaconcursos.com.br/blog/como-estudar-por-questoes/", tipo: "Artigo" },
    ],
  },
  {
    tema: "Ciência do aprendizado",
    recursos: [
      { titulo: "Dunlosky et al. (2013) — Improving Students' Learning With Effective Learning Techniques", url: "https://www.psychologicalscience.org/publications/journals/pspi/learning-techniques.html", tipo: "Estudo" },
      { titulo: "Learning How to Learn (Barbara Oakley e Terrence Sejnowski)", url: "https://www.classcentral.com/course/learning-how-to-learn-2161", tipo: "Curso" },
      { titulo: "Study Efficiently With Active Recall And Spaced Repetition (inglês)", url: "https://www.youtube.com/watch?v=BKgrEVq4TT0", tipo: "Vídeo" },
    ],
  },
];

import { TECNICAS, DICAS_PRATICAS } from "../data/tecnicas";
import { PASSOS_APP, BLOCOS, RECURSOS } from "../data/guia";

export default function Guia() {
  return (
    <div className="tecnicas-page">
      <div>
        <h2>Guia de estudo e uso do Concursei</h2>
        <p className="subtitle">
          Como usar o app na prática e o que a ciência do aprendizado (e quem já passou em concurso) recomenda.
        </p>
      </div>

      <nav className="guia-nav" aria-label="Seções do guia">
        <a href="#app">Usando o app</a>
        {BLOCOS.map((b) => (
          <a key={b.id} href={`#${b.id}`}>
            {b.titulo}
          </a>
        ))}
        <a href="#tecnicas">Técnicas</a>
        <a href="#recursos">Vídeos e leituras</a>
      </nav>

      <section id="app" className="guia-section">
        <h3 className="guia-title">Usando o app: passo a passo</h3>
        <div className="passos-grid">
          {PASSOS_APP.map((p) => (
            <article key={p.titulo} className="passo-card">
              <h4>{p.titulo}</h4>
              <p>{p.texto}</p>
            </article>
          ))}
        </div>
      </section>

      {BLOCOS.map((b) => (
        <section key={b.id} id={b.id} className="guia-section">
          <h3 className="guia-title">{b.titulo}</h3>
          {b.intro && <p className="guia-intro">{b.intro}</p>}
          <ul className="guia-list">
            {b.itens.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}

      <section id="tecnicas" className="guia-section">
        <h3 className="guia-title">Técnicas de estudo — o que a ciência mostra que funciona</h3>
        <p className="guia-intro">
          Baseado em Dunlosky, Rawson, Marsh, Nathan &amp; Willingham (2013), a revisão mais citada sobre eficácia de
          técnicas de aprendizagem.
        </p>
        {TECNICAS.map((g) => (
          <div key={g.key} className="tecnica-group">
            <div className="tecnica-group-head">
              <span className="tag" style={{ background: g.color }}>
                {g.label}
              </span>
              <span className="hint">{g.hint}</span>
            </div>
            <div className="tecnica-grid">
              {g.items.map((t) => (
                <article key={t.name} className="tecnica-card" style={{ borderLeftColor: g.color }}>
                  <h3>{t.name}</h3>
                  <p>{t.what}</p>
                  <p className="usage" style={{ color: g.color }}>
                    {t.usage}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ))}
        <div className="tips-card">
          <h3>Resumo prático</h3>
          {DICAS_PRATICAS.map((d) => (
            <p key={d}>• {d}</p>
          ))}
        </div>
      </section>

      <section id="recursos" className="guia-section">
        <h3 className="guia-title">Vídeos e leituras</h3>
        <p className="guia-intro">Conteúdo de terceiros, abre em nova aba. Os vídeos em inglês são opcionais.</p>
        {RECURSOS.map((g) => (
          <div key={g.tema} className="recurso-group">
            <h4>{g.tema}</h4>
            <ul className="recurso-list">
              {g.recursos.map((r) => (
                <li key={r.url}>
                  <span className="recurso-tipo">{r.tipo}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

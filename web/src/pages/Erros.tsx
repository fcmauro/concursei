import { useEffect, useState } from "react";
import { api } from "../api/client";

const REASONS: Record<string, { label: string; color: string }> = {
  DESATENCAO: { label: "Desatenção", color: "#FF9F1C" },
  DESCONHECIMENTO: { label: "Desconhecimento", color: "#C1121F" },
  ESQUECIMENTO: { label: "Esquecimento", color: "#5C6BC0" },
};

export default function Erros() {
  const [errors, setErrors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [source, setSource] = useState("");
  const [reason, setReason] = useState("DESCONHECIMENTO");
  const [reasoning, setReasoning] = useState("");
  const [repeatAt, setRepeatAt] = useState("");

  const [fSubject, setFSubject] = useState("");
  const [fReason, setFReason] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const load = async () => {
    const [e, s] = await Promise.all([api.getErrors(), api.getSubjects()]);
    setErrors(e);
    setSubjects(s);
    setSubjectId((cur) => cur || s[0]?.id || "");
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const subject = subjects.find((s) => s.id === subjectId);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await api.createError({
        subjectId,
        topicId: topicId || undefined,
        source,
        reason,
        correctReasoning: reasoning,
        repeatAt: repeatAt || undefined,
        studiedAt: new Date().toISOString().slice(0, 10),
      });
      setReasoning("");
      setSource("");
      setRepeatAt("");
      await load();
    } catch (err: any) {
      setFormError(err.message);
    }
  }

  async function toggle(e: any) {
    await api.patchError(e.id, { reviewed: !e.reviewed });
    await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Remover este item do caderno?")) return;
    await api.deleteError(id);
    await load();
  }

  if (loading) return <p className="loading">Carregando...</p>;

  const counts: Record<string, number> = { DESATENCAO: 0, DESCONHECIMENTO: 0, ESQUECIMENTO: 0 };
  for (const e of errors) counts[e.reason] = (counts[e.reason] || 0) + 1;
  const shown = errors.filter((e) => (!fSubject || e.subject_id === fSubject) && (!fReason || e.reason === fReason) && (!onlyPending || !e.reviewed));
  const maxCount = Math.max(1, ...Object.values(counts));

  return (
    <div className="erros-page">
      <div>
        <h2>Caderno de erros</h2>
        <p className="subtitle">
          Anote só as questões que mais confundiram (em média 2 ou 3 a cada 10). O motivo do erro mostra o seu padrão: se é sempre desatenção, o problema é ritmo de prova, não teoria.
        </p>
      </div>

      <div className="panel">
        <h3>Padrão dos seus erros</h3>
        <div className="reason-bars">
          {Object.entries(REASONS).map(([k, r]) => (
            <button key={k} className={`reason-bar ${fReason === k ? "on" : ""}`} onClick={() => setFReason(fReason === k ? "" : k)} title="Clique para filtrar">
              <span>{r.label}</span>
              <div className="bar">
                <i style={{ width: `${(counts[k] / maxCount) * 100}%`, background: r.color }} />
              </div>
              <b>{counts[k]}</b>
            </button>
          ))}
        </div>
      </div>

      <form className="panel erro-form" onSubmit={add}>
        <label>
          Matéria
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
            required
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assunto
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">(sem assunto específico)</option>
            {subject?.topics.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Banca / ano / órgão
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex.: CESPE / 2022 / MPMS" />
        </label>
        <label>
          Motivo do erro
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {Object.entries(REASONS).map(([k, r]) => (
              <option key={k} value={k}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Repetir em
          <input type="date" value={repeatAt} onChange={(e) => setRepeatAt(e.target.value)} />
        </label>
        <label className="wide">
          Fundamento da resposta certa (com suas palavras)
          <textarea rows={3} value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="Qual é a regra? Por que a alternativa correta está certa?" />
        </label>
        <button className="primary" type="submit" disabled={!subjectId}>
          Adicionar ao caderno
        </button>
      </form>
      {formError && <div className="error">{formError}</div>}
      {subjects.length === 0 && <p className="hint">Cadastre matérias na aba Edital para começar o caderno.</p>}

      <div className="erro-filters">
        <select value={fSubject} onChange={(e) => setFSubject(e.target.value)} aria-label="Filtrar por matéria">
          <option value="">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <label className="inline-check">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          só pendentes de revisão
        </label>
        <span className="hint">
          {shown.length} de {errors.length}
        </span>
      </div>

      <div className="erro-list">
        {shown.map((e) => (
          <article key={e.id} className={`erro-card ${e.reviewed ? "reviewed" : ""}`} style={{ borderLeftColor: e.subject_color }}>
            <div className="erro-top">
              <b>{e.subject_name}</b>
              <span className="tag" style={{ background: REASONS[e.reason]?.color }}>
                {REASONS[e.reason]?.label}
              </span>
            </div>
            {e.topic_name && <p className="erro-topic">{e.topic_name}</p>}
            {e.source && <small>{e.source}</small>}
            {e.correct_reasoning && <p className="erro-text">{e.correct_reasoning}</p>}
            <div className="erro-foot">
              {e.repeat_at && <small>repetir em {new Date(e.repeat_at + "T00:00:00").toLocaleDateString("pt-BR")}</small>}
              <span className="spacer" />
              <button className="ghost-btn" onClick={() => toggle(e)}>
                {e.reviewed ? "Reabrir" : "Marcar como revisado"}
              </button>
              <button className="icon-btn danger" onClick={() => remove(e.id)} aria-label="Remover">
                ✕
              </button>
            </div>
          </article>
        ))}
        {shown.length === 0 && <p className="hint">Nada por aqui ainda.</p>}
      </div>
    </div>
  );
}

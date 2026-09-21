import { useEffect, useState } from "react";
import { api } from "../api/client";
import SubjectModal from "../components/SubjectModal";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

export default function Edital() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<any | null>(null);

  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState(1);
  const [newColor, setNewColor] = useState("#4D96FF");
  const [topicDrafts, setTopicDrafts] = useState<Record<string, string>>({});

  const load = () =>
    api.getSubjects().then((s) => {
      setSubjects(s);
      setLoading(false);
    });

  useEffect(() => {
    load();
    window.addEventListener("concursei:sessions", load);
    return () => window.removeEventListener("concursei:sessions", load);
  }, []);

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.createSubject(newName.trim(), newWeight, newColor);
    setNewName("");
    setNewWeight(1);
    await load();
  }

  async function addTopic(subjectId: string) {
    const name = (topicDrafts[subjectId] || "").trim();
    if (!name) return;
    await api.createTopic(subjectId, name);
    setTopicDrafts((d) => ({ ...d, [subjectId]: "" }));
    await load();
  }

  async function toggleDone(t: any) {
    if (t.bySession) return;
    await api.updateTopic(t.id, { done: !t.manual });
    await load();
  }

  async function renameTopic(t: any) {
    const name = window.prompt("Novo nome do assunto:", t.name);
    if (!name || !name.trim() || name.trim() === t.name) return;
    await api.updateTopic(t.id, { name: name.trim() });
    await load();
  }

  async function removeTopic(t: any) {
    if (!window.confirm(`Apagar o assunto "${t.name}"? As sessões ligadas a ele ficam sem assunto.`)) return;
    await api.deleteTopic(t.id);
    await load();
  }

  async function removeSubject(s: any) {
    if (!window.confirm(`Apagar a matéria "${s.name}" com todos os assuntos, sessões e erros ligados a ela? Não dá para desfazer.`)) return;
    await api.deleteSubject(s.id);
    await load();
  }

  if (loading) return <p className="loading">Carregando...</p>;

  const totalTopics = subjects.reduce((a, s) => a + s.topics.length, 0);
  const doneTopics = subjects.reduce((a, s) => a + s.topics.filter((t: any) => t.mastered).length, 0);
  const overall = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <div className="edital-page">
      <div className="panel overall">
        <div className="goal-row">
          <span>Progresso no edital</span>
          <span>
            {doneTopics} de {totalTopics} assuntos · <b>{overall}%</b>
          </span>
        </div>
        <div className="bar">
          <i style={{ width: `${overall}%` }} />
        </div>
      </div>

      <form className="add-subject" onSubmit={addSubject}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nova matéria (ex.: Direito Penal)" />
        <label className="inline">
          Peso
          <input type="number" min={1} max={10} value={newWeight} onChange={(e) => setNewWeight(Number(e.target.value))} />
        </label>
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} aria-label="Cor da matéria" />
        <button className="primary" type="submit">
          Adicionar matéria
        </button>
      </form>

      {subjects.length === 0 && (
        <p className="loading">Nenhuma matéria ainda. Cadastre as matérias do seu edital acima e depois os assuntos de cada uma.</p>
      )}

      {subjects.map((s) => {
        const isCollapsed = collapsed[s.id];
        const totalQ = s.topics.reduce((a: number, t: any) => a + t.questions, 0);
        const totalC = s.topics.reduce((a: number, t: any) => a + t.correct, 0);
        return (
          <div key={s.id} className="edital-subject" style={{ borderTopColor: s.color }}>
            <div className="edital-subject-header">
              <button className="chev" onClick={() => setCollapsed((c) => ({ ...c, [s.id]: !c[s.id] }))} aria-expanded={!isCollapsed} aria-label="Recolher ou expandir">
                {isCollapsed ? "▸" : "▾"}
              </button>
              <h3>{s.name}</h3>
              <span className="tag weight">peso {s.weight}</span>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round(s.progress * 100)}%`, background: s.color }} />
              </div>
              <span className="progress-label">{Math.round(s.progress * 100)}%</span>
              <button className="icon-btn" onClick={() => setEditing(s)} aria-label="Editar matéria" title="Editar matéria">
                ✎
              </button>
              <button className="icon-btn danger" onClick={() => removeSubject(s)} aria-label="Apagar matéria" title="Apagar matéria">
                🗑
              </button>
            </div>
            {!isCollapsed && (
              <>
                <div className="table-scroll">
                  <table className="edital-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>✔</th>
                        <th>Assunto</th>
                        <th>Questões</th>
                        <th>Acertos</th>
                        <th>Erros</th>
                        <th>Desempenho</th>
                        <th>Último estudo</th>
                        <th style={{ width: 84 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {s.topics.map((t: any) => {
                        const p = t.desempenho === null ? null : Math.round(t.desempenho * 100);
                        return (
                          <tr key={t.id} className={t.mastered ? "mastered" : ""}>
                            <td>
                              <input
                                type="checkbox"
                                checked={t.mastered}
                                disabled={t.bySession}
                                onChange={() => toggleDone(t)}
                                title={t.bySession ? "Concluído por uma sessão do Diário" : "Marcar como concluído"}
                                aria-label={`Concluído: ${t.name}`}
                              />
                            </td>
                            <td>{t.name}</td>
                            <td>{t.questions}</td>
                            <td className="ok">{t.correct}</td>
                            <td className="bad">{t.errors}</td>
                            <td>{p === null ? "—" : <span className={`perf ${p >= 80 ? "good" : p >= 60 ? "mid" : "low"}`}>{p}%</span>}</td>
                            <td>{fmtDate(t.lastStudied)}</td>
                            <td>
                              <button className="icon-btn" onClick={() => renameTopic(t)} aria-label="Renomear assunto" title="Renomear">
                                ✎
                              </button>
                              <button className="icon-btn danger" onClick={() => removeTopic(t)} aria-label="Apagar assunto" title="Apagar">
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="total-row">
                        <td />
                        <td>Total da matéria</td>
                        <td>{totalQ}</td>
                        <td className="ok">{totalC}</td>
                        <td className="bad">{totalQ - totalC}</td>
                        <td>{totalQ ? `${Math.round((totalC / totalQ) * 100)}%` : "—"}</td>
                        <td />
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="add-topic">
                  <input
                    value={topicDrafts[s.id] || ""}
                    onChange={(e) => setTopicDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addTopic(s.id)}
                    placeholder="+ novo assunto"
                  />
                  <button type="button" onClick={() => addTopic(s.id)}>
                    Adicionar
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {editing && (
        <SubjectModal
          subject={editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await api.updateSubject(editing.id, v);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

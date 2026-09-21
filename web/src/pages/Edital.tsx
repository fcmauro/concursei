import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Edital() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="loading">Carregando...</p>;

  return (
    <div className="edital-page">
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
      {subjects.map((s) => (
        <div key={s.id} className="edital-subject" style={{ borderTopColor: s.color }}>
          <div className="edital-subject-header">
            <h3>{s.name}</h3>
            <span className="tag weight">peso {s.weight}</span>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.round(s.progress * 100)}%`, background: s.color }} />
            </div>
            <span className="progress-label">{Math.round(s.progress * 100)}%</span>
          </div>
          <table className="edital-table">
            <thead>
              <tr>
                <th>Assunto</th>
                <th>Status</th>
                <th>Questões</th>
                <th>Acertos</th>
                <th>Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {s.topics.map((t: any) => (
                <tr key={t.id} className={t.mastered ? "mastered" : ""}>
                  <td>{t.name}</td>
                  <td>{t.mastered ? "✔ Matei" : "— Pendente"}</td>
                  <td>{t.questions}</td>
                  <td>{t.correct}</td>
                  <td>{t.desempenho !== null ? `${Math.round(t.desempenho * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        </div>
      ))}
    </div>
  );
}

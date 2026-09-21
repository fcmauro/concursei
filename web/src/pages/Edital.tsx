import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Edital() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSubjects().then((s) => {
      setSubjects(s);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="loading">Carregando...</p>;

  return (
    <div className="edital-page">
      {subjects.map((s) => (
        <div key={s.id} className="edital-subject" style={{ borderTopColor: s.color }}>
          <div className="edital-subject-header">
            <h3>{s.name}</h3>
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
        </div>
      ))}
    </div>
  );
}

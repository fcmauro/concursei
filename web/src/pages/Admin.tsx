import { useEffect, useState } from "react";
import { api } from "../api/client";
import { formatMinutes } from "../lib/date";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export default function Admin() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAdminUsers()
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!users) return <p className="loading">Carregando...</p>;

  const total = users.length;
  const newLast7 = users.filter((u) => daysAgo(u.createdAt) <= 7).length;
  const active = users.filter((u) => u.sessionsDone > 0).length;

  return (
    <div className="painel-page">
      <div>
        <h2>Administração</h2>
        <p className="subtitle">Contas cadastradas no Concursei e o quanto cada uma está usando o app.</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span>Contas cadastradas</span>
          <strong>{total}</strong>
        </div>
        <div className="stat-card">
          <span>Novas nos últimos 7 dias</span>
          <strong>{newLast7}</strong>
        </div>
        <div className="stat-card">
          <span>Com pelo menos 1 estudo concluído</span>
          <strong>{active}</strong>
          <small>de {total} contas</small>
        </div>
      </div>

      <section className="panel">
        <h3>Contas</h3>
        <div className="table-scroll">
          <table className="edital-table compact">
            <thead>
              <tr>
                <th>Conta</th>
                <th>Concurso</th>
                <th>Cadastro</th>
                <th>Matérias</th>
                <th>Assuntos</th>
                <th>Sessões</th>
                <th>Tempo concluído</th>
                <th>Último estudo</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    <br />
                    <small className="hint">{u.email}</small>
                    {daysAgo(u.createdAt) <= 7 && <span className="tag weight new-tag">novo</span>}
                  </td>
                  <td>{u.examName || "—"}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>{u.subjects}</td>
                  <td>{u.topics}</td>
                  <td>
                    {u.sessionsDone}/{u.sessionsTotal}
                  </td>
                  <td>{formatMinutes(u.minutesDone)}</td>
                  <td>{u.lastStudied ? new Date(u.lastStudied + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8}>Nenhuma conta cadastrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

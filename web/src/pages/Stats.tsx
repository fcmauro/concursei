import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Stats() {
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHoursStats().then((h) => {
      setHours(h);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="loading">Carregando...</p>;

  const totalHoursWeek = hours.reduce((acc, h) => acc + h.hoursPerWeek, 0);
  const totalLogged = hours.reduce((acc, h) => acc + h.hoursLogged, 0);

  return (
    <div className="stats-page">
      <h2>Distribuição de horas por matéria</h2>
      <table className="edital-table">
        <thead>
          <tr>
            <th>Matéria</th>
            <th>Peso</th>
            <th>% do peso</th>
            <th>Horas/semana previstas</th>
            <th>Horas lançadas no diário</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h.subjectId}>
              <td>
                <span className="dot" style={{ background: h.color }} /> {h.name}
              </td>
              <td>{h.weight}</td>
              <td>{Math.round(h.percent * 100)}%</td>
              <td>{h.hoursPerWeek.toFixed(1)}h</td>
              <td>{h.hoursLogged.toFixed(1)}h</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>TOTAL</td>
            <td></td>
            <td></td>
            <td>{totalHoursWeek.toFixed(1)}h</td>
            <td>{totalLogged.toFixed(1)}h</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

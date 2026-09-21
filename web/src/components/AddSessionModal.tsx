import { useState } from "react";

interface Subject {
  id: string;
  name: string;
  color: string;
  topics: { id: string; name: string; mastered: boolean }[];
}

export default function AddSessionModal({
  date,
  subjects,
  onClose,
  onCreate,
}: {
  date: string;
  subjects: Subject[];
  onClose: () => void;
  onCreate: (subjectId: string, topicId: string | undefined, type: string) => void;
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [topicId, setTopicId] = useState("");
  const [type, setType] = useState("ESTUDO");

  const subject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Adicionar em {new Date(date + "T00:00:00").toLocaleDateString("pt-BR")}</h3>
        <label>
          Matéria
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
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
            {subject?.topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.mastered ? "✔ " : ""}
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="ESTUDO">Estudo</option>
            <option value="SIMULADO">Simulado</option>
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button
            className="primary"
            onClick={() => {
              onCreate(subjectId, topicId || undefined, type);
              onClose();
            }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

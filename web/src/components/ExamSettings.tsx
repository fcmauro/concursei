import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";

export interface MeData {
  examName: string | null;
  examDate: string | null;
  prepDate: string | null;
  goalHoursWeek: number;
  goalQuestionsWeek: number;
}

export default function ExamSettings({
  initial,
  onClose,
  onSaved,
}: {
  initial: MeData;
  onClose: () => void;
  onSaved: (me: MeData) => void;
}) {
  const [examName, setExamName] = useState(initial.examName || "");
  const [examDate, setExamDate] = useState(initial.examDate || "");
  const [prepDate, setPrepDate] = useState(initial.prepDate || "");
  const [hours, setHours] = useState(initial.goalHoursWeek);
  const [questions, setQuestions] = useState(initial.goalQuestionsWeek);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setError(null);
    try {
      const me = await api.updateMe({ examName, examDate: examDate || null, prepDate: prepDate || null, goalHoursWeek: hours, goalQuestionsWeek: questions });
      onSaved(me);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>Meu concurso e metas</h3>
        <label>
          Concurso / cargo
          <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Ex.: TJ-SP — Escrevente" />
        </label>
        <label>
          Data da prova
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        </label>
        <label>
          Data-alvo da preparação (se a prova ainda não tem data)
          <input type="date" value={prepDate} onChange={(e) => setPrepDate(e.target.value)} />
        </label>
        <p className="hint" style={{ marginTop: -6 }}>
          Enquanto a data da prova não sai, o Painel conta os dias até esta data. Quando você preencher a data da prova, ela passa a valer.
        </p>
        <div className="sm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <label>
            Meta de horas por semana
            <input type="number" min={0} max={168} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          </label>
          <label>
            Meta de questões por semana
            <input type="number" min={0} value={questions} onChange={(e) => setQuestions(Number(e.target.value))} />
          </label>
        </div>
        <p className="hint">A meta de horas também define quanto tempo cada matéria recebe na aba Horas. Deixe as questões em 0 para não ter meta.</p>
        {error && <div className="error">{error}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

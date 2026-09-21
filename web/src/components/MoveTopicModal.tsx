import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function MoveTopicModal({
  topicName,
  currentSubjectId,
  subjects,
  onClose,
  onMove,
}: {
  topicName: string;
  currentSubjectId: string;
  subjects: { id: string; name: string; color: string }[];
  onClose: () => void;
  onMove: (subjectId: string) => void;
}) {
  const options = subjects.filter((s) => s.id !== currentSubjectId);
  const [target, setTarget] = useState(options[0]?.id || "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>Mover assunto para outra matéria</h3>
        <p className="hint" style={{ margin: 0 }}>
          <b>{topicName}</b>
        </p>
        <label>
          Matéria de destino
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">As sessões, questões e erros ligados a este assunto vão junto e passam a contar na nova matéria.</p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={!target} onClick={() => onMove(target)}>
            Mover
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

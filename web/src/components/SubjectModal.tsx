import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SubjectModal({
  subject,
  areas,
  onClose,
  onSave,
}: {
  subject: { name: string; weight: number; color: string; area?: string | null };
  areas: string[];
  onClose: () => void;
  onSave: (v: { name: string; weight: number; color: string; area: string }) => void;
}) {
  const [name, setName] = useState(subject.name);
  const [weight, setWeight] = useState(subject.weight);
  const [color, setColor] = useState(subject.color);
  const [area, setArea] = useState(subject.area || "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3>Editar matéria</h3>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="sm-grid" style={{ gridTemplateColumns: "1fr 90px" }}>
          <label>
            Peso (1 a 10)
            <input type="number" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </label>
          <label>
            Cor
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 44, padding: 3 }} />
          </label>
        </div>
        <label>
          Grupo / área (opcional)
          <input list="areas-list" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex.: TI, Direito, Português" />
          <datalist id="areas-list">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
        <p className="hint">
          O peso define quantas horas por semana a matéria recebe na aba Horas. O grupo faz o plano gerado alternar entre áreas (nunca dois assuntos seguidos do mesmo grupo, quando possível).
        </p>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), weight, color, area: area.trim() })}>
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

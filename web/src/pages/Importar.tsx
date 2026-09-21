import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { downloadTemplate, parsePastedText, parseWorkbook } from "../lib/importParsers";
import type { ImportPayload } from "../lib/importParsers";

type Mode = "excel" | "texto";

export default function Importar() {
  const [mode, setMode] = useState<Mode>("excel");
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const topicCount = payload ? Object.values(payload.subjects).reduce((a, t) => a + t.length, 0) : 0;
  const dates = payload?.sessions.map((s) => s.date).sort() || [];

  async function dry(p: ImportPayload) {
    setBusy(true);
    setError(null);
    setPreview(null);
    setResult(null);
    try {
      if (!Object.keys(p.subjects).length && !p.sessions.length) throw new Error("Não encontrei matérias nem sessões nesse conteúdo.");
      setPreview((await api.importData({ ...p, dryRun: true })).stats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setError(null);
    try {
      const p = await parseWorkbook(file);
      setPayload(p);
      await dry(p);
    } catch {
      setPayload(null);
      setError("Não consegui ler esse arquivo. Use um .xlsx (o modelo abaixo ajuda).");
    }
  }

  async function onParseText() {
    const p = parsePastedText(text);
    setPayload(p);
    await dry(p);
  }

  async function apply() {
    if (!payload) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.importData({ ...payload, dryRun: false });
      setResult(r.stats);
      setPreview(null);
      window.dispatchEvent(new Event("concursei:sessions"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function setWeight(subject: string, w: number) {
    if (!payload) return;
    const next = { ...payload, weights: { ...payload.weights, [subject]: Math.min(10, Math.max(1, w || 1)) } };
    setPayload(next);
    setPreview(null);
  }

  return (
    <div className="importar-page">
      <div>
        <h2>Importar edital e plano</h2>
        <p className="subtitle">
          Traga suas matérias, assuntos e (opcionalmente) o diário planejado de uma planilha ou de um texto colado. Nada é apagado: o que já existe é reaproveitado e importar de novo não duplica.
        </p>
      </div>

      <div className="rev-tabs" role="tablist">
        <button role="tab" aria-selected={mode === "excel"} className={mode === "excel" ? "active" : ""} onClick={() => setMode("excel")}>
          Planilha Excel
        </button>
        <button role="tab" aria-selected={mode === "texto"} className={mode === "texto" ? "active" : ""} onClick={() => setMode("texto")}>
          Colar texto do edital
        </button>
      </div>

      {mode === "excel" ? (
        <section className="panel">
          <h3>Enviar planilha (.xlsx)</h3>
          <p className="hint" style={{ margin: 0 }}>
            Aceita o modelo do Concursei e também a planilha de cronograma antiga (abas EDITAL, DICA DE HORAS e Diário de estudo). A leitura é feita no seu navegador.
          </p>
          <div className="win-footer">
            <input type="file" accept=".xlsx,.xls,.xlsm" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Escolher planilha" />
            <span className="spacer" />
            <button className="ghost-btn" onClick={downloadTemplate}>
              Baixar modelo (.xlsx)
            </button>
          </div>
          {fileName && <small className="hint">Arquivo: {fileName}</small>}
        </section>
      ) : (
        <section className="panel">
          <h3>Colar o conteúdo programático</h3>
          <p className="hint" style={{ margin: 0 }}>
            Linhas em <b>MAIÚSCULAS</b> (ou terminadas em dois-pontos) viram matérias; as linhas seguintes viram assuntos. Numeração e marcadores são removidos.
          </p>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"LÍNGUA PORTUGUESA\n1. Interpretação de texto\n2. Ortografia e acentuação\n\nDIREITO CONSTITUCIONAL\n1. Direitos e garantias fundamentais"}
          />
          <div className="win-footer">
            <span className="spacer" />
            <button className="primary" onClick={onParseText} disabled={!text.trim() || busy}>
              Analisar texto
            </button>
          </div>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      {payload && (
        <section className="panel">
          <h3>O que foi encontrado</h3>
          <p className="hint" style={{ margin: 0 }}>
            {Object.keys(payload.subjects).length} matérias · {topicCount} assuntos · {payload.sessions.length} sessões
            {dates.length ? ` (${new Date(dates[0] + "T00:00:00").toLocaleDateString("pt-BR")} a ${new Date(dates[dates.length - 1] + "T00:00:00").toLocaleDateString("pt-BR")})` : ""}
          </p>
          <div className="table-scroll">
            <table className="edital-table">
              <thead>
                <tr>
                  <th>Matéria</th>
                  <th style={{ width: 90 }}>Peso</th>
                  <th>Assuntos</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(payload.subjects).map(([name, topics]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      <input type="number" min={1} max={10} value={payload.weights[name] ?? 1} onChange={(e) => setWeight(name, Number(e.target.value))} style={{ width: 70 }} />
                    </td>
                    <td>{topics.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="win-footer">
            <button className="ghost-btn" onClick={() => dry(payload)} disabled={busy}>
              Recalcular prévia
            </button>
            <span className="spacer" />
          </div>
        </section>
      )}

      {preview && (
        <section className="panel">
          <h3>Prévia do que será feito</h3>
          <ul className="mini-list">
            <li><span><b>{preview.subjectsCreated}</b> matérias novas</span></li>
            <li><span><b>{preview.topicsCreated}</b> assuntos novos</span></li>
            <li><span><b>{preview.topicsMarkedDone}</b> assuntos marcados como concluídos</span></li>
            <li><span><b>{preview.sessionsCreated}</b> sessões novas no Diário ({preview.sessionsSkipped} já existiam)</span></li>
          </ul>
          <div className="win-footer">
            <span className="spacer" />
            <button className="primary" onClick={apply} disabled={busy}>
              {busy ? "Importando..." : "Importar agora"}
            </button>
          </div>
        </section>
      )}

      {result && (
        <div className="panel">
          <span className="ok-text">
            ✔ Importado: {result.subjectsCreated} matérias, {result.topicsCreated} assuntos e {result.sessionsCreated} sessões.
          </span>
          <div className="win-footer">
            <Link className="link-btn" to="/edital">
              Ver Edital →
            </Link>
            <Link className="link-btn" to="/board">
              Abrir Diário →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

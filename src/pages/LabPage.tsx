import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../App";
import { useLabData } from "../lib/useLabData";
import { PASS_SCORE, callViva, supabase } from "../lib/supabase";
import { Countdown, Meter, PlanLine, Tally } from "../components/Bits";
import { Mark } from "../components/Mark";

export default function LabPage() {
  const { labId = "" } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data, error, reload } = useLabData({ labId });
  const [savingDate, setSavingDate] = useState(false);
  const [working, setWorking] = useState<"join" | "fill" | "remove" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <p className="error">Couldn't load this subject. {error}</p>;
  if (!data) return <p className="sub">Loading…</p>;
  const lab = data.labs[0];
  if (!lab)
    return (
      <p className="sub">
        This subject isn't available. <Link to="/">See your subjects</Link>
      </p>
    );

  const inMyLabs = lab.id in data.examDates;
  const examDate = data.examDates[lab.id] ?? "";
  const withQuestions = new Set(data.questions.map((q) => q.experiment_id));
  const notReady = data.experiments.filter((e) => !withQuestions.has(e.id)).length;
  const latestByQ = new Map(data.latest.map((l) => [l.question_id, l]));
  const weakQs = data.questions
    .filter((q) => (latestByQ.get(q.id)?.score ?? 99) < PASS_SCORE)
    .sort((a, b) => (latestByQ.get(a.id)?.score ?? 0) - (latestByQ.get(b.id)?.score ?? 0));
  const expTitle = new Map(data.experiments.map((e) => [e.id, e.title]));

  async function saveDate(value: string) {
    setSavingDate(true);
    await supabase.from("user_labs").update({ exam_date: value || null }).eq("user_id", session.user.id).eq("lab_id", lab.id);
    setSavingDate(false);
    reload();
  }

  async function act(kind: "join" | "fill" | "remove") {
    setWorking(kind);
    setActionError(null);
    try {
      if (kind === "join") await callViva({ action: "join_lab", lab_id: lab.id });
      if (kind === "fill") await callViva({ action: "fill_lab", lab_id: lab.id });
      if (kind === "remove") {
        await supabase.from("user_labs").delete().eq("user_id", session.user.id).eq("lab_id", lab.id);
        navigate("/");
        return;
      }
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    }
    setWorking(null);
  }

  return (
    <div>
      <Link to="/" className="back">Home</Link>
      <div className="page-head">
        <h1>{lab.name}</h1>
        {inMyLabs && <Countdown date={examDate} />}
        <p className="fine">
          {lab.university}, {lab.branch}, semester {lab.semester}.{" "}
          {lab.status === "verified" ? (
            <span className="badge-verified">Questions checked for this course.</span>
          ) : (
            <>AI-drafted questions: they may not match your examiner exactly. Report wrong ones while practising.</>
          )}
        </p>
      </div>

      {inMyLabs ? (
        <div className="exam-row">
          <label>
            Viva date
            <input type="date" value={examDate} onChange={(e) => saveDate(e.target.value)} disabled={savingDate} />
          </label>
          <span className="fine">We'll sort your subjects by the nearest viva.</span>
        </div>
      ) : (
        <div className="exam-row">
          <span>This subject isn't in your list yet.</span>
          <button className="btn small" onClick={() => act("join")} disabled={working !== null}>
            {working === "join" ? "Adding…" : "Add to my subjects"}
          </button>
        </div>
      )}

      {notReady > 0 && (
        <div className="notice stack" style={{ marginBottom: 16 }}>
          <span>
            {notReady} topic{notReady === 1 ? " doesn't" : "s don't"} have questions yet.
          </span>
          {working === "fill" ? (
            <p className="marking" role="status" style={{ marginTop: 0 }}>
              <span className="pen-dot" /> Writing questions
            </p>
          ) : (
            inMyLabs && (
              <button className="btn small" onClick={() => act("fill")} disabled={working !== null}>
                Write the missing questions
              </button>
            )
          )}
        </div>
      )}
      {actionError && <p className="error" style={{ marginBottom: 12 }}>{actionError}</p>}

      <div className="start-block">
        <button
          className="btn primary wide tall"
          onClick={() => navigate(`/practice/${lab.id}`)}
          disabled={data.questions.length === 0}
        >
          Start a mock viva
          <span className="btn-sub">10 questions from all topics, weakest first</span>
        </button>
        <span className="fine">
          <PlanLine passes={data.passes} labId={lab.id} sessions={data.sessionsByLab[lab.id] ?? []} />
        </span>
      </div>

      {weakQs.length > 0 && (
        <section>
          <h2>Fix these first</h2>
          <ul className="fix-list">
            {weakQs.slice(0, 6).map((q) => (
              <li key={q.id}>
                <Mark value={latestByQ.get(q.id)?.score ?? 0} size={44} />
                <span>
                  {q.question}
                  <span className="exp">{expTitle.get(q.experiment_id)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Practise one topic</h2>
        <table className="index">
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">Topic</th>
              <th scope="col"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {data.experiments.map((exp) => {
              const qs = data.questions.filter((q) => q.experiment_id === exp.id);
              const scored = qs.map((q) => latestByQ.get(q.id)).filter((l) => l !== undefined);
              const strong = scored.filter((l) => l.score >= PASS_SCORE).length;
              const weak = scored.length - strong;
              return (
                <tr key={exp.id}>
                  <td className="no">{exp.position}</td>
                  <td className="title">
                    {exp.title}
                    <Meter strong={strong} weak={weak} total={qs.length} />
                    <div className="tally">
                      <Tally strong={strong} weak={weak} total={qs.length} />
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn small"
                      onClick={() => navigate(`/practice/${lab.id}?exp=${exp.id}`)}
                      disabled={qs.length === 0}
                    >
                      Practise
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {inMyLabs && (
        <div style={{ marginTop: 32 }}>
          <button className="btn small quiet" onClick={() => act("remove")} disabled={working !== null}>
            {working === "remove" ? "Removing…" : "Remove from my subjects"}
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  PASS_SCORE,
  VivaError,
  callViva,
  supabase,
  type FinishResult,
  type GradeResult,
  type StartResult,
} from "../lib/supabase";
import { useSpeech } from "../lib/useSpeech";
import Paywall from "../components/Paywall";
import { Mark, MicIcon, StopIcon } from "../components/Mark";

type Phase = "starting" | "answering" | "grading" | "feedback" | "finishing" | "done" | "limit" | "error";
type Result = { question: string; score: number };

export default function PracticePage() {
  const { labId = "" } = useParams();
  const [params] = useSearchParams();
  const experimentId = params.get("exp") ?? undefined;
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<StartResult | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<GradeResult | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<FinishResult | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const started = useRef(false);

  const speech = useSpeech((text) => setAnswer((a) => (a ? a.trimEnd() + " " : "") + text));

  // Start exactly once (guards against React dev double-mount using up a free session)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    callViva<StartResult>({ action: "start", lab_id: labId, experiment_id: experimentId })
      .then((r) => {
        setRun(r);
        setPhase("answering");
      })
      .catch((e: unknown) => {
        if (e instanceof VivaError && e.code === "limit_reached") setPhase("limit");
        else {
          setError(e instanceof Error ? e.message : "Couldn't start the session.");
          setPhase("error");
        }
      });
  }, [labId, experimentId]);

  const q = run?.questions[index];
  const total = run?.questions.length ?? 0;
  const isLast = index === total - 1;

  async function submit() {
    if (!run || !q) return;
    if (speech.listening) speech.stop();
    setPhase("grading");
    setError(null);
    try {
      const fb = await callViva<GradeResult>({
        action: "grade",
        session_id: run.session_id,
        question_id: q.id,
        answer,
      });
      setFeedback(fb);
      setResults((r) => [...r, { question: q.question, score: fb.score }]);
      setPhase("feedback");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Marking failed. Submit again.");
      setPhase("answering");
    }
  }

  async function report(questionId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from("question_reports").upsert(
      { user_id: auth.user.id, question_id: questionId, reason: "wrong or unclear" },
      { onConflict: "user_id,question_id", ignoreDuplicates: true },
    );
    setReported((r) => new Set(r).add(questionId));
  }

  async function next() {
    if (!run) return;
    if (!isLast) {
      setIndex((i) => i + 1);
      setAnswer("");
      setFeedback(null);
      setPhase("answering");
      window.scrollTo({ top: 0 });
      return;
    }
    setPhase("finishing");
    try {
      setSummary(await callViva<FinishResult>({ action: "finish", session_id: run.session_id }));
    } catch {
      /* show local results anyway */
    }
    setPhase("done");
    window.scrollTo({ top: 0 });
  }

  if (phase === "limit")
    return (
      <>
        <p className="sub">You've used the free sessions for this subject.</p>
        <Paywall labId={labId} onClose={() => navigate(`/lab/${labId}`)} />
      </>
    );

  if (phase === "error")
    return (
      <div className="narrow stack">
        <p className="error">{error}</p>
        <Link to={`/lab/${labId}`} className="btn">Back</Link>
      </div>
    );

  if (phase === "starting" || !run) return <p className="sub">Choosing your questions…</p>;

  if (phase === "done" || phase === "finishing") {
    const score = summary?.total_score ?? results.reduce((s, r) => s + r.score, 0);
    const max = summary?.max_score ?? total * 10;
    const weak = results.filter((r) => r.score < PASS_SCORE).length;
    return (
      <div className="narrow">
        <p className="sub">{run.lab_name}</p>
        <div className="result-head">
          <Mark value={score} outOf={max} size={120} animate />
          <div>
            <h1>{weak === 0 ? "Every answer was strong." : `${weak} answer${weak === 1 ? "" : "s"} to fix.`}</h1>
            <p className="sub">
              {weak === 0 ? "Try a mock viva across all topics next." : "They come first in your next mock viva."}
            </p>
          </div>
        </div>
        <ul className="result-list">
          {results.map((r, i) => (
            <li key={i}>
              <Mark value={r.score} size={44} tone={r.score < PASS_SCORE ? "red" : "ink"} />
              <span className={r.score < PASS_SCORE ? "" : "sub"}>{r.question}</span>
            </li>
          ))}
        </ul>
        <div className="stack">
          {weak > 0 && (
            <button className="btn primary wide" onClick={() => window.location.assign(`/practice/${labId}`)}>
              Practise weak questions
            </button>
          )}
          <Link to={`/lab/${labId}`} className="btn wide">Back</Link>
          {run.plan === "free" && run.sessions_left_after_this >= 0 && (
            <p className="fine">
              {run.sessions_left_after_this} free session{run.sessions_left_after_this === 1 ? "" : "s"} left for this subject.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="narrow">
      <div className="practice-top">
        <Link to={`/lab/${labId}`} className="back">Back</Link>
        <span className="count">
          {index + 1} of {total}
        </span>
      </div>
      <div className="ticks" aria-hidden="true">
        {run.questions.map((_, i) => (
          <span key={i} className={i < index ? "done" : i === index ? "now" : ""} />
        ))}
      </div>

      <p className="exp-name">{q?.experiment_title}</p>
      <h1 className="question">{q?.question}</h1>

      {phase !== "feedback" && (
        <>
          <textarea
            className="ruled"
            aria-label="Your answer"
            placeholder={speech.supported ? "Tap Speak and answer out loud, or type here" : "Type your answer the way you'd say it"}
            value={answer + (speech.interim ? (answer ? " " : "") + speech.interim : "")}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={phase === "grading"}
          />
          {phase === "grading" ? (
            <p className="marking" role="status">
              <span className="pen-dot" /> The examiner is marking your answer
            </p>
          ) : (
            <div className="answer-actions">
              {speech.supported && (
                <button
                  type="button"
                  className={`btn ${speech.listening ? "listening" : ""}`}
                  onClick={speech.listening ? speech.stop : speech.start}
                  aria-pressed={speech.listening}
                >
                  {speech.listening ? <StopIcon /> : <MicIcon />}
                  {speech.listening ? "Stop" : "Speak"}
                </button>
              )}
              <button className="btn primary grow" onClick={submit} disabled={!answer.trim() && !speech.interim}>
                Submit answer
              </button>
            </div>
          )}
          {speech.error && <p className="hint">{speech.error}</p>}
          {error && <p className="error hint">{error}</p>}
          {phase !== "grading" && (
            <p className="hint">Answer as you would in the viva: define it, explain how it works, give one example.</p>
          )}
        </>
      )}

      {phase === "feedback" && feedback && (
        <div className="stack">
          <div className="ruled your-answer">{answer.trim() || "(no answer)"}</div>

          <div className="verdict-row">
            <Mark value={feedback.score} outOf={10} size={96} animate />
            <p className="verdict">{feedback.verdict}</p>
          </div>

          <div className="notes">
            {feedback.covered.length > 0 && <NoteGroup title="You got" cls="good" items={feedback.covered} />}
            {feedback.errors.length > 0 && <NoteGroup title="Not correct" cls="bad" items={feedback.errors} />}
            {feedback.missed.length > 0 && <NoteGroup title="Add these" cls="add" items={feedback.missed} />}
            {feedback.tip && (
              <p className="tip">
                <b>In the viva:</b> {feedback.tip}
              </p>
            )}
          </div>

          <details className="model" open={feedback.score < PASS_SCORE}>
            <summary>Model answer</summary>
            <div className="model-body">{feedback.model_answer}</div>
          </details>

          {feedback.follow_up && (
            <div className="follow">
              <span className="lbl">The examiner might ask next</span>
              <p>{feedback.follow_up}</p>
            </div>
          )}

          {q &&
            (reported.has(q.id) ? (
              <p className="fine">Thanks. We'll check this question.</p>
            ) : (
              <button type="button" className="link-btn" onClick={() => report(q.id)}>
                Question or model answer wrong? Report it
              </button>
            ))}

          <div className="sticky-next">
            <button className="btn primary wide" onClick={next} disabled={phase !== "feedback"}>
              {isLast ? "See my marks" : "Next question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NoteGroup({ title, cls, items }: { title: string; cls: string; items: string[] }) {
  return (
    <div className={`note-group ${cls}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

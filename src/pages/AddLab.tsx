import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { LAB_COLUMNS, callViva, sameText, supabase, type CreateLabResult, type Lab } from "../lib/supabase";

const MAX_EXPERIMENTS = 12; // keep in sync with the server function

type Suggestion = { name: string; kind: "lab" | "subject"; confidence: "likely" | "guess"; topics: string[] };

export default function AddLab() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [available, setAvailable] = useState<(Lab & { experiments: number })[] | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [labName, setLabName] = useState("");
  const [expText, setExpText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const formRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: labs }, { data: my }] = await Promise.all([
        supabase.from("labs").select(`${LAB_COLUMNS}, experiments(count)`).eq("semester", profile?.semester ?? 0).limit(500),
        supabase.from("user_labs").select("lab_id"),
      ]);
      const course = ((labs ?? []) as unknown as (Lab & { experiments: { count: number }[] })[])
        .filter((l) => sameText(l.university, profile?.university) && sameText(l.branch, profile?.branch))
        .map((l) => ({ ...l, experiments: l.experiments?.[0]?.count ?? 0 }))
        .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "verified" ? -1 : 1));
      setAvailable(course);
      setMine(new Set((my ?? []).map((m) => m.lab_id)));
    })();
  }, [profile?.semester, profile?.university, profile?.branch]);

  const experiments = useMemo(
    () =>
      expText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length >= 3),
    [expText],
  );

  async function suggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const r = await callViva<{ subjects: Suggestion[] }>({ action: "suggest_labs" });
      setSuggestions(r.subjects);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Couldn't get suggestions.");
    }
    setSuggesting(false);
  }

  function pickSuggestion(sug: Suggestion) {
    setPicked(sug.name);
    setLabName(sug.name);
    setExpText(sug.topics.join("\n"));
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const existingByName = (name: string) => available?.find((l) => sameText(l.name, name));

  async function join(labId: string) {
    setBusyId(labId);
    setError(null);
    try {
      await callViva({ action: "join_lab", lab_id: labId });
      navigate(`/lab/${labId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this subject.");
      setBusyId(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (experiments.length === 0) return setError("Add at least one topic, one per line.");
    setCreating(true);
    setError(null);
    try {
      const r = await callViva<CreateLabResult>({
        action: "create_lab",
        university: profile?.university,
        branch: profile?.branch,
        semester: profile?.semester,
        name: labName,
        experiments,
      });
      navigate(`/lab/${r.lab_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this subject.");
      setCreating(false);
    }
  }

  return (
    <div className="narrow">
      <Link to="/" className="back">Home</Link>
      <div className="page-head">
        <h1>Add a subject</h1>
        <p className="sub">
          {profile?.university}, {profile?.branch}, semester {profile?.semester}.{" "}
          <Link to="/account">Change</Link>
        </p>
      </div>

      {available === null ? (
        <p className="sub">Looking for subjects in your course…</p>
      ) : (
        available.length > 0 && (
          <section className="first">
            <h2>Already on VivaCoach for your course</h2>
            <ul className="pick-list">
              {available.map((l) => (
                <li key={l.id}>
                  <div>
                    <b>{l.name}</b>
                    <span className="fine block">
                      {l.experiments} topic{l.experiments === 1 ? "" : "s"},{" "}
                      {l.status === "verified" ? <span className="badge-verified">questions checked</span> : "AI-drafted questions"}
                    </span>
                  </div>
                  {mine.has(l.id) ? (
                    <Link className="btn small quiet" to={`/lab/${l.id}`}>Open</Link>
                  ) : (
                    <button className="btn small" onClick={() => join(l.id)} disabled={busyId !== null}>
                      {busyId === l.id ? "Adding…" : "Add"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      )}

      <section className={available?.length ? "" : "first"}>
        <h2>Not sure what to add?</h2>
        {suggestions === null ? (
          <div className="stack">
            <p className="sub small">
              Get suggested subjects for your course and semester, with their topics filled in. You'll check them against
              your syllabus before adding.
            </p>
            {suggesting ? (
              <p className="marking" role="status" style={{ marginTop: 0 }}>
                <span className="pen-dot" /> Looking up your course
              </p>
            ) : (
              <button className="btn" onClick={suggest} disabled={busyId !== null || creating}>
                Suggest my subjects
              </button>
            )}
            {suggestError && <p className="error">{suggestError}</p>}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="sub small">No suggestions for this course. Add your subject below.</p>
        ) : (
          <>
            <p className="sub small" style={{ marginBottom: 10 }}>
              These are AI suggestions, not your official syllabus. Pick one, then check its topics against your syllabus or
              lab manual.
            </p>
            <ul className="pick-list">
              {suggestions.map((sug) => {
                const existing = existingByName(sug.name);
                return (
                  <li key={sug.name}>
                    <div>
                      <b>{sug.name}</b>
                      <span className="fine block">
                        {sug.topics.length} topics, {sug.confidence === "likely" ? "likely in your syllabus" : "a guess, check it"}
                      </span>
                    </div>
                    {existing ? (
                      mine.has(existing.id) ? (
                        <Link className="btn small quiet" to={`/lab/${existing.id}`}>Open</Link>
                      ) : (
                        <button className="btn small" onClick={() => join(existing.id)} disabled={busyId !== null}>
                          {busyId === existing.id ? "Adding…" : "Add"}
                        </button>
                      )
                    ) : (
                      <button className="btn small" aria-pressed={picked === sug.name} onClick={() => pickSuggestion(sug)}>
                        {picked === sug.name ? "Selected" : "Use this"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section ref={formRef}>
        <h2>{picked ? "Check the topics, then add" : "Add your subject"}</h2>
        <p className="sub small" style={{ marginBottom: 14 }}>
          Copy the topics from your syllabus, or the experiment titles from your lab manual. VivaCoach writes likely viva
          questions for each one.
        </p>
        <form onSubmit={create} className="stack">
          <label>
            Subject or lab name
            <input
              required
              minLength={3}
              maxLength={80}
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Data Structures Laboratory or Marketing Management"
            />
          </label>
          <label>
            Topics or experiments, one per line
            <textarea
              className="plain"
              rows={8}
              value={expText}
              onChange={(e) => setExpText(e.target.value)}
              placeholder={"Implement linear and binary search\nInfix to postfix conversion using a stack\nSingly linked list operations"}
            />
          </label>
          <span className={`fine ${experiments.length > MAX_EXPERIMENTS ? "error" : ""}`}>
            {experiments.length} topic{experiments.length === 1 ? "" : "s"}
            {experiments.length > MAX_EXPERIMENTS && `. Only the first ${MAX_EXPERIMENTS} will be used.`}
          </span>
          {creating ? (
            <p className="marking" role="status">
              <span className="pen-dot" /> Writing viva questions for {Math.min(experiments.length, MAX_EXPERIMENTS)} topics. This
              takes up to a minute.
            </p>
          ) : (
            <button className="btn primary" disabled={busyId !== null}>
              Add subject and write questions
            </button>
          )}
          {error && <p className="error">{error}</p>}
          <p className="fine">
            AI-drafted questions are a starting point. Report any wrong one while practising and we'll fix it for everyone
            in your course.
          </p>
        </form>
      </section>
    </div>
  );
}

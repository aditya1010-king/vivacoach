import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { LAB_COLUMNS, callViva, sameText, supabase, type CreateLabResult, type Lab } from "../lib/supabase";

const MAX_EXPERIMENTS = 12; // keep in sync with the server function

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

  async function join(labId: string) {
    setBusyId(labId);
    setError(null);
    try {
      await callViva({ action: "join_lab", lab_id: labId });
      navigate(`/lab/${labId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add this lab.");
      setBusyId(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (experiments.length === 0) return setError("Add at least one experiment, one per line.");
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
      setError(e instanceof Error ? e.message : "Couldn't add this lab.");
      setCreating(false);
    }
  }

  return (
    <div className="narrow">
      <Link to="/" className="back">All labs</Link>
      <div className="page-head">
        <h1>Add a lab</h1>
        <p className="sub">
          {profile?.university}, {profile?.branch}, semester {profile?.semester}.{" "}
          <Link to="/account">Change</Link>
        </p>
      </div>

      {available === null ? (
        <p className="sub">Looking for labs in your course…</p>
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
                      {l.experiments} experiment{l.experiments === 1 ? "" : "s"},{" "}
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
        <h2>{available?.length ? "Lab not listed? Add it" : "Add your first lab"}</h2>
        <p className="sub small" style={{ marginBottom: 14 }}>
          Copy the experiment titles from the index page of your lab manual or practical file. VivaCoach writes likely
          viva questions for each one.
        </p>
        <form onSubmit={create} className="stack">
          <label>
            Lab name
            <input
              required
              minLength={3}
              maxLength={80}
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Data Structures Laboratory"
            />
          </label>
          <label>
            Experiments, one per line
            <textarea
              className="plain"
              rows={8}
              value={expText}
              onChange={(e) => setExpText(e.target.value)}
              placeholder={"Implement linear and binary search\nInfix to postfix conversion using a stack\nSingly linked list operations"}
            />
          </label>
          <span className={`fine ${experiments.length > MAX_EXPERIMENTS ? "error" : ""}`}>
            {experiments.length} experiment{experiments.length === 1 ? "" : "s"}
            {experiments.length > MAX_EXPERIMENTS && `. Only the first ${MAX_EXPERIMENTS} will be used.`}
          </span>
          {creating ? (
            <p className="marking" role="status">
              <span className="pen-dot" /> Writing viva questions for {Math.min(experiments.length, MAX_EXPERIMENTS)} experiments. This
              takes up to a minute.
            </p>
          ) : (
            <button className="btn primary" disabled={busyId !== null}>
              Add lab and write questions
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

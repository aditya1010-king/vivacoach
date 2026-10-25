import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../App";

// Distinct values, keeping the first spelling seen
function distinct(values: string[]) {
  const seen = new Map<string, string>();
  for (const v of values) {
    const k = v.toLowerCase().trim();
    if (k && !seen.has(k)) seen.set(k, v.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export default function Onboarding() {
  const { session, profile, reloadProfile } = useAuth();
  const [known, setKnown] = useState<{ university: string; branch: string }[]>([]);
  const [name, setName] = useState(profile?.full_name ?? (session.user.user_metadata?.full_name as string) ?? "");
  const [university, setUniversity] = useState(profile?.university ?? "");
  const [branch, setBranch] = useState(profile?.branch ?? "");
  const [semester, setSemester] = useState(profile?.semester ? String(profile.semester) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("labs")
      .select("university, branch")
      .limit(2000)
      .then(({ data }) => setKnown(data ?? []));
  }, []);

  const universities = useMemo(() => distinct(known.map((k) => k.university)), [known]);
  const branches = useMemo(
    () => distinct([...known.map((k) => k.branch), "Computer Engineering", "Information Technology", "Electronics and Telecommunication", "Mechanical Engineering", "Civil Engineering", "Electrical Engineering", "Artificial Intelligence and Data Science"]),
    [known],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("profiles").upsert({
      id: session.user.id,
      full_name: name.trim() || null,
      university: university.trim().replace(/\s+/g, " "),
      branch: branch.trim().replace(/\s+/g, " "),
      semester: Number(semester),
    });
    setBusy(false);
    if (error) setError(`Couldn't save: ${error.message}`);
    else await reloadProfile();
  }

  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Which course are you in?</h1>
        <p className="sub">Any college works. Next you'll pick the subjects you have this semester.</p>
      </div>
      <form onSubmit={save} className="stack">
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" autoComplete="name" />
        </label>
        <label>
          University
          <input
            required
            minLength={2}
            maxLength={80}
            list="universities"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder="e.g. Savitribai Phule Pune University"
          />
          <datalist id="universities">
            {universities.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </label>
        <span className="fine" style={{ marginTop: -6 }}>
          Use your university's full name, the one on your marksheet, so classmates find the same subjects.
        </span>
        <label>
          Course or branch
          <input
            required
            minLength={2}
            maxLength={60}
            list="branches"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="e.g. Computer Engineering, BBA, B.Com"
          />
          <datalist id="branches">
            {branches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
        <label>
          Semester
          <select required value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">Choose…</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}

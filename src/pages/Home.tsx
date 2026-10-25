import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { useLabData } from "../lib/useLabData";
import { PASS_SCORE, daysUntil } from "../lib/supabase";
import { Countdown, Meter, PlanLine, Tally } from "../components/Bits";

export default function Home() {
  const { profile } = useAuth();
  const { data, error } = useLabData({ mine: true });

  if (error) return <p className="error">Couldn't load your subjects. {error}</p>;
  if (!data) return <p className="sub">Loading your subjects…</p>;

  const firstName = profile?.full_name?.split(" ")[0];

  // Soonest upcoming viva first, then labs without a date
  const key = (id: string) => {
    const d = daysUntil(data.examDates[id]);
    return d === null || d < 0 ? 9999 : d;
  };
  const labs = [...data.labs].sort((a, b) => key(a.id) - key(b.id));

  if (labs.length === 0) {
    return (
      <div className="narrow">
        <div className="page-head">
          <h1>{firstName ? `Welcome, ${firstName}.` : "Welcome."} Add your first subject.</h1>
          <p className="sub">
            Start with the subject whose viva or practical exam is nearest. You'll get likely questions for each topic.
          </p>
        </div>
        <Link to="/add-lab" className="btn primary wide">Add a subject</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>{firstName ? `Hi ${firstName}, which subject today?` : "Which subject today?"}</h1>
        <p className="sub">
          {profile?.university}, {profile?.branch}, semester {profile?.semester}
        </p>
      </div>

      <ul className="lab-list">
        {labs.map((lab) => {
          const expIds = new Set(data.experiments.filter((e) => e.lab_id === lab.id).map((e) => e.id));
          const total = data.questions.filter((q) => expIds.has(q.experiment_id)).length;
          const lat = data.latest.filter((l) => l.lab_id === lab.id);
          const strong = lat.filter((l) => l.score >= PASS_SCORE).length;
          const weak = lat.length - strong;
          return (
            <li key={lab.id}>
              <Link to={`/lab/${lab.id}`} className="lab-link">
                <div className="row between">
                  <h2>{lab.name}</h2>
                  <Countdown date={data.examDates[lab.id]} />
                </div>
                <Meter strong={strong} weak={weak} total={total} />
                <div className="tally">
                  <Tally strong={strong} weak={weak} total={total} />
                  <PlanLine passes={data.passes} labId={lab.id} sessions={data.sessionsByLab[lab.id] ?? []} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 20 }}>
        <Link to="/add-lab" className="btn">Add another subject</Link>
      </div>
    </div>
  );
}

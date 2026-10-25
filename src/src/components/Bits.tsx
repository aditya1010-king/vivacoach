import { FREE_SESSIONS_PER_LAB, activePassFor, daysUntil, type Pass } from "../lib/supabase";

export function Countdown({ date }: { date: string | null | undefined }) {
  const d = daysUntil(date);
  if (d === null) return <span className="when">No viva date set</span>;
  if (d < 0) return <span className="when">Viva done</span>;
  if (d === 0) return <span className="when soon">Viva today</span>;
  if (d === 1) return <span className="when soon">Viva tomorrow</span>;
  return <span className={`when ${d <= 7 ? "soon" : ""}`}>Viva in {d} days</span>;
}

export function Meter({ strong, weak, total }: { strong: number; weak: number; total: number }) {
  const ps = total ? (strong / total) * 100 : 0;
  const pw = total ? (weak / total) * 100 : 0;
  return (
    <div className="meter" role="img" aria-label={`${strong} of ${total} answered well, ${weak} to fix`}>
      <span className="good" style={{ width: `${ps}%` }} />
      <span className="weak" style={{ width: `${pw}%` }} />
    </div>
  );
}

export function Tally({ strong, weak, total }: { strong: number; weak: number; total: number }) {
  return (
    <span>
      {strong} of {total} answered well
      {weak > 0 && (
        <>
          , <span className="hl">{weak} to fix</span>
        </>
      )}
    </span>
  );
}

export function PlanLine({ passes, labId, sessions }: { passes: Pass[]; labId: string; sessions: string[] }) {
  const pass = activePassFor(passes, labId);
  if (pass) {
    const used = sessions.filter((s) => s >= pass.valid_from).length;
    const left = Math.max(0, pass.session_limit - used);
    const until = new Date(pass.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return <span>Pass active until {until}, {left} sessions left</span>;
  }
  const left = Math.max(0, FREE_SESSIONS_PER_LAB - sessions.length);
  return (
    <span>
      {left} of {FREE_SESSIONS_PER_LAB} free sessions left
    </span>
  );
}

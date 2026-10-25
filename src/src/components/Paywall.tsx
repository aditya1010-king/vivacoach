import { useState } from "react";
import { config, supabase } from "../lib/supabase";
import { useAuth } from "../App";

type Kind = "week" | "semester";

const PLANS: { kind: Kind; price: string; title: string; detail: string; url: () => string }[] = [
  { kind: "week", price: "₹49", title: "Exam-week pass", detail: "This lab for 7 days, up to 20 sessions", url: () => config.payWeekUrl },
  { kind: "semester", price: "₹149", title: "Semester pass", detail: "Every lab this semester, 60 sessions", url: () => config.paySemesterUrl },
];

export default function Paywall({ labId, onClose }: { labId: string; onClose: () => void }) {
  const { session } = useAuth();
  const [chosen, setChosen] = useState<Kind | null>(null);

  async function choose(kind: Kind, url: string) {
    setChosen(kind);
    // Record interest even if they don't finish paying
    await supabase.from("purchase_requests").insert({ user_id: session.user.id, lab_id: labId, kind });
    if (url) window.open(url, "_blank", "noopener");
  }

  const email = session.user.email ?? "";
  const plan = PLANS.find((p) => p.kind === chosen);
  const waText = encodeURIComponent(`Hi, I paid for the VivaCoach ${plan?.title ?? "pass"}. My account email: ${email}`);

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="sheet">
        <h2 id="paywall-title">Keep practising until your viva</h2>
        <p className="sub">You've used your 3 free sessions for this lab.</p>

        {PLANS.map((p) => (
          <button key={p.kind} className="plan-option" aria-pressed={chosen === p.kind} onClick={() => choose(p.kind, p.url())}>
            <span>
              <b>{p.title}</b>
              <span className="detail">{p.detail}</span>
            </span>
            <span className="price">{p.price}</span>
          </button>
        ))}

        {plan && (
          <div className="pay-steps">
            {plan.url() ? (
              <p>The payment page opened in a new tab. Your pass is switched on within a few hours of paying.</p>
            ) : config.upiId ? (
              <p>
                Pay <b>{plan.price}</b> by UPI to <span className="upi">{config.upiId}</span>, then send the screenshot.
                Your pass is switched on within a few hours.
              </p>
            ) : (
              <p>Payments open soon. We've saved your request and will message you.</p>
            )}
            {config.whatsapp && (
              <a className="btn wide" href={`https://wa.me/${config.whatsapp}?text=${waText}`} target="_blank" rel="noopener">
                Send the screenshot on WhatsApp
              </a>
            )}
            <p className="fine">Not useful? Ask within 24 hours for a full refund.</p>
          </div>
        )}

        <button className="btn quiet wide" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
}

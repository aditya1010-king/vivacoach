import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { config, supabase } from "../lib/supabase";
import { useAuth } from "../App";

type Kind = "week" | "semester";

const PLANS: { kind: Kind; price: string; amount: number; title: string; detail: string; url: () => string }[] = [
  { kind: "week", price: "₹49", amount: 49, title: "Exam-week pass", detail: "This subject for 7 days, up to 20 sessions", url: () => config.payWeekUrl },
  { kind: "semester", price: "₹149", amount: 149, title: "Semester pass", detail: "Every subject this semester, 60 sessions", url: () => config.paySemesterUrl },
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
  // Short code in the payment note, so each payment can be matched to a student
  const code = `VC-${session.user.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const upiLink =
    plan && config.upiId
      ? // Spaces as %20 (some UPI apps show "+" literally); keep "@" readable in the UPI ID
        `upi://pay?pa=${encodeURIComponent(config.upiId).replace("%40", "@")}` +
        `&pn=${encodeURIComponent(config.upiName)}&am=${plan.amount.toFixed(2)}&cu=INR` +
        `&tn=${encodeURIComponent(`${code} ${plan.title}`)}`
      : "";
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!upiLink) return;
    QRCode.toDataURL(upiLink, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr, () => setQr(""));
  }, [upiLink]);
  const isPhone = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);
  const waText = encodeURIComponent(
    `Hi, I paid ${plan?.price ?? ""} for the VivaCoach ${plan?.title ?? "pass"}. Code: ${code}. Account: ${email}`,
  );

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="sheet">
        <h2 id="paywall-title">Keep practising until your viva</h2>
        <p className="sub">You've used your 3 free sessions for this subject.</p>

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
              <>
                {isPhone && (
                  <a className="btn primary wide" href={upiLink}>
                    Pay {plan.price} with a UPI app
                  </a>
                )}
                {qr && (
                  <figure className="qr">
                    <img src={qr} alt={`UPI QR code to pay ${plan.price}`} width={180} height={180} />
                    <figcaption className="fine">
                      {isPhone ? "Or scan from another phone." : "Scan with GPay, PhonePe, Paytm or any UPI app."}
                    </figcaption>
                  </figure>
                )}
                <p className="small">
                  UPI ID <span className="upi">{config.upiId}</span>, amount <b>{plan.price}</b>, note <b>{code}</b>.
                  After paying, send the screenshot. Your pass is switched on within a few hours.
                </p>
              </>
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

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { GoogleIcon, Mark } from "../components/Mark";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="login">
      <div className="login-copy">
        <a className="brand" href="/">
          <span className="brand-v" aria-hidden="true">V</span> VivaCoach
        </a>
        <h1>Practise your viva before the examiner asks.</h1>
        <p className="sub">
          Answer the likely questions for every topic, out loud or typed. Get marked like the real viva, see the
          model answer, and fix your weak spots before exam day.
        </p>

        <div className="login-actions">
          <button className="btn primary wide" onClick={google}>
            <GoogleIcon /> Continue with Google
          </button>
          <div className="or">or</div>
          {sent ? (
            <p className="notice">
              Sign-in link sent to <b>{email}</b>. Open it on this device.
            </p>
          ) : (
            <form onSubmit={magicLink} className="stack">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Your email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="btn wide" disabled={busy}>
                {busy ? "Sending link…" : "Email me a sign-in link"}
              </button>
            </form>
          )}
          {error && <p className="error">{error}</p>}
        </div>

        <p className="fine">
          Built by a student, for students. Your answers are saved only to track your weak topics, and you can delete
          them anytime.
        </p>
      </div>

      <figure className="hero-demo" aria-label="Example of a marked viva answer">
        <p className="q">Why must the array be sorted for binary search?</p>
        <div className="ruled">
          Because it compares the key with the middle element and throws away half. If it isn't sorted it can throw
          away the wrong half.
        </div>
        <Mark value={7} outOf={10} size={86} animate />
        <p className="note">+ say why: left side smaller, right side bigger</p>
        <p className="note">+ give an example where it fails</p>
      </figure>
    </div>
  );
}

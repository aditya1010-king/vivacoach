import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { config, supabase } from "../lib/supabase";

export default function Account() {
  const { session, profile } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeCourse() {
    await supabase.from("profiles").update({ university: null, branch: null, semester: null }).eq("id", session.user.id);
    window.location.assign("/");
  }

  async function deleteAll() {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setError(`Couldn't delete your account: ${error.message}`);
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <div className="narrow">
      <Link to="/" className="back">Home</Link>
      <div className="page-head">
        <h1>Account</h1>
      </div>

      <div className="panel">
        <p>
          <span className="lbl">Signed in as</span>
          {session.user.email}
        </p>
        {profile?.university && (
          <p>
            <span className="lbl">Course</span>
            {profile.university}, {profile.branch}, semester {profile.semester}
          </p>
        )}
        <div className="row wrap">
          {profile?.university && <button className="btn small" onClick={changeCourse}>Change course</button>}
          <button className="btn small" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {config.whatsapp && (
        <div className="panel">
          <p>Missing a subject, a wrong question, or want a refund? Message the founder.</p>
          <div>
            <a className="btn small" href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener">
              Message on WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Delete my data</h2>
        <p className="sub small">Permanently removes your account, answers, marks and passes.</p>
        {!confirm ? (
          <div>
            <button className="btn small danger" onClick={() => setConfirm(true)}>Delete my account</button>
          </div>
        ) : (
          <div className="row wrap">
            <button className="btn small danger" onClick={deleteAll} disabled={busy}>
              {busy ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button className="btn small quiet" onClick={() => setConfirm(false)}>Keep my account</button>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

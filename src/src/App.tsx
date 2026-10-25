import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { configMissing, supabase, type Profile } from "./lib/supabase";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import LabPage from "./pages/LabPage";
import PracticePage from "./pages/PracticePage";
import Account from "./pages/Account";
import AddLab from "./pages/AddLab";

type AuthCtx = {
  session: Session;
  profile: Profile | null;
  reloadProfile: () => Promise<void>;
};
const Ctx = createContext<AuthCtx | null>(null);
export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, university, branch, semester")
      .eq("id", session.user.id)
      .maybeSingle();
    setProfile(data ?? null);
  }, [session]);

  useEffect(() => {
    if (session) reloadProfile();
    else setProfile(undefined);
  }, [session, reloadProfile]);

  if (configMissing) {
    return (
      <div className="shell narrow stack">
        <h1>Setup needed</h1>
        <p>
          Create a <code>.env</code> file with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then
          restart the dev server. See README step 4.
        </p>
      </div>
    );
  }

  if (session === undefined) return <Splash />;
  if (session === null) return <Login />;
  if (profile === undefined) return <Splash />;

  const onboarded = !!profile?.university && !!profile?.semester;

  return (
    <Ctx.Provider value={{ session, profile, reloadProfile }}>
      <BrowserRouter>
        <header className="topbar">
          <Link to="/" className="brand">
            <span className="brand-v" aria-hidden="true">V</span> VivaCoach
          </Link>
          <Link to="/account" className="topbar-link">
            Account
          </Link>
        </header>
        <main className="shell">
          {onboarded ? (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/lab/:labId" element={<LabPage />} />
              <Route path="/add-lab" element={<AddLab />} />
              <Route path="/practice/:labId" element={<PracticePage />} />
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/account" element={<Account />} />
              <Route path="*" element={<Onboarding />} />
            </Routes>
          )}
        </main>
        <footer className="foot">
          VivaCoach by AK ONE. An early version: AI marks can be wrong, so check the model answer.
        </footer>
      </BrowserRouter>
    </Ctx.Provider>
  );
}

function Splash() {
  return (
    <div className="splash">
      <span className="brand-v" style={{ fontSize: "3rem" }} aria-hidden="true">V</span>
    </div>
  );
}

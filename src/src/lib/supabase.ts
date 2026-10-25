import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configMissing = !url || !anonKey;

export const supabase = createClient(url ?? "https://example.supabase.co", anonKey ?? "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const config = {
  payWeekUrl: (import.meta.env.VITE_PAY_WEEK_URL as string | undefined) ?? "",
  paySemesterUrl: (import.meta.env.VITE_PAY_SEMESTER_URL as string | undefined) ?? "",
  upiId: (import.meta.env.VITE_UPI_ID as string | undefined) ?? "",
  whatsapp: (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) ?? "",
};

export const FREE_SESSIONS_PER_LAB = 3; // keep in sync with the server function
export const PASS_SCORE = 6;

// ---------- Types ----------
export type Lab = {
  id: string;
  university: string;
  branch: string;
  semester: number;
  name: string;
  status: "draft" | "verified";
};
export const LAB_COLUMNS = "id, university, branch, semester, name, status";
export type CreateLabResult = { lab_id: string; existed: boolean; experiments: number; ready: number };

export const sameText = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === (b ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export type Experiment = { id: string; lab_id: string; position: number; title: string };
export type QuestionLite = { id: string; experiment_id: string; position: number; question: string };
export type Profile = { id: string; full_name: string | null; university: string | null; branch: string | null; semester: number | null };
export type Pass = { id: string; kind: string; lab_id: string | null; session_limit: number; valid_from: string; valid_until: string };
export type LatestAttempt = { question_id: string; score: number; created_at: string; experiment_id: string; lab_id: string };

export type SessionQuestion = { id: string; question: string; experiment_title: string };
export type StartResult = {
  session_id: string;
  lab_name: string;
  questions: SessionQuestion[];
  plan: "free" | "pass";
  sessions_left_after_this: number;
};
export type GradeResult = {
  score: number;
  verdict: string;
  covered: string[];
  missed: string[];
  errors: string[];
  tip: string;
  follow_up: string;
  model_answer: string;
};
export type FinishResult = { total_score: number; max_score: number; answered: number };

export class VivaError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Calls the "viva" server function with the signed-in user's token.
export async function callViva<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("viva", { body });
  if (error) {
    // Supabase wraps non-2xx responses; read the JSON body for our error code.
    const ctx = (error as { context?: Response }).context;
    let code = "network_error";
    let message = "Could not reach the server. Check your connection and try again.";
    let status = 0;
    if (ctx && typeof ctx.json === "function") {
      status = ctx.status;
      try {
        const b = await ctx.json();
        code = b.error ?? code;
        message = b.message ?? message;
      } catch {
        /* keep defaults */
      }
    }
    throw new VivaError(code, message, status);
  }
  return data as T;
}

// ---------- Small helpers ----------
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function activePassFor(passes: Pass[], labId: string): Pass | undefined {
  const now = Date.now();
  return passes.find(
    (p) =>
      (p.lab_id === null || p.lab_id === labId) &&
      new Date(p.valid_from).getTime() <= now &&
      new Date(p.valid_until).getTime() >= now,
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  LAB_COLUMNS,
  supabase,
  type Experiment,
  type Lab,
  type LatestAttempt,
  type Pass,
  type QuestionLite,
} from "./supabase";

export type LabData = {
  labs: Lab[];
  experiments: Experiment[];
  questions: QuestionLite[];
  latest: LatestAttempt[];
  passes: Pass[];
  examDates: Record<string, string | null>; // a key exists only for labs in "my labs"
  sessionsByLab: Record<string, string[]>; // lab_id -> started_at list
};

// Loads one lab (labId) or the student's own list of labs (mine).
export function useLabData(filter: { labId?: string; mine?: boolean }) {
  const [data, setData] = useState<LabData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    const { data: myRows, error: mErr } = await supabase.from("user_labs").select("lab_id, exam_date");
    if (mErr) return setError(mErr.message);
    const examDates: Record<string, string | null> = {};
    for (const r of myRows ?? []) examDates[r.lab_id] = r.exam_date;

    const labIds = filter.labId ? [filter.labId] : Object.keys(examDates);
    if (labIds.length === 0) {
      setData({ labs: [], experiments: [], questions: [], latest: [], passes: [], examDates, sessionsByLab: {} });
      return;
    }

    const { data: labs, error: lErr } = await supabase.from("labs").select(LAB_COLUMNS).in("id", labIds).order("name");
    if (lErr) return setError(lErr.message);

    const { data: experiments, error: eErr } = await supabase
      .from("experiments")
      .select("id, lab_id, position, title")
      .in("lab_id", labIds)
      .order("position");
    if (eErr) return setError(eErr.message);
    const expIds = (experiments ?? []).map((e) => e.id);

    const [qRes, latRes, passRes, sessRes] = await Promise.all([
      supabase.from("questions").select("id, experiment_id, position, question").in("experiment_id", expIds).eq("is_active", true),
      supabase.from("latest_attempts").select("question_id, score, created_at, experiment_id, lab_id").in("lab_id", labIds),
      supabase.from("passes").select("id, kind, lab_id, session_limit, valid_from, valid_until"),
      supabase.from("practice_sessions").select("lab_id, started_at").in("lab_id", labIds),
    ]);
    const firstErr = [qRes, latRes, passRes, sessRes].find((r) => r.error)?.error;
    if (firstErr) return setError(firstErr.message);

    const sessionsByLab: Record<string, string[]> = {};
    for (const s of sessRes.data ?? []) (sessionsByLab[s.lab_id] ??= []).push(s.started_at);

    setData({
      labs: (labs ?? []) as Lab[],
      experiments: experiments ?? [],
      questions: qRes.data ?? [],
      latest: latRes.data ?? [],
      passes: passRes.data ?? [],
      examDates,
      sessionsByLab,
    });
  }, [filter.labId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, reload: load };
}

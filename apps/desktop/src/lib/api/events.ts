import { listen } from "@tauri-apps/api/event";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { isTauriRuntime } from "@/lib/tauri";
import { keys } from "./queries";
import type { JobProgress, ModelStatus } from "./types";

/** Backend → interface event names (`src-tauri/src/state.rs`, `analysis.rs`). */
export const EVENTS = {
  aiStatus: "ai://status",
  analysisProgress: "analysis://progress",
  session: "session://changed",
} as const;

type JobListener = (job: JobProgress) => void;
const jobListeners = new Set<JobListener>();
const latestJobs = new Map<string, JobProgress>();

/**
 * Wire backend events into the query cache. Called once from the root.
 *
 * - Model status changes replace the cached status directly.
 * - Analysis progress updates the live job and refreshes the examination as
 *   each image's result is stored, so results appear as they are produced.
 */
export function connectBackendEvents(client: QueryClient): () => void {
  if (!isTauriRuntime()) return () => {};
  const offs: Promise<() => void>[] = [];

  offs.push(
    listen<ModelStatus>(EVENTS.aiStatus, (event) => {
      client.setQueryData(keys.aiStatus, event.payload);
    }),
  );

  offs.push(
    listen<JobProgress>(EVENTS.analysisProgress, (event) => {
      const job = event.payload;
      const previous = latestJobs.get(job.id);
      latestJobs.set(job.id, job);
      for (const listener of jobListeners) listener(job);

      const finished = job.state !== "queued" && job.state !== "running";
      const advanced = previous?.done !== job.done;
      if (advanced || finished || !previous) {
        void client.invalidateQueries({ queryKey: keys.exam(job.examId) });
      }
      if (finished || !previous) {
        void client.invalidateQueries({ queryKey: ["exams", "list"] });
        void client.invalidateQueries({ queryKey: keys.examStats });
      }
    }),
  );

  return () => {
    for (const off of offs) void off.then((unlisten) => unlisten());
  };
}

/** The live job for an examination, seeded from the exam detail response. */
export function useExamJob(
  examId: string,
  initial: JobProgress | null,
): JobProgress | null {
  const [job, setJob] = useState<JobProgress | null>(initial);

  useEffect(() => {
    setJob((current) => {
      if (!initial)
        return current && current.examId === examId ? current : null;
      const cached = latestJobs.get(initial.id);
      return cached ?? initial;
    });
  }, [examId, initial]);

  useEffect(() => {
    const listener: JobListener = (next) => {
      if (next.examId === examId) setJob(next);
    };
    jobListeners.add(listener);
    return () => {
      jobListeners.delete(listener);
    };
  }, [examId]);

  return job;
}

export function isJobActive(job: JobProgress | null): boolean {
  return job !== null && (job.state === "queued" || job.state === "running");
}

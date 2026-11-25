import {
  keepPreviousData,
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ApiError, api, isSessionError } from "./client";
import type {
  AuditQuery,
  ExamInput,
  ExamQuery,
  NewUserInput,
  PatientInput,
  PatientQuery,
  ReviewInput,
  SettingsInput,
  UpdateUserInput,
} from "./types";

/**
 * Server state lives in React Query. Keys are hierarchical so one
 * invalidation refreshes everything that could show the changed record.
 */
export const keys = {
  patients: ["patients"] as const,
  patientList: (query: PatientQuery) => ["patients", "list", query] as const,
  patient: (id: string) => ["patients", "detail", id] as const,
  exams: ["exams"] as const,
  examList: (query: ExamQuery) => ["exams", "list", query] as const,
  examStats: ["exams", "stats"] as const,
  exam: (id: string) => ["exams", "detail", id] as const,
  analysisHistory: (imageId: string) =>
    ["exams", "analysis-history", imageId] as const,
  aiStatus: ["ai", "status"] as const,
  users: ["users"] as const,
  settings: ["settings"] as const,
  system: ["system"] as const,
  audit: (query: AuditQuery) => ["audit", query] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Local backend: no network flakiness to retry through, and a session
        // error must surface immediately.
        retry: (count, error) =>
          !(error instanceof ApiError) && !isSessionError(error) && count < 1,
        refetchOnWindowFocus: false,
        staleTime: 5_000,
      },
      mutations: { retry: false },
    },
  });
}

// Queries --------------------------------------------------------------------

export function usePatients(query: PatientQuery) {
  return useQuery({
    queryKey: keys.patientList(query),
    queryFn: () => api.listPatients(query),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: keys.patient(id),
    queryFn: () => api.getPatient(id),
  });
}

export function useExams(
  query: ExamQuery,
  options: { refetchInterval?: number } = {},
) {
  return useQuery({
    queryKey: keys.examList(query),
    queryFn: () => api.listExams(query),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });
}

export function useExamStats() {
  return useQuery({ queryKey: keys.examStats, queryFn: api.examStats });
}

export function useExam(id: string) {
  return useQuery({ queryKey: keys.exam(id), queryFn: () => api.getExam(id) });
}

export function useAnalysisHistory(imageId: string | null) {
  return useQuery({
    queryKey: keys.analysisHistory(imageId ?? ""),
    queryFn: () => api.analysisHistory(imageId ?? ""),
    enabled: imageId !== null,
  });
}

export function useAiStatus() {
  return useQuery({
    queryKey: keys.aiStatus,
    queryFn: api.aiStatus,
    // Pushed by `ai://status` events; this is a safety net while loading.
    refetchInterval: (query) =>
      query.state.data?.state === "loading" ||
      query.state.data?.state === "unchecked"
        ? 1500
        : false,
  });
}

export function useUsers(enabled = true) {
  return useQuery({ queryKey: keys.users, queryFn: api.listUsers, enabled });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: api.getSettings });
}

export function useSystemInfo(enabled = true) {
  return useQuery({ queryKey: keys.system, queryFn: api.systemInfo, enabled });
}

export function useAudit(query: AuditQuery) {
  return useQuery({
    queryKey: keys.audit(query),
    queryFn: () => api.listAudit(query),
    placeholderData: keepPreviousData,
  });
}

// Mutations ------------------------------------------------------------------

function useInvalidate() {
  const client = useQueryClient();
  return (...groups: readonly (readonly unknown[])[]) =>
    Promise.all(
      groups.map((queryKey) => client.invalidateQueries({ queryKey })),
    );
}

export function useCreatePatient() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: PatientInput) => api.createPatient(input),
    onSuccess: () => invalidate(keys.patients, keys.examStats),
  });
}

export function useUpdatePatient(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: PatientInput) => api.updatePatient(id, input),
    onSuccess: () => invalidate(keys.patients, keys.exams),
  });
}

export function useCreateExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      patientId,
      input,
    }: {
      patientId: string;
      input: ExamInput;
    }) => api.createExam(patientId, input),
    onSuccess: () => invalidate(keys.exams, keys.patients),
  });
}

export function useUpdateExam(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ExamInput) => api.updateExam(id, input),
    onSuccess: () => invalidate(keys.exams),
  });
}

/** Anything that changes an examination's images, AI results or review. */
export function useInvalidateExam() {
  const invalidate = useInvalidate();
  return () => invalidate(keys.exams, keys.patients);
}

export function useSaveReview(examId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ReviewInput) => api.saveReviewDraft(examId, input),
    onSuccess: () => invalidate(keys.exam(examId)),
  });
}

export function useSignReview(examId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      input,
      password,
    }: {
      input: ReviewInput;
      password: string;
    }) => api.signReview(examId, input, password),
    onSuccess: () => invalidate(keys.exams, keys.patients),
  });
}

export function useAmendReview(examId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (reason: string) => api.amendReview(examId, reason),
    onSuccess: () => invalidate(keys.exams, keys.patients),
  });
}

export function useCreateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: NewUserInput) => api.createUser(input),
    onSuccess: () => invalidate(keys.users),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      api.updateUser(id, input),
    onSuccess: () => invalidate(keys.users),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.resetPassword(id, password),
  });
}

export function useUpdateSettings() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: SettingsInput) => api.updateSettings(input),
    onSuccess: () => invalidate(keys.settings),
  });
}

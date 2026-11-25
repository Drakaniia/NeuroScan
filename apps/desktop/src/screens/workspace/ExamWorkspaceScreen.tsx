import { Link } from "@tanstack/react-router";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { appWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  FolderOpen,
  ImagePlus,
  Pencil,
  Play,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { describeAi } from "@/components/ai/AiStatusIndicator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import { buttonVariants } from "@/components/ui/Button";
import { PriorityBadge, StatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import {
  FITTED,
  ImageViewer,
  type ImageViewerHandle,
  type ViewerTool,
  type ViewState,
} from "@/components/viewer/ImageViewer";
import { api, errorMessage } from "@/lib/api/client";
import { isJobActive, useExamJob } from "@/lib/api/events";
import { useAiStatus, useExam, useInvalidateExam } from "@/lib/api/queries";
import type { ImageItem, ImportSummary } from "@/lib/api/types";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import {
  formatDate,
  formatPercent,
  patientName,
  sexAge,
  VERDICT_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import { isTauriRuntime } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { annotateSnapshot, canvasToBase64Png } from "@/lib/viewer/annotate";
import {
  DEFAULT_OVERLAY,
  defaultWindow,
  type OverlaySettings,
  type WindowLevel,
  windowPresets,
} from "@/lib/viewer/render";
import { ExamFormDialog } from "@/screens/exams/ExamFormDialog";
import { AiFindingsPanel } from "./AiFindingsPanel";
import { ImageInfoPanel } from "./ImageInfoPanel";
import { ImageStrip } from "./ImageStrip";
import { ImportResultDialog } from "./ImportResultDialog";
import { ReviewPanel } from "./ReviewPanel";
import { ViewerToolbar } from "./ViewerToolbar";

type Tab = "ai" | "review" | "info";

export function ExamWorkspaceScreen({ examId }: { examId: string }) {
  const toast = useToast();
  const { can } = useSession();
  const exam = useExam(examId);
  const ai = useAiStatus();
  const invalidate = useInvalidateExam();
  const detail = exam.data;
  const job = useExamJob(examId, detail?.activeJob ?? null);
  const jobActive = isJobActive(job);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ai");
  const [tool, setTool] = useState<ViewerTool>("wl");
  const [view, setView] = useState<ViewState>(FITTED);
  const [windowLevel, setWindowLevel] = useState<WindowLevel | null>(null);
  const [invert, setInvert] = useState(false);
  const [overlay, setOverlay] = useState<OverlaySettings>(DEFAULT_OVERLAY);
  const [compare, setCompare] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [removing, setRemoving] = useState<ImageItem | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const viewerRef = useRef<ImageViewerHandle>(null);

  const images = detail?.images ?? [];
  const selected =
    images.find((image) => image.id === selectedId) ?? images[0] ?? null;
  const selectedIndex = selected ? images.indexOf(selected) : -1;
  const finalized = detail?.exam.status === "finalized";
  const canImport = can("exam_write") && !finalized;
  const aiReady = describeAi(ai.data).ready;

  // Keep a valid selection as images arrive or are removed.
  useEffect(() => {
    if (images.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!images.some((image) => image.id === selectedId)) {
      setSelectedId(images[0].id);
    }
  }, [images, selectedId]);

  // Window follows the image unless it shares the previous image's defaults
  // (the same series), in which case the reader's adjustment is kept.
  const lastDefaults = useRef<string | null>(null);
  useEffect(() => {
    if (!selected) return;
    const defaults = `${selected.windowCenter}|${selected.windowWidth}|${selected.invert}`;
    if (defaults !== lastDefaults.current || windowLevel === null) {
      setWindowLevel(defaultWindow(selected));
      setInvert(selected.invert);
      lastDefaults.current = defaults;
    }
  }, [selected, windowLevel]);

  const runImport = useCallback(
    async (action: () => Promise<ImportSummary | null>) => {
      setImporting(true);
      try {
        const summary = await action();
        if (!summary) return;
        await invalidate();
        if (summary.importedImages > 0 && summary.imageIds[0])
          setSelectedId(summary.imageIds[0]);
        const warned = summary.outcomes.some(
          (outcome) => outcome.warnings.length > 0,
        );
        if (summary.rejected > 0 || summary.duplicates > 0 || warned) {
          setImportResult(summary);
        }
        if (summary.importedImages > 0) {
          toast.success(
            `${summary.importedImages} image${summary.importedImages === 1 ? "" : "s"} imported`,
            summary.rejected > 0
              ? `${summary.rejected} file(s) could not be imported — see the import result.`
              : undefined,
          );
        } else if (summary.rejected === 0 && summary.duplicates === 0) {
          toast.info(
            "Nothing to import",
            "No supported image files were found.",
          );
        }
      } catch (error) {
        toast.error("Import failed", errorMessage(error));
      } finally {
        setImporting(false);
      }
    },
    [invalidate, toast],
  );

  // Files dropped on the window (Tauri delivers paths, not browser File objects).
  useEffect(() => {
    if (!isTauriRuntime() || !canImport) return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    void appWindow
      .onFileDropEvent((event) => {
        if (event.payload.type === "hover") setDropActive(true);
        else if (event.payload.type === "cancel") setDropActive(false);
        else if (event.payload.type === "drop") {
          setDropActive(false);
          const paths = event.payload.paths;
          if (paths.length > 0)
            void runImport(() => api.importPaths(examId, paths));
        }
      })
      .then((off) => {
        if (cancelled) off();
        else unlisten = off;
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [canImport, examId, runImport]);

  const startAnalysis = async (scope: "all" | "unanalyzed" | "image") => {
    if (!detail) return;
    const ids =
      scope === "image" && selected
        ? [selected.id]
        : scope === "unanalyzed"
          ? images
              .filter((image) => !image.latestAnalysis)
              .map((image) => image.id)
          : undefined;
    setStarting(true);
    try {
      await api.startAnalysis(examId, ids);
      await invalidate();
      setTab("ai");
    } catch (error) {
      toast.error("AI analysis could not start", errorMessage(error));
    } finally {
      setStarting(false);
    }
  };

  const cancelAnalysis = async () => {
    if (!job) return;
    try {
      await api.cancelAnalysis(job.id);
      toast.info(
        "Stopping analysis",
        "The image in progress is finished first; completed results are kept.",
      );
    } catch (error) {
      toast.error("Could not stop the analysis", errorMessage(error));
    }
  };

  const removeImage = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await api.removeImage(removing.id);
      await invalidate();
      toast.success("Image removed", removing.originalName);
      setRemoving(null);
    } catch (error) {
      toast.error("Image not removed", errorMessage(error));
    } finally {
      setRemoveBusy(false);
    }
  };

  const exportImage = async () => {
    if (!detail || !selected) return;
    const analysis = selected.latestAnalysis;
    const withOverlay = overlay.visible && Boolean(analysis?.activationMap);
    const snapshot = viewerRef.current?.snapshot({ overlay: withOverlay });
    if (!snapshot) {
      toast.error("Export failed", "The image is not loaded yet.");
      return;
    }
    const { patient, exam: summary } = detail;
    const aiLine =
      analysis?.status === "completed" && analysis.verdict
        ? `AI (decision support): ${VERDICT_LABELS[analysis.verdict]} · P ${formatPercent(analysis.probability)} · ${analysis.modelName} v${analysis.modelVersion}${analysis.modelFixture ? " · TEST FIXTURE" : ""}`
        : "AI: not analyzed";
    const annotated = annotateSnapshot(snapshot, {
      left: [patientName(patient), `MRN ${patient.mrn} · ${sexAge(patient)}`],
      right: [
        summary.accessionNumber,
        `${formatDate(summary.studyDate)} · image ${selected.seq}`,
        `W ${Math.round(windowLevel?.width ?? 0)} L ${Math.round(windowLevel?.center ?? 0)}`,
      ],
      footer: `${aiLine}${withOverlay ? " · heatmap shown" : ""} — not a diagnosis`,
    });
    setExporting(true);
    try {
      const path = await api.saveExport({
        kind: "png",
        fileName: `${summary.accessionNumber}_image${selected.seq}${withOverlay ? "_ai-overlay" : ""}.png`,
        base64: canvasToBase64Png(annotated),
        description: `Annotated image ${selected.seq} (${selected.originalName})${withOverlay ? " with AI heatmap" : ""}`,
        examId: summary.id,
      });
      if (path) toast.success("Image exported", path);
    } catch (error) {
      toast.error("Export failed", errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const resetView = useCallback(() => {
    setView(FITTED);
    if (selected) {
      setWindowLevel(defaultWindow(selected));
      setInvert(selected.invert);
    }
  }, [selected]);

  const shortcuts = useMemo(
    () => ({
      arrowdown: () => {
        if (selectedIndex >= 0 && selectedIndex < images.length - 1)
          setSelectedId(images[selectedIndex + 1].id);
      },
      arrowup: () => {
        if (selectedIndex > 0) setSelectedId(images[selectedIndex - 1].id);
      },
      w: () => setTool("wl"),
      p: () => setTool("pan"),
      h: () =>
        setOverlay((current) => ({ ...current, visible: !current.visible })),
      i: () => setInvert((current) => !current),
      r: resetView,
      f: () => setView(FITTED),
      "+": () =>
        setView((current) => ({
          ...current,
          zoom: Math.min(16, current.zoom * 1.25),
        })),
      "=": () =>
        setView((current) => ({
          ...current,
          zoom: Math.min(16, current.zoom * 1.25),
        })),
      "-": () =>
        setView((current) => ({
          ...current,
          zoom: Math.max(0.25, current.zoom * 0.8),
        })),
    }),
    [images, resetView, selectedIndex],
  );
  useKeyboardShortcuts(shortcuts);

  if (exam.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 px-4 pb-2 pt-2">
        <Skeleton className="h-12 w-1/2" />
        <div className="flex flex-1 gap-2">
          <Skeleton className="flex-1 rounded-[14px]" />
          <Skeleton className="w-[372px] rounded-[14px]" />
        </div>
      </div>
    );
  }
  if (exam.isError || !detail) {
    return (
      <ErrorState
        error={exam.error}
        onRetry={() => void exam.refetch()}
        title="The examination could not be opened"
      />
    );
  }

  const { patient, exam: summary } = detail;
  const analysis = selected?.latestAnalysis ?? null;
  const overlayAvailable = Boolean(analysis?.activationMap);
  const unanalyzed = images.filter((image) => !image.latestAnalysis).length;

  const annotations = selected
    ? {
        topLeft: (
          <>
            <div className="font-semibold">{patientName(patient)}</div>
            <div>
              MRN {patient.mrn} · {sexAge(patient)}
            </div>
            <div>{summary.description}</div>
          </>
        ),
        topRight: (
          <>
            <div>{summary.accessionNumber}</div>
            <div>{formatDate(summary.studyDate)}</div>
            <div>
              Image {selected.seq}/{images.length}
              {selected.frameCount > 1
                ? ` · frame ${selected.frameIndex + 1}/${selected.frameCount}`
                : ""}
            </div>
            <div>
              {selected.width}×{selected.height} {selected.format.toUpperCase()}
            </div>
          </>
        ),
      }
    : undefined;

  const viewerProps =
    selected && windowLevel
      ? {
          image: selected,
          analysis,
          window: windowLevel,
          onWindowChange: setWindowLevel,
          invert,
          view,
          onViewChange: setView,
          tool,
          overlay,
          annotations,
        }
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Patient and examination banner, on the canvas above the stage. */}
      <header className="no-print flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 px-4 pb-3 pt-1">
        <Tooltip content="Back to patient chart">
          <Link
            to="/patients/$patientId"
            params={{ patientId: patient.id }}
            aria-label="Back to patient chart"
            className="pressable flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-secondary shadow-control hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        </Tooltip>
        <div className="selectable min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="type-title truncate text-ink">
              {patientName(patient)}
            </h1>
            <PriorityBadge priority={summary.priority} />
            <StatusBadge status={summary.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-muted">
            <span className="font-mono">{patient.mrn}</span>
            <span className="mx-1.5 text-ink-faint">·</span>
            {sexAge(patient)}
            {patient.birthDate
              ? ` · born ${formatDate(patient.birthDate)}`
              : ""}
            <span className="mx-1.5 text-ink-faint">|</span>
            <span className="font-medium text-ink-secondary">
              {summary.description}
            </span>
            {` · ${formatDate(summary.studyDate)} · `}
            <span className="font-mono">{summary.accessionNumber}</span>
            {summary.referringPhysician
              ? ` · Ref. ${summary.referringPhysician}`
              : ""}
          </p>
          {summary.clinicalIndication ? (
            <p className="mt-0.5 truncate text-xs text-ink-secondary">
              <span className="text-ink-muted">Indication: </span>
              {summary.clinicalIndication}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {can("exam_write") && !finalized ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Pencil className="size-3.5" aria-hidden="true" />}
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null}
          {canImport ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  size="sm"
                  icon={<ImagePlus className="size-3.5" aria-hidden="true" />}
                  loading={importing}
                >
                  Import
                  <ChevronDown className="-mr-0.5 size-3" aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="popover-motion material-overlay z-[70] min-w-[200px] rounded-xl p-1.5 outline-none"
                >
                  {(
                    [
                      [false, "Image files…", ImagePlus],
                      [true, "Folder…", FolderOpen],
                    ] as const
                  ).map(([folder, label, Icon]) => (
                    <DropdownMenu.Item
                      key={label}
                      onSelect={() =>
                        void runImport(() => api.importDialog(examId, folder))
                      }
                      className="group flex h-8 cursor-default items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ink outline-none data-[highlighted]:bg-accent data-[highlighted]:text-white"
                    >
                      <Icon
                        className="size-4 text-ink-muted group-data-[highlighted]:text-white"
                        aria-hidden="true"
                      />
                      {label}
                    </DropdownMenu.Item>
                  ))}
                  <p className="px-2.5 pb-1 pt-1.5 text-2xs text-ink-muted">
                    Or drop DICOM, PNG or JPEG files on the window.
                  </p>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : null}
          {can("analysis_run") && !finalized && images.length > 0 ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Play className="size-3.5" aria-hidden="true" />}
              loading={starting}
              disabled={!aiReady || jobActive || unanalyzed === 0}
              title={
                !aiReady
                  ? describeAi(ai.data).detail
                  : jobActive
                    ? "Analysis in progress"
                    : unanalyzed === 0
                      ? "All images are analyzed; re-analyze from the AI panel"
                      : undefined
              }
              onClick={() => void startAnalysis("unanalyzed")}
            >
              {jobActive && job
                ? `Analyzing ${job.done}/${job.total}`
                : `Run AI analysis${unanalyzed && unanalyzed < images.length ? ` (${unanalyzed})` : ""}`}
            </Button>
          ) : null}
          <Link
            to="/exams/$examId/report"
            params={{ examId }}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <FileText className="size-3.5" aria-hidden="true" />
            Report
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-2 pb-2 pl-2 pr-2">
        {/* The reading stage: filmstrip and viewer on one dark surface. */}
        <div className="viewer-surface flex min-w-0 flex-1 overflow-hidden rounded-[14px] bg-viewer-bg shadow-[0_0_0_0.5px_rgb(0_0_0/0.5),0_10px_30px_-12px_rgb(16_18_27/0.5)]">
        {/* Series strip */}
        <aside className="no-print flex w-[132px] shrink-0 flex-col bg-viewer-panel 2xl:w-[148px]">
          <div className="flex h-12 shrink-0 items-center justify-between px-3">
            <span className="text-xs font-semibold text-viewer-ink">Images</span>
            <span className="tabular font-mono text-2xs text-viewer-muted">
              {selectedIndex >= 0 ? `${selectedIndex + 1}/` : ""}
              {images.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {images.length > 0 ? (
              <ImageStrip
                images={images}
                selectedId={selected?.id ?? null}
                onSelect={setSelectedId}
                onRemove={setRemoving}
                canRemove={canImport && !jobActive}
                job={jobActive ? job : null}
              />
            ) : (
              <p className="p-3 text-xs text-viewer-muted">
                No images imported.
              </p>
            )}
          </div>
        </aside>

        {/* Viewer */}
        <section
          aria-label="Image viewer"
          className="viewer-surface relative flex min-w-0 flex-1 flex-col bg-viewer-bg"
        >
          {viewerProps && selected ? (
            <>
              <ViewerToolbar
                tool={tool}
                onToolChange={setTool}
                onZoom={(factor) =>
                  setView((current) => ({
                    ...current,
                    zoom: Math.min(16, Math.max(0.25, current.zoom * factor)),
                  }))
                }
                onFit={() => setView(FITTED)}
                onReset={resetView}
                invert={invert}
                onInvert={() => setInvert((current) => !current)}
                presets={windowPresets(selected)}
                onPreset={setWindowLevel}
                overlay={overlay}
                onOverlayChange={setOverlay}
                overlayAvailable={overlayAvailable}
                compare={compare && overlayAvailable}
                onCompare={() =>
                  setCompare((current) => {
                    const next = !current;
                    if (next) {
                      setOverlay((o) =>
                        o.visible ? o : { ...o, visible: true },
                      );
                    }
                    return next;
                  })
                }
                onExport={() => void exportImage()}
                exportBusy={exporting}
                canExport={can("report_export")}
              />
              <div
                className={cn(
                  "grid min-h-0 flex-1",
                  compare && overlayAvailable
                    ? "grid-cols-2 gap-px bg-viewer-line"
                    : "grid-cols-1",
                )}
              >
                {compare && overlayAvailable ? (
                  <div className="relative min-h-0">
                    <ImageViewer
                      {...viewerProps}
                      suppressOverlay
                      label="Original image"
                    />
                    <span className="material-viewer pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-2xs font-semibold text-viewer-ink">
                      Original
                    </span>
                  </div>
                ) : null}
                <div className="relative min-h-0">
                  <ImageViewer ref={viewerRef} {...viewerProps} />
                  {compare && overlayAvailable ? (
                    <span className="material-viewer pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-2xs font-semibold text-viewer-ink">
                      {overlay.visible ? "AI heatmap" : "AI heatmap (off)"}
                    </span>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md rounded-2xl border border-dashed border-white/15 px-8 py-10 text-center">
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-white/[0.07]">
                  <Upload
                    className="size-6 text-viewer-muted"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="text-md font-semibold text-viewer-ink">
                  No images in this examination
                </h2>
                <p className="mt-1 text-sm text-viewer-muted">
                  {canImport
                    ? "Drop DICOM, PNG or JPEG files or a folder anywhere in this window, or choose them below. Images are copied into the workstation's secure image store."
                    : finalized
                      ? "This examination was finalized without images."
                      : "A technologist or radiologist imports the images for this examination."}
                </p>
                {canImport ? (
                  <div className="mt-5 flex justify-center gap-2">
                    <Button
                      variant="primary"
                      loading={importing}
                      icon={<ImagePlus className="size-4" aria-hidden="true" />}
                      onClick={() =>
                        void runImport(() => api.importDialog(examId, false))
                      }
                    >
                      Import files
                    </Button>
                    <Button
                      variant="viewer"
                      disabled={importing}
                      icon={
                        <FolderOpen className="size-4" aria-hidden="true" />
                      }
                      onClick={() =>
                        void runImport(() => api.importDialog(examId, true))
                      }
                    >
                      Import folder
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {dropActive ? (
            <div className="pointer-events-none absolute inset-3 z-10 flex animate-fade-in items-center justify-center rounded-xl border-2 border-dashed border-viewer-accent bg-viewer-accent/[0.12]">
              <p className="material-viewer rounded-full px-4 py-2 text-sm font-semibold text-viewer-ink">
                Drop to import into {summary.accessionNumber}
              </p>
            </div>
          ) : null}
          {importing ? (
            <div
              className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-viewer-line"
              role="progressbar"
              aria-label="Importing images"
            >
              <div className="h-full w-2/5 animate-indeterminate bg-viewer-accent" />
            </div>
          ) : null}
        </section>
        </div>

        {/* Findings, review, metadata */}
        <aside className="paper no-print flex w-[340px] shrink-0 flex-col overflow-hidden rounded-[14px] 2xl:w-[372px]">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as Tab)}
            variant="segment"
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 border-b border-line/80 p-2">
              <TabsList
                aria-label="Examination panels"
                className="grid w-full grid-cols-3"
              >
                <TabsTrigger value="ai" className="w-full text-[13px]">
                  AI findings
                </TabsTrigger>
                <TabsTrigger value="review" className="w-full text-[13px]">
                  Review
                  {detail.review?.status === "draft" ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="ml-1.5 inline-block size-1.5 rounded-full bg-warning"
                      />
                      <span className="sr-only"> (draft)</span>
                    </>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="info" className="w-full text-[13px]">
                  Image info
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              value="ai"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-none"
            >
              <AiFindingsPanel
                detail={detail}
                image={selected}
                job={job}
                jobActive={jobActive}
                onAnalyze={(scope) => void startAnalysis(scope)}
                onCancel={() => void cancelAnalysis()}
                starting={starting}
              />
            </TabsContent>
            <TabsContent
              value="review"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-none"
            >
              <ReviewPanel detail={detail} />
            </TabsContent>
            <TabsContent
              value="info"
              className="mt-0 min-h-0 flex-1 overflow-y-auto rounded-none"
            >
              {selected ? (
                <ImageInfoPanel image={selected} />
              ) : (
                <p className="p-4 text-sm text-ink-muted">
                  Import images to see their attributes.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <ImportResultDialog
        summary={importResult}
        onClose={() => setImportResult(null)}
      />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => void removeImage()}
        loading={removeBusy}
        tone="danger"
        title="Remove image?"
        confirmLabel="Remove image"
        description={
          removing
            ? `Image ${removing.seq} (${removing.originalName}) and its AI results will be removed from this examination. The removal is recorded in the audit log.`
            : undefined
        }
      />
      <ExamFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        patient={patient}
        exam={summary}
        onSaved={() => toast.success("Examination updated")}
      />
    </div>
  );
}

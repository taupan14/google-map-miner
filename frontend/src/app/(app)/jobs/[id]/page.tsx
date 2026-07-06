"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getJob,
  getJobLogs,
  getJobPlaces,
  getJobMetrics,
  cancelJob,
  getExportUrl,
} from "@/lib/api";
import { Job, JobLog, Place, JobMetrics } from "@/types";
import {
  formatDate,
  formatRelative,
  buildLocationString,
  getProgress,
} from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import LiveConsole from "@/components/jobs/LiveConsole";
import LiveResultTable from "@/components/jobs/LiveResultTable";
import JobAnalytics from "@/components/jobs/JobAnalytics";
import { toast } from "sonner";
import {
  Download,
  XCircle,
  MapPin,
  Calendar,
  Hash,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [metrics, setMetrics] = useState<JobMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const isRunning = job?.status === "running" || job?.status === "pending";

  // ── Initial load ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [jobData, logsData, placesData] = await Promise.all([
        getJob(id),
        getJobLogs(id),
        getJobPlaces(id, { limit: 100 }),
      ]);
      setJob(jobData);
      setLogs(logsData.logs);
      setPlaces(placesData.places);

      // Load metrics if already completed on first load
      if (jobData.status === "completed") {
        const m = await getJobMetrics(id).catch(() => null);
        setMetrics(m);
      }
    } catch (err: any) {
      toast.error("Failed to load job: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Realtime: job row updates (progress + status) ───────────
  useEffect(() => {
    const channel = supabase
      .channel(`job-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          const updated = payload.new as Job;

          // Merge update ke state — ini fix Problem 2 (progress %)
          setJob((prev) => (prev ? { ...prev, ...updated } : updated));

          // Jika baru saja completed — fetch metrics — ini fix Problem 3
          if (updated.status === "completed") {
            // Tunggu sebentar agar worker selesai write metrics ke DB
            await new Promise((r) => setTimeout(r, 2000));
            const m = await getJobMetrics(id).catch(() => null);
            setMetrics(m);
            toast.success(
              `Job completed! ${updated.total_scraped} places scraped.`,
            );
          }

          if (updated.status === "failed") {
            toast.error(
              `Job failed: ${updated.error_message || "Unknown error"}`,
            );
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Subscribed to job updates:", id);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // ── Fallback polling saat running (backup jika realtime miss) ──
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await getJob(id);
        setJob((prev) => {
          // Hanya update jika data lebih baru (scraped count lebih tinggi)
          if (!prev) return fresh;
          if (fresh.total_scraped >= prev.total_scraped) return fresh;
          return prev;
        });
      } catch (_) {}
    }, 5000); // poll tiap 5 detik sebagai backup

    return () => clearInterval(interval);
  }, [id, isRunning]);

  async function handleCancel() {
    if (!confirm("Cancel this job?")) return;
    setCancelling(true);
    try {
      const updated = await cancelJob(id);
      setJob(updated);
      toast.success("Job cancelled");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <RefreshCw
            size={24}
            className="text-text-muted animate-spin mx-auto"
          />
          <p className="text-text-muted text-sm">Loading job...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <p className="text-text-primary">Job not found</p>
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const progress = getProgress(job.total_found, job.total_scraped);

  return (
    <div className="p-6 overflow-auto">
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-text-muted hover:text-text-secondary text-sm transition-colors"
            >
              <ChevronLeft size={14} />
              Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-text-primary text-2xl font-semibold">
                {job.keyword}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-text-muted text-sm flex items-center gap-1.5">
              <MapPin size={12} />
              {buildLocationString(job) || "No location specified"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {job.status === "running" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger"
              >
                <XCircle size={14} />
                {cancelling ? "Cancelling..." : "Cancel"}
              </button>
            )}
            {job.status === "completed" && (
              <button
                onClick={() => window.open(getExportUrl(id), "_blank")}
                className="btn-primary"
              >
                <Download size={14} />
                Export XLSX
              </button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Job ID",
              value: id.slice(0, 8) + "...",
              icon: <Hash size={12} />,
            },
            {
              label: "Created",
              value: formatRelative(job.created_at),
              icon: <Calendar size={12} />,
            },
            {
              label: "Found",
              value: job.total_found.toLocaleString("id-ID"),
              icon: <MapPin size={12} />,
            },
            {
              label: "Scraped",
              value: job.total_scraped.toLocaleString("id-ID"),
              icon: <MapPin size={12} />,
            },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass-card p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                {icon} {label}
              </div>
              <div className="text-text-primary font-semibold text-lg tabular-nums">
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar — re-renders setiap kali job state update */}
        <div className="glass-card p-5">
          <ProgressBar
            value={progress}
            total={job.total_found}
            scraped={job.total_scraped}
          />
          {job.status === "running" && job.total_found === 0 && (
            <p className="text-text-muted text-xs mt-3 flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" />
              Collecting places from search results...
            </p>
          )}
        </div>

        {/* Error */}
        {job.error_message && (
          <div className="glass-card border border-danger/30 bg-danger/5 p-4">
            <p className="text-danger text-sm font-medium mb-1">Error</p>
            <p className="text-danger/80 text-sm font-mono">
              {job.error_message}
            </p>
          </div>
        )}

        {/* Live Console */}
        <LiveConsole jobId={id} initialLogs={logs} isRunning={isRunning} />

        {/* Live Result Table */}
        <LiveResultTable
          jobId={id}
          initialPlaces={places}
          isRunning={isRunning}
        />

        {/* Analytics — tampil setelah completed, dengan loading state */}
        {(job.status === "completed" || job.status === "failed") && (
          <div className="space-y-4">
            {metrics === null && job.status === "completed" ? (
              <div className="glass-card p-6 flex items-center gap-3 text-text-muted text-sm">
                <RefreshCw size={16} className="animate-spin" />
                Loading analytics...
              </div>
            ) : (
              <JobAnalytics metrics={metrics} />
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="glass-card p-4 flex flex-wrap gap-6 text-xs text-text-muted">
          <div>
            Started:{" "}
            <span className="text-text-secondary">
              {formatDate(job.started_at)}
            </span>
          </div>
          <div>
            Finished:{" "}
            <span className="text-text-secondary">
              {formatDate(job.finished_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

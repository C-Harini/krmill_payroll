"use strict";

// ============================================================
// services/attendanceRegenerateQueue.js
// ============================================================
// Manages background regeneration jobs.
// Each job runs in an isolated forked child process.
//
// Job lifecycle:
//   pending → running → done | failed
//
// Progress is reported in real time via the worker's onProgress
// callback and forwarded here as { type: "progress" } messages.
//
// History: last MAX_HISTORY completed jobs are kept in memory.
// ============================================================

const { fork } = require("child_process");
const path = require("path");
const crypto = require("crypto");

const WORKER_PATH = path.join(__dirname, "attendanceRegenerateWorker.js");
const MAX_HISTORY = 50;

const jobs = new Map();
const completedOrder = []; // tracks completed job IDs for eviction

class AttendanceRegenerateQueue {
  /**
   * Enqueue a new regeneration job.
   * Returns jobId immediately — caller polls via getJob().
   */
  enqueue({ companyId, startDate, endDate, employeeIds }) {
    const jobId = crypto.randomUUID();

    const job = {
      jobId,
      companyId,
      startDate,
      endDate,
      status: "pending",
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      // Progress keeps the most recent message + running counters
      progress: {
        message: "Queued — waiting to start",
        processed: 0,
        total: null,
        dateStr: null,
        dateIndex: null,
        totalDates: null,
      },
      summary: null,
      error: null,
    };

    jobs.set(jobId, job);
    this._spawn(jobId, { companyId, startDate, endDate, employeeIds });
    return jobId;
  }

  /** Retrieve job state by ID. Returns null if not found / evicted. */
  getJob(jobId) {
    return jobs.get(jobId) || null;
  }

  /** List all in-memory jobs (newest first). */
  listJobs() {
    return Array.from(jobs.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  // ── Internal ───────────────────────────────────────────────

  _spawn(jobId, payload) {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = "running";
    job.startedAt = new Date().toISOString();

    const worker = fork(WORKER_PATH, [], {
      silent: false, // worker stdout/stderr flows to parent
      // Pass DB connection config via environment so the worker
      // process can bootstrap models correctly
      env: { ...process.env },
    });

    // Send the job payload to the worker
    worker.send({ jobId, ...payload });

    // ── Handle messages from worker ──────────────────────────
    worker.on("message", (msg) => {
      const j = jobs.get(msg.jobId);
      if (!j) return; // job evicted or unknown

      switch (msg.type) {
        case "progress":
          j.progress = {
            message: msg.message,
            processed: msg.processed ?? j.progress.processed,
            total: msg.total ?? j.progress.total,
            dateStr: msg.dateStr ?? j.progress.dateStr,
            dateIndex: msg.dateIndex ?? j.progress.dateIndex,
            totalDates: msg.totalDates ?? j.progress.totalDates,
          };
          break;

        case "done":
          j.status = "done";
          j.finishedAt = new Date().toISOString();
          j.summary = msg.summary;
          j.progress = {
            ...j.progress,
            message: `Completed — ${msg.summary?.finalized ?? 0} finalized, ${msg.summary?.skipped ?? 0} skipped`,
          };
          this._archive(jobId);
          break;

        case "error":
          j.status = "failed";
          j.finishedAt = new Date().toISOString();
          j.error = msg.message;
          j.progress = {
            ...j.progress,
            message: `Failed: ${msg.message}`,
          };
          this._archive(jobId);
          break;

        default:
          console.warn(
            `[queue] Unknown message type "${msg.type}" from worker`,
          );
      }
    });

    // ── Worker process exits ─────────────────────────────────
    worker.on("exit", (code) => {
      const j = jobs.get(jobId);
      if (!j) return;
      if (j.status === "running") {
        // Worker died without sending done/error
        j.status = "failed";
        j.finishedAt = new Date().toISOString();
        j.error = `Worker exited unexpectedly with code ${code}`;
        j.progress.message = j.error;
        this._archive(jobId);
      }
    });

    // ── Worker process error (spawn failure etc.) ────────────
    worker.on("error", (err) => {
      const j = jobs.get(jobId);
      if (!j) return;
      j.status = "failed";
      j.finishedAt = new Date().toISOString();
      j.error = err.message;
      j.progress.message = `Spawn error: ${err.message}`;
      this._archive(jobId);
    });
  }

  _archive(jobId) {
    completedOrder.push(jobId);
    // Evict oldest completed job if history limit exceeded
    if (completedOrder.length > MAX_HISTORY) {
      const evict = completedOrder.shift();
      jobs.delete(evict);
    }
  }
}

module.exports = new AttendanceRegenerateQueue();

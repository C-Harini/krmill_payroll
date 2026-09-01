"use strict";

// ============================================================
// services/attendanceRegenerateWorker.js
// ============================================================
// Runs in a forked child process.
// Receives job payload via process.send() from the queue.
// Sends progress/done/error messages back to the parent.
//
// Progress messages are sent:
//   - Once per employee processed (via onProgress callback)
//   - At the start of each date batch
//   - On completion
// ============================================================

const { manualFinalize } = require("./attendenceCron");

process.on("message", async (job) => {
  const { jobId, companyId, startDate, endDate, employeeIds } = job;

  // Safety: ensure we can send messages back
  if (!process.send) {
    console.error("[worker] process.send not available — not a forked child?");
    process.exit(1);
  }

  const send = (msg) => {
    try {
      process.send(msg);
    } catch (e) {
      // Parent may have died — just log and continue
      console.error("[worker] Failed to send message:", e.message);
    }
  };

  try {
    // ── Compute total date count for progress reporting ─────
    const moment = require("moment");
    const start = moment(startDate);
    const end = moment(endDate || startDate);
    const totalDates = end.diff(start, "days") + 1;

    send({
      type: "progress",
      jobId,
      message: `Starting: ${startDate} → ${endDate || startDate} (${totalDates} day${totalDates !== 1 ? "s" : ""})`,
      processed: 0,
      total: null,
    });

    // ── Run finalization with per-employee progress callback ─
    const results = await manualFinalize({
      companyId,
      startDate,
      endDate,
      employeeIds,
      onProgress: ({
        dateStr,
        dateIndex,
        totalDates,
        processed,
        total,
        name,
      }) => {
        // Throttle: send every employee (small batches) or every 5 (large batches)
        const shouldSend =
          total <= 20 || processed % 5 === 0 || processed === total;
        if (!shouldSend) return;

        send({
          type: "progress",
          jobId,
          message: `[${dateStr}] (${dateIndex}/${totalDates} dates) Processing ${name} — ${processed}/${total} employees`,
          processed,
          total,
          dateStr,
          dateIndex,
          totalDates,
        });
      },
    });

    send({
      type: "done",
      jobId,
      summary: {
        processed: results.processed,
        finalized: results.finalized,
        skipped: results.skipped,
        errors: results.errors,
      },
    });

    process.exit(0);
  } catch (err) {
    send({ type: "error", jobId, message: err.message });
    process.exit(1);
  }
});

// Catch unhandled rejections so the worker doesn't silently die
process.on("unhandledRejection", (reason) => {
  console.error("[worker] Unhandled rejection:", reason);
  try {
    process.send({ type: "error", jobId: "unknown", message: String(reason) });
  } catch (_) { }
  process.exit(1);
});

// This is a simple in-memory store. In a production app, you'd use Redis or a database table.
const jobStatusStore = {};

const addJob = (jobId) => {
    jobStatusStore[jobId] = { status: 'processing', progress: 0, current: 'Starting...', total: 0, error: null };
};

const updateJob = (jobId, progress, current) => {
    if (jobStatusStore[jobId]) {
        jobStatusStore[jobId].progress = progress;
        jobStatusStore[jobId].current = current;
    }
};

const completeJob = (jobId, success = true, error = null) => {
    if (jobStatusStore[jobId]) {
        jobStatusStore[jobId].status = success ? 'completed' : 'failed';
        jobStatusStore[jobId].progress = 100;
        jobStatusStore[jobId].error = error;
    }
};

const getJobStatus = (jobId) => jobStatusStore[jobId];

module.exports = { addJob, updateJob, completeJob, getJobStatus };
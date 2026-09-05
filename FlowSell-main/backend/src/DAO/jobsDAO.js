import { JobModel } from "../models/jobModel.js";

export const jobsDAO = {
  upsert: (filter, data) =>
    JobModel.findOneAndUpdate(filter, data, { upsert: true, new: true }),

  findOne: (filter = {}) =>
    JobModel.findOne(filter).lean(),

  updateStatusMessagesMassive: (jobId, status, userId = null) =>
    JobModel.findOneAndUpdate(
      { jobId, ...(userId ? { userId: String(userId) } : {}) },
      { statusMessagesMassive: status },
      { new: true }
  ),

  updateJobStatus: (jobId, status, userId) =>
    JobModel.findOneAndUpdate(
      { jobId, userId: String(userId) },
      { status, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) },
      { new: true }
    ),
};

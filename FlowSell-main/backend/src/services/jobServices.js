import { jobsDAO } from "../DAO/jobsDAO.js";

export async function saveBuyersResults(userId, jobId, buyers) {
  // jobsDAO.upsert() inserta o actualiza el registro del job con su resultado
  return jobsDAO.upsert(
    { jobId },
    { userId, jobId, status: "COMPLETED", buyers, completedAt: new Date() }
  );
}
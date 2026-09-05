import { JobModel } from "../models/jobModel.js";
import { randomUUID } from 'node:crypto';
import { massiveMessagesQueue, trackingQueue } from "../utils/queue.js";
import { trackingServices } from '../services/trackingServices.js';
import { templatesServices } from '../services/templatesServices.js';

export async function getBuyers(req, res, next) {
  try {
    const { itemIds, startDate, endDate } = req.body;
    const sellerId = req.user.meliId;
    if (!sellerId) return res.status(400).json({ error: 'sellerId requerido' });
    if (!Array.isArray(itemIds) || !itemIds.length || !startDate || !endDate) {
      return res.status(400).json({ error: 'Seleccioná publicaciones y un rango de fechas válido.' });
    }
    const jobId = randomUUID();
    await JobModel.create({
      jobId,
      userId: String(req.user._id),
      status: 'PENDING',
      buyers: [],
      statusMessagesMassive: 'PENDING',
    });

    try {
      await trackingQueue.add(
        'trackBuyers',
        { userId: String(req.user._id), sellerId, itemIds, startDate, endDate },
        { jobId, removeOnComplete: 1000, removeOnFail: 1000 }
      );
    } catch (queueError) {
      await JobModel.updateOne({ jobId, userId: String(req.user._id) }, { status: 'FAILED' });
      throw queueError;
    }

    // Respondemos inmediatamente con el ID del job
    return res.status(202).json({
      message: "Job encolado",
      jobId
    });
  } catch (error) {
    console.error("error en get buyers:", error);
    next(error);
  }
}

export async function handleSendMessagesMassive(req, res, next) {
  const user = req.user;
  const userId = req.user._id
  const meliId = user.meliId

  try {
    const { templateIds, itemIds, jobId } = req.body;

    if (!Array.isArray(templateIds) || !templateIds.length || !Array.isArray(itemIds) || !itemIds.length || !jobId) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const ownedJob = await JobModel.findOne({ jobId, userId: String(userId) });
    if (!ownedJob) return res.status(404).json({ error: 'Campaña no encontrada' });
    if (ownedJob.status !== 'COMPLETED' || !ownedJob.buyers?.length) {
      return res.status(409).json({ error: 'La audiencia todavía no está lista para enviar.' });
    }
    if (['PROCESSING', 'COMPLETED'].includes(ownedJob.statusMessagesMassive)) {
      return res.status(409).json({ error: 'Esta campaña ya fue iniciada.' });
    }
    await templatesServices.getTemplatesByIDs(templateIds, userId);

    const claimedJob = await JobModel.findOneAndUpdate(
      {
        _id: ownedJob._id,
        statusMessagesMassive: { $in: ['PENDING', 'FAILED', null] },
      },
      { statusMessagesMassive: 'PROCESSING' },
      { new: true }
    );
    if (!claimedJob) return res.status(409).json({ error: 'Esta campaña ya fue iniciada.' });

    try {
      await massiveMessagesQueue.add("send-massive", {
        templateIds,
        itemIds,
        buyers: ownedJob.buyers,
        userId: String(userId),
        meliId,
        jobId
      });
    } catch (queueError) {
      await trackingServices.setStatusMessagesMassive(jobId, 'FAILED', String(userId)).catch(() => null);
      throw queueError;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getJobStatus(req, res, next) {
  try {
    const job = await JobModel.findOne({ jobId: req.params.jobId, userId: String(req.user._id) });
    if (!job) return res.status(404).json({ error: "Job no encontrado" });
    return res.json({
      jobId: job.jobId,
      status: job.status,
      buyers: job.buyers || [],
      statusMessagesMassive: job.statusMessagesMassive,
      progress: job.progress || null,
    });
  } catch (err) {
    next(err);
  }
}

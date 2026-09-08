import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  jobId: { type: String, required: true, unique: true },
  status: { type: String, enum: ["PENDING", "IN_PROGRESS", "PROCESSING", "COMPLETED", "FAILED"], required: true },
  buyers: [
    {
      buyerId: { type: String, required: true },
      nickname: { type: String },
      order_id: { type: String, required: true },
    }
  ],
  statusMessagesMassive: { type: String, enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"], default: "PENDING" },
  progress: {
    offset: Number,
    totalEstimate: Number,
    processedSoFar: Number,
    lastBatchId: String,
    percent: Number,
    updatedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  itemIds: [String],
  from: String,
  to: String,
  templateIds: [String],
  sent: { type:Number, default:0 },
  failed: { type:Number, default:0 },
  errorCode: String,
  expiresAt: {type:Date,default:()=>new Date(Date.now()+90*86400000)},
});
JobSchema.index({expiresAt:1},{expireAfterSeconds:0});

export const JobModel = mongoose.model("Job", JobSchema);

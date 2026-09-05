import { Schema, Types, model } from 'mongoose'

const templateSchema = new Schema({
  name: { type: String, required: true, trim: true, maxLength: 70 },
  content: { type: String, required: true, maxLength: 350 },
  assignedPublications: [{ type: String }],
  attachments: [{ type: String , default: []}],
  owner: { type: Types.ObjectId, ref: 'User', required: true }, 
},{
  strict: 'throw',
  versionKey: false,
  timestamps: true,
})

export const Template = model('Template', templateSchema);

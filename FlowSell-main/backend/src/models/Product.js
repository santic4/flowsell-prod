import { Schema, Types, model } from 'mongoose';

const productSchema = new Schema({
  id: { type: String, required: true },
  owner: { type: Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  site_id: { type: String }, 
  templates: [
    {
      templateId: { type: Schema.Types.ObjectId, ref: "Template" },
      name: { type: String },
    },
  ],
  variations: {
    type: [
      {
        id: { type: String, required: true },
        name: { type: String },
        templates: [
          {
            templateId: { type: Schema.Types.ObjectId, ref: "Template" },
            name: { type: String },
          },
        ],
      },
    ],
    default: [],
  },  
  secondMessages: [
    {
      templateId: { type: Schema.Types.ObjectId, ref: "Template" },
      name: { type: String },
    },
  ],
  secondMessageDelay: { type: Number, default: 24 },
  enabled: { type:Boolean, default:true },
  markDelivered: { type:Boolean, default:false },
}, { timestamps:true });
productSchema.index({ owner:1, id:1 }, { unique:true });

export const Product = model('Product', productSchema);

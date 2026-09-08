import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  meliId:       { type: String, unique: true, required: true },
  email:        String,
  nickname:     String,
  picture:      { type: String, required: false }, 
  accessToken:  { type: String, select: false },
  refreshToken: { type: String, select: false },
  expiresAt:    Date,
  lastUpdated:  Date,
  expiresIn:    Number,
  plan: { type: String, enum:['free','premium','plus'], default:'free' },
  planExpiresAt: Date,
  status: { type:String, enum:['active','disconnected','deleting'], default:'active' },
  sessionVersion: { type:Number, default:0 },
  legal: { privacyVersion:String, termsVersion:String, acceptedAt:Date },
  deletedRequestedAt: Date,
}, { timestamps: true });

export default mongoose.model('User', UserSchema);

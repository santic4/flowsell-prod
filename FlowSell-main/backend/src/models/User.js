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
}, { timestamps: true });

export default mongoose.model('User', UserSchema);

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    role: { type: String, enum: ['Farmer', 'Admin'], default: 'Farmer' },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
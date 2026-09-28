import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    password: { type: String, required: true },
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    role: { type: String, enum: ['Farmer', 'Admin'], default: 'Farmer' },
    language: { type: String, enum: ['en', 'hi', 'mr'], default: 'en' },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
import mongoose from 'mongoose';

const FarmerHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['disease', 'crop', 'market', 'chat'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    inputData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resultData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.models.FarmerHistory ||
  mongoose.model('FarmerHistory', FarmerHistorySchema);
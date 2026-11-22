import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'video'],
      default: 'text',
    },
    background: { type: String, default: '#3357FF' },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: true,
    },
  },
  { timestamps: true }
);

storySchema.index({ author: 1, createdAt: -1 });

const Story = mongoose.model('Story', storySchema);
export default Story;

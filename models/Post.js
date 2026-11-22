import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  content: { type: String },
  images: [{ type: String }],
  video: { type: String },
  mediaType: { 
    type: String, 
    enum: ['image', 'video', 'none'], 
    default: 'none' 
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true 
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Updated comments schema
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
    // Mongoose gives _id.
  }]
}, { timestamps: true });

// Virtuals for likes
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

postSchema.set('toJSON', { virtuals: true });

const Post = mongoose.model('Post', postSchema);
export default Post;
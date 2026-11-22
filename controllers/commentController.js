import Comment from '../models/Comment.js';

// Add a comment
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text } = req.body;

    const newComment = new Comment({
      postId,
      userId: req.user.id,
      text
    });

    await newComment.save();

    // POPULATE: Fetch the newly saved comment with user details 
    // so the frontend receives the full object immediately
    const populatedComment = await Comment.findById(newComment._id)
      .populate('userId', 'username fullName profilePic');

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Backend addComment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get comments for a post
export const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('userId', 'username fullName profilePic')
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    console.error("Backend getComments error:", error);
    res.status(500).json({ message: error.message });
  }
};
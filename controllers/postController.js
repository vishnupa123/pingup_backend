import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    let imageUrls = [];
    let videoUrl;
    let mediaType = 'none';

    const files = [];
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      if (Array.isArray(req.files.images)) files.push(...req.files.images);
      if (Array.isArray(req.files.video)) files.push(...req.files.video);
    }

    if (files.length > 0) {
      files.forEach((file) => {
        const url = file.path || file.secure_url || file.url || '';
        if (file.mimetype?.startsWith('video/')) {
          if (!videoUrl) videoUrl = url;
        } else {
          imageUrls.push(url);
        }
      });
      mediaType = videoUrl ? 'video' : (imageUrls.length > 0 ? 'image' : 'none');
    }

    const hasText = content && content.trim().length > 0;
    const hasMedia = imageUrls.length > 0 || Boolean(videoUrl);

    if (!hasText && !hasMedia) {
      return res.status(400).json({ message: 'Post must contain text or media.' });
    }

    const newPost = await Post.create({
      content: content?.trim(),
      images: imageUrls,
      video: videoUrl,
      mediaType,
      author: req.user.id,
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error('createPost error', error);
    res.status(500).json({ message: error.message, stack: error.stack });
  }
};

// --- READ (Feed) ---
export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePic');

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
      const comments = await Comment.find({ postId: post._id })
        .populate('userId', 'username fullName profilePic');
      return {
        ...post.toObject(),
        likeCount: post.likes.length,
        isLiked: req.user ? post.likes.some((id) => id.toString() === String(req.user.id)) : false,
        comments: comments
      };
    }));

    res.status(200).json(postsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- READ (Single Post + Comments) ---
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username fullName profilePic');

    if (!post) return res.status(404).json({ message: "Post not found" });

    const comments = await Comment.find({ postId: req.params.id })
      .populate('userId', 'username fullName profilePic')
      .sort({ createdAt: -1 });

    res.status(200).json({
      ...post.toObject(),
      likeCount: post.likes.length,
      isLiked: req.user ? post.likes.some((id) => id.toString() === String(req.user.id)) : false,
      comments: comments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- READ (Posts by User) --- ✅ added
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePic');

    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await Comment.find({ postId: post._id })
        .populate('userId', 'username fullName profilePic');
      return {
        ...post.toObject(),
        likeCount: post.likes.length,
        isLiked: req.user ? post.likes.some((id) => id.toString() === String(req.user.id)) : false,
        comments: comments
      };
    }));

    res.status(200).json(postsWithComments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- UPDATE ---
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.content = req.body.content || post.content;
    const updatedPost = await post.save();
    res.status(200).json({ message: "Post updated", post: updatedPost });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- DELETE ---
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ postId: req.params.id });

    res.status(200).json({ message: "Post and associated comments deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// --- LIKE FUNCTIONALITY ---
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isLiked = post.likes.some((id) => id.toString() === String(req.user.id));

    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      likesCount: post.likes.length,
      liked: !isLiked
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
import Story from '../models/Story.js';
import User from '../models/User.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const createStory = async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    const background = req.body.background || '#3357FF';
    const file = req.file;

    let mediaUrl = '';
    let mediaType = 'text';

    if (file) {
      mediaUrl = file.path || file.secure_url || file.url || '';
      mediaType = file.mimetype?.startsWith('video/') ? 'video' : 'image';
    }

    if (!mediaUrl && !content) {
      return res.status(400).json({ message: 'Story must contain text or media.' });
    }

    const story = await Story.create({
      author: req.user.id,
      content: mediaUrl ? '' : content,
      mediaUrl,
      mediaType,
      background,
      expiresAt: new Date(Date.now() + DAY_MS),
    });

    const populated = await story.populate('author', 'username fullName profilePic');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeedStories = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('following');
    if (!me) return res.status(404).json({ message: 'User not found' });

    const followingIds = (me.following || []).map((id) => id.toString());
    // Show stories from people I follow (and my own for convenience)
    const authorIds = [...new Set([...followingIds, req.user.id])];

    const stories = await Story.find({
      author: { $in: authorIds },
      createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePic');

    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.author.toString() !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await story.deleteOne();
    res.status(200).json({ message: 'Story deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

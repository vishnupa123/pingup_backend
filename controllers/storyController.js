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
    let duration = 0;

    if (file) {
      mediaUrl = file.path || file.secure_url || file.url || '';
      mediaType = file.mimetype?.startsWith('video/') ? 'video' : 'image';

      // Cloudinary may provide duration for videos
      const rawDuration = Number(file.duration || req.body.duration || 0);
      if (Number.isFinite(rawDuration) && rawDuration > 0) duration = rawDuration;

      if (mediaType === 'video' && duration > 30) {
        return res.status(400).json({ message: 'Video story must be 30 seconds or less.' });
      }
    }

    if (!file && !content) {
      return res.status(400).json({ message: 'Story must contain text, image, or video.' });
    }

    const story = await Story.create({
      author: req.user.id,
      mediaUrl,
      mediaType,
      content: mediaUrl ? '' : content,
      background: mediaUrl ? '#3357FF' : background,
      duration,
      expiresAt: new Date(Date.now() + DAY_MS),
    });

    const populated = await story.populate('author', 'username fullName profilePic');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStoryFeed = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('following followers');
    if (!me) return res.status(404).json({ message: 'User not found' });

    // Show stories from people I follow and people who follow me
    const ids = new Set();
    (me.following || []).forEach((id) => ids.add(id.toString()));
    (me.followers || []).forEach((id) => ids.add(id.toString()));
    ids.delete(String(req.user.id));

    const stories = await Story.find({
      author: { $in: [...ids] },
      createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username fullName profilePic');

    res.status(200).json(stories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyStories = async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.user.id,
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

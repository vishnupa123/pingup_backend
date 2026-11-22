import Notification from '../models/Notification.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'username fullName profilePic')
      .populate('post', 'content images video mediaType');
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const n = await Notification.findOne({ _id: req.params.id, recipient: req.user.id });
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    n.read = true;
    await n.save();
    res.status(200).json(n);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

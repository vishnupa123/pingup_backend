import Message from '../models/Message.js';
import User from '../models/User.js';
import { encryptMessage } from '../utils/messageCrypto.js';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

const cleanupExpiredMessages = () =>
  Message.deleteMany({ expiresAt: { $lte: new Date() } });

const markConversationSeen = async (io, viewerId, senderId) => {
  if (!viewerId || !senderId) return null;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_DAYS_MS);

  const result = await Message.updateMany(
    {
      receiver: viewerId,
      sender: senderId,
      $or: [{ seenAt: null }, { seenAt: { $exists: false } }],
    },
    { $set: { seenAt: now, expiresAt } }
  );

  if (result.modifiedCount > 0 && io) {
    // Notify the sender so their chat can show "Seen".
    io.to(String(senderId)).emit('messages_seen', {
      conversationWith: String(viewerId),
      seenAt: now,
      expiresAt,
    });
  }

  return { updated: result.modifiedCount, seenAt: now, expiresAt };
};

// get message(GET)
export const getMessages = async (req, res) => {
  try {
    let { userId, otherUserId, id } = req.params;
    const loggedInUserId = req.user.id || req.user._id;

    if (!otherUserId) {
      userId = loggedInUserId;
      otherUserId = id;
    }

    if (!userId || !otherUserId) {
      return res.status(400).json({ message: 'Missing user IDs in request.' });
    }

    if (
      String(loggedInUserId) !== String(userId) &&
      String(loggedInUserId) !== String(otherUserId)
    ) {
      return res.status(403).json({ message: 'Not allowed to view this conversation.' });
    }

    await cleanupExpiredMessages();

    // Listing a conversation must NOT mark it as seen. Otherwise simply loading
    // the inbox starts the 2-day expiry timer and old messages disappear even
    // though the receiver never opened the chat. Seen is set only by the
    // explicit /api/messages/seen/:otherUserId call from the chat screen.
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// create new mesg (POST)
export const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, message } = req.body;
    const loggedInUserId = req.user.id || req.user._id;

    if (String(sender) !== String(loggedInUserId)) {
      return res.status(403).json({ message: 'Not allowed to send as another user.' });
    }

    const newMessage = new Message({
      sender,
      receiver,
      message: encryptMessage(message),
    });

    await newMessage.save();

    const io = req.app.get('io');
    if (io) io.to(String(receiver)).emit('receive_message', newMessage);
    if (io) io.to(String(sender)).emit('receive_message', newMessage);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Mark all messages from one user as seen and start their 2-day expiry.
export const markMessagesSeen = async (req, res) => {
  try {
    const loggedInUserId = req.user.id || req.user._id;
    const otherUserId = req.params.otherUserId || req.body.otherUserId;

    if (!otherUserId) {
      return res.status(400).json({ message: 'Missing conversation user ID.' });
    }

    await cleanupExpiredMessages();

    const result = await markConversationSeen(
      req.app.get('io'),
      loggedInUserId,
      otherUserId
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error marking messages seen:', error.message);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// get recent chat users list
export const getMyChatList = async (req, res) => {
  try {
    const loggedInUserId = req.user.id || req.user._id;

    await cleanupExpiredMessages();

    const messages = await Message.find({
      $or: [
        { sender: loggedInUserId },
        { receiver: loggedInUserId }
      ]
    }).sort({ createdAt: -1 });

    const userMap = new Map();
    messages.forEach((msg) => {
      const chatPartnerId = msg.sender.toString() === loggedInUserId.toString()
        ? msg.receiver.toString()
        : msg.sender.toString();

      if (!userMap.has(chatPartnerId)) {
        userMap.set(chatPartnerId, msg.createdAt);
      }
    });

    const userIds = Array.from(userMap.keys());
    const users = await User.find({ _id: { $in: userIds } }).select("-password");
    const sortedUsers = userIds
      .map((id) => users.find((user) => user._id.toString() === id))
      .filter(Boolean);

    res.status(200).json({
      chatPartnerIds: userIds,
      users: sortedUsers,
    });
  } catch (error) {
    console.error("Error in getMyChatList:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

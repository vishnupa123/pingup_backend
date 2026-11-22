import Message from '../models/Message.js';
import User from '../models/User.js'; // User മോഡൽ ഇവിടെ ഇമ്പോർട്ട് ചെയ്യുക

// get message(GET)
export const getMessages = async (req, res) => {
  try {
    let { userId, otherUserId, id } = req.params;

    if (!otherUserId) {
      const loggedInUserId = req.user.id || req.user._id;
      userId = loggedInUserId;
      otherUserId = id;
    }

    if (!userId || !otherUserId) {
      return res.status(400).json({ message: 'Missing user IDs in request.' });
    }

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

    const newMessage = new Message({
      sender,
      receiver,
      message,
    });

    await newMessage.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// get recent chat users list
export const getMyChatList = async (req, res) => {
  try {
    const loggedInUserId = req.user.id || req.user._id;

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
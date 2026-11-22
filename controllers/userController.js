import User from '../models/User.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Story from '../models/Story.js';
import Message from '../models/Message.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    const posts = await Post.find({ author: req.user.id }).populate("author", "username profilePic");
    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await Comment.find({ postId: post._id }).populate("userId", "username profilePic");
      return { ...post.toObject(), comments };
    }));

    res.status(200).json({ user, posts: postsWithComments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    const posts = await Post.find({ author: id }).populate("author", "username profilePic");
    const postsWithComments = await Promise.all(posts.map(async (post) => {
      const comments = await Comment.find({ postId: post._id }).populate("userId", "username profilePic");
      return { ...post.toObject(), comments };
    }));

    res.status(200).json({ user, posts: postsWithComments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};






export const updateProfile = async (req, res) => {
  try {
    const { fullName, username, bio } = req.body;
    const profilePic = req.files?.profilePic ? req.files.profilePic[0].path : undefined;
    const cover_photo = req.files?.cover_photo ? req.files.cover_photo[0].path : undefined;

    const updateFields = {
      ...(fullName && { fullName }),
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
      ...(profilePic && { profilePic }),
      ...(cover_photo && { cover_photo }),
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};












export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    if (id === currentUserId) return res.status(400).json({ message: "You cannot follow yourself" });
    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);
    if (!userToFollow || !currentUser) return res.status(404).json({ message: "User not found" });
    const isFollowing = currentUser.following.includes(id);
    if (isFollowing) {
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: id } });
      await User.findByIdAndUpdate(id, { $pull: { followers: currentUserId } });
      res.status(200).json({ message: "User unfollowed" });
    } else {
      await User.findByIdAndUpdate(currentUserId, { $push: { following: id } });
      await User.findByIdAndUpdate(id, { $push: { followers: currentUserId } });
      res.status(200).json({ message: "User followed" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};





export const searchUser = async (req, res) => {
  try {
    const { query } = req.query; //

    if (!query) {
      return res.status(400).json({ message: "Please provide a search query" });
    }


    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error searching users", error: error.message });
  }
};







export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Posts created by user
    const userPosts = await Post.find({ author: userId }).select('_id');
    const userPostIds = userPosts.map((p) => p._id);

    await Comment.deleteMany({ $or: [{ userId }, { postId: { $in: userPostIds } }] });
    await Post.deleteMany({ author: userId });

    // Remove user's likes and embedded comments from other posts
    await Post.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await Post.updateMany({ 'comments.user': userId }, { $pull: { comments: { user: userId } } });

    // Stories and messages
    await Story.deleteMany({ author: userId });
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });

    // Remove user from followers/following of others
    await User.updateMany({ followers: userId }, { $pull: { followers: userId } });
    await User.updateMany({ following: userId }, { $pull: { following: userId } });

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Account and all associated data deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting profile", error: error.message });
  }
};







export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Check if all fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Compare current password with the one in database
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // Let the User model's pre('save') hook hash the password exactly once.
    // (Hashing here AND in the hook double-hashes it, so the new password would never work.)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error changing password", error: error.message });
  }
};
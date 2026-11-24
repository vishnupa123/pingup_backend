import mongoose from 'mongoose';
import { decryptMessage } from '../utils/messageCrypto.js';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Stored encrypted at rest; toJSON decrypts it for API and socket responses.
  message: { type: String, required: true },
  seenAt: { type: Date, default: null },
  // TTL deletes the document 48 hours after the receiver has seen it.
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

messageSchema.methods.toJSON = function () {
  const object = this.toObject();
  object.message = decryptMessage(object.message);
  return object;
};

const Message = mongoose.model('Message', messageSchema);
export default Message;

import mongoose from 'mongoose';
import dns from 'dns';

const connectDB = async (mongoURI) => {
  if (!mongoURI) {
    throw new Error('MONGODB_URI is required');
  }

  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  let host = 'the configured host';
  try {
    host = new URL(mongoURI).hostname;
  } catch {
    // Keep the generic message if the URI cannot be parsed.
  }

  try {
    await mongoose.connect(mongoURI, options);
    console.log('MongoDB connected');
    return;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    // ENOTFOUND/ENODATA on a mongodb+srv URI means the SRV record does not exist.
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      throw new Error(
        `MongoDB host "${host}" does not resolve in DNS. ` +
        'Copy a fresh connection string from Atlas (Database → Connect → Drivers) ' +
        'into server/.env as MONGODB_URI. Check that the cluster was not deleted, paused or renamed.'
      );
    }

    if (error.code === 'ECONNREFUSED' && String(error.message).includes('querySrv')) {
      console.warn('Local DNS refused the SRV query. Retrying with public DNS servers 8.8.8.8 and 1.1.1.1...');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
      try {
        await mongoose.connect(mongoURI, options);
        console.log('MongoDB connected after DNS fallback');
        return;
      } catch (retryError) {
        throw new Error(
          `Could not connect to MongoDB (${retryError.message}). ` +
          'Check MONGODB_URI in server/.env, your network, and the Atlas IP access list.'
        );
      }
    }

    throw error;
  }
};

export default connectDB;

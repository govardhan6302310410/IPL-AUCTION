import mongoose from 'mongoose';

const connectDB = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB Connection Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.warn('\n⚠️ Initial MongoDB connection attempts failed.');
        console.warn('👉 If using MongoDB Atlas, please ensure your current IP is whitelisted (Atlas -> Network Access -> Add IP -> 0.0.0.0/0).');
        console.warn('The server is still running and will reconnect once access is permitted.\n');
      }
    }
  }
};

export default connectDB;

// Connects to MongoDB using Mongoose.
// Keeping this in one small file makes it easy to explain: "this is the only
// place that knows how we talk to the database."
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pramaan';
  await mongoose.connect(uri);
  console.log('[PRAMAAN] MongoDB connected:', uri);
}

module.exports = connectDB;

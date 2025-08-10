
const logger = require('./Middleware/winstonLogger'); 


const mongoose = require('mongoose');


const MONGO_URI = process.env.MONGO_URI;


if (!MONGO_URI) {
  throw new Error('MONGO_URI environment variable is not set.');
}

const connect = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = connect;

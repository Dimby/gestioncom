const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://dbGestionCom:dbGestionCom1234!!!@cluster0.1epwov1.mongodb.net/';

mongoose.connect(MONGO_URI);

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

module.exports = mongoose;
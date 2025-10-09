const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema({
  userId: String,
  tool: String,          // brush, eraser, shape
  color: String,
  width: Number,
  points: [Number],      // Konva points array
  createdAt: { type: Date, default: Date.now }
});

const CanvasSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  owner: String,
  strokes: [StrokeSchema],   // store operations for replay
  snapshot: String,          // optional base64 snapshot
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CanvasSession', CanvasSessionSchema);

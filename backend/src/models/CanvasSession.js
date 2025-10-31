const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema({
  userId: String,
  tool: String,          // brush, eraser
  color: String,
  width: Number,
  points: [Number],      // Konva points array
  createdAt: { type: Date, default: Date.now }
});

const ShapeSchema = new mongoose.Schema({
  id: String,
  tool: String,          // rectangle, circle, line, arrow, text, triangle, star
  color: String,
  fillColor: String,
  width: Number,
  height: Number,
  x: Number,
  y: Number,
  endX: Number,
  endY: Number,
  text: String,          // for text shapes
  fontSize: Number,      // for text shapes
  createdAt: { type: Date, default: Date.now }
});

const CanvasSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  owner: String,
  strokes: [StrokeSchema],   // store brush/eraser strokes
  shapes: [ShapeSchema],     // store shape objects
  snapshot: String,          // optional base64 snapshot
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CanvasSession', CanvasSessionSchema);

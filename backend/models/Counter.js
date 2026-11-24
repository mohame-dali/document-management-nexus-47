const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    // Format : "<type>:<year>" (ex: "incoming:2026", "outgoing:2026")
    _id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    seq: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

counterSchema.index({ type: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);

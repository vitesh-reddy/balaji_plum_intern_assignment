const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  member_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  join_date: {
    type: Date,
    required: true,
  },
  policy_status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  dependents: [{
    name: String,
    relation: String,
    age: Number,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Member', memberSchema);

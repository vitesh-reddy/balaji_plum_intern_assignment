const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claim_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  member_id: {
    type: String,
    required: true,
    index: true,
  },
  member_name: {
    type: String,
    required: true,
  },
  treatment_date: {
    type: Date,
    required: true,
  },
  claim_amount: {
    type: Number,
    required: true,
  },
  hospital: {
    type: String,
    default: '',
  },
  cashless_request: {
    type: Boolean,
    default: false,
  },
  documents: [{
    document_type: {
      type: String,
      enum: ['prescription', 'bill', 'report', 'pharmacy_bill', 'json_input'],
    },
    file_path: String,
    original_name: String,
    extracted_data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  }],
  // Adjudication results
  decision: {
    type: String,
    enum: ['APPROVED', 'REJECTED', 'PARTIAL', 'MANUAL_REVIEW', 'PENDING'],
    default: 'PENDING',
  },
  approved_amount: {
    type: Number,
    default: 0,
  },
  rejection_reasons: [{
    type: String,
  }],
  rejected_items: [{
    type: String,
  }],
  confidence_score: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  next_steps: {
    type: String,
    default: '',
  },
  flags: [{
    type: String,
  }],
  deductions: {
    copay: { type: Number, default: 0 },
    network_discount: { type: Number, default: 0 },
    sub_limit_reduction: { type: Number, default: 0 },
  },
  adjudication_steps: [{
    step: String,
    step_name: String,
    passed: Boolean,
    details: String,
  }],
  cashless_approved: {
    type: Boolean,
    default: false,
  },
  previous_claims_same_day: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Auto-generate claim_id before validation
claimSchema.pre('validate', async function(next) {
  if (!this.claim_id) {
    const count = await mongoose.model('Claim').countDocuments();
    this.claim_id = `CLM_${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Claim', claimSchema);

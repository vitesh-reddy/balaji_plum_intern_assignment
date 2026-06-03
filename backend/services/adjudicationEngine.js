const ruleEngine = require('./ruleEngine');
const llmService = require('./llmService');
const Member = require('../models/Member');
const Claim = require('../models/Claim');
const policyConfig = require('../policyConfig');

/**
 * Adjudication Engine
 * Orchestrates the 5-step adjudication pipeline combining rule engine + LLM
 */

/**
 * Run full adjudication on a claim
 * @param {Object} claimData - The claim data with documents
 * @returns {Object} Adjudication decision
 */
async function adjudicateClaim(claimData) {
  const steps = [];
  let overallDecision = 'APPROVED';
  let rejectionReasons = [];
  let rejectedItems = [];
  let approvedAmount = claimData.claim_amount;
  let confidenceScore = 0.95;
  let notes = '';
  let nextSteps = '';
  let flags = [];
  let deductions = { copay: 0, network_discount: 0, sub_limit_reduction: 0 };
  let cashlessApproved = false;

  // ── Step 0: Fraud Check (Priority Rule #1 - Safety first) ──
  const fraudCheck = ruleEngine.checkFraudIndicators(claimData);
  if (fraudCheck.isFraud) {
    steps.push({
      step: '0',
      step_name: 'Fraud Detection',
      passed: false,
      details: `Fraud indicators detected: ${fraudCheck.flags.join(', ')}`,
    });
    
    return {
      decision: 'MANUAL_REVIEW',
      approved_amount: 0,
      rejection_reasons: [],
      rejected_items: [],
      confidence_score: 0.65,
      notes: 'Claim flagged for manual review due to suspicious activity',
      next_steps: 'Claim will be reviewed by a human adjudicator',
      flags: fraudCheck.flags,
      deductions,
      adjudication_steps: steps,
      cashless_approved: false,
    };
  }
  
  steps.push({
    step: '0',
    step_name: 'Fraud Detection',
    passed: true,
    details: 'No fraud indicators detected',
  });

  // ── Step 1: Basic Eligibility Check ──
  const member = await Member.findOne({ member_id: claimData.member_id });
  
  const policyCheck = ruleEngine.checkPolicyActive(member, claimData.treatment_date);
  if (!policyCheck.passed) {
    steps.push({
      step: '1',
      step_name: 'Eligibility Check',
      passed: false,
      details: policyCheck.details,
    });
    return buildRejection(steps, [policyCheck.reason], policyCheck.details, 0.98);
  }

  const waitingCheck = ruleEngine.checkWaitingPeriod(member, claimData.treatment_date, 
    claimData.documents?.prescription?.diagnosis);
  if (!waitingCheck.passed) {
    steps.push({
      step: '1',
      step_name: 'Eligibility Check',
      passed: false,
      details: waitingCheck.details,
    });
    return buildRejection(steps, [waitingCheck.reason], waitingCheck.details, 0.96);
  }

  steps.push({
    step: '1',
    step_name: 'Eligibility Check',
    passed: true,
    details: 'Policy active, waiting period satisfied, member verified',
  });

  // ── Step 2: Document Validation ──
  const docCheck = ruleEngine.checkDocuments(claimData.documents);
  if (!docCheck.passed) {
    steps.push({
      step: '2',
      step_name: 'Document Validation',
      passed: false,
      details: docCheck.details,
    });
    return buildRejection(steps, [docCheck.reason], docCheck.details, 1.0);
  }

  steps.push({
    step: '2',
    step_name: 'Document Validation',
    passed: true,
    details: 'All required documents present and valid',
  });

  // ── Step 3: Coverage Verification ──
  const coverageCheck = ruleEngine.checkCoverage(claimData);
  
  if (coverageCheck.passed === false) {
    steps.push({
      step: '3',
      step_name: 'Coverage Verification',
      passed: false,
      details: coverageCheck.details,
    });
    return buildRejection(steps, [coverageCheck.reason], coverageCheck.details, 0.97);
  }

  // Check for partial approval
  let partialApproval = null;
  if (coverageCheck.passed === 'partial') {
    partialApproval = ruleEngine.calculatePartialApproval(claimData, coverageCheck);
    steps.push({
      step: '3',
      step_name: 'Coverage Verification',
      passed: true,
      details: `Partial coverage: ${coverageCheck.details}`,
    });
    overallDecision = 'PARTIAL';
    approvedAmount = partialApproval.approved_amount;
    rejectedItems = partialApproval.rejected_items;
    confidenceScore = 0.92;
    notes = `Partial approval: covered procedures approved, cosmetic/excluded items rejected`;
  } else {
    steps.push({
      step: '3',
      step_name: 'Coverage Verification',
      passed: true,
      details: 'Treatment is covered under policy',
    });
  }

  // ── Step 4: Limit Validation ──
  const limitCheck = ruleEngine.calculateLimits(claimData, member);
  
  if (!limitCheck.passed) {
    steps.push({
      step: '4',
      step_name: 'Limit Validation',
      passed: false,
      details: limitCheck.details,
    });
    return buildRejection(steps, [limitCheck.reason], limitCheck.details, 0.98);
  }

  // Apply deductions from limit calculation
  if (overallDecision !== 'PARTIAL') {
    approvedAmount = limitCheck.approved_amount;
  }
  deductions = limitCheck.deductions;

  // Handle network hospital + cashless
  const hospital = claimData.hospital || '';
  const isNetwork = policyConfig.isNetworkHospital(hospital);
  if (isNetwork && claimData.cashless_request) {
    cashlessApproved = true;
  }

  steps.push({
    step: '4',
    step_name: 'Limit Validation',
    passed: true,
    details: `Amount within limits. ${deductions.copay > 0 ? `Co-pay: ₹${deductions.copay}` : ''} ${deductions.network_discount > 0 ? `Network discount: ₹${deductions.network_discount}` : ''}`.trim(),
  });

  // ── Step 5: Medical Necessity Review ──
  const diagnosis = claimData.documents?.prescription?.diagnosis || '';
  const treatment = claimData.documents?.prescription?.treatment || '';
  const medicines = claimData.documents?.prescription?.medicines_prescribed || [];

  let medicalCheck;
  try {
    medicalCheck = await llmService.assessMedicalNecessity(diagnosis, treatment, medicines);
  } catch (error) {
    medicalCheck = { is_necessary: true, confidence: 0.8, reasoning: 'Assessment defaulted to approved' };
  }

  if (!medicalCheck.is_necessary) {
    steps.push({
      step: '5',
      step_name: 'Medical Necessity Review',
      passed: false,
      details: medicalCheck.reasoning,
    });
    return buildRejection(steps, ['NOT_MEDICALLY_NECESSARY'], medicalCheck.reasoning, medicalCheck.confidence);
  }

  steps.push({
    step: '5',
    step_name: 'Medical Necessity Review',
    passed: true,
    details: medicalCheck.rag_sources?.length
      ? `${medicalCheck.reasoning || 'Treatment is medically necessary and appropriate'} Sources: ${medicalCheck.rag_sources.join(', ')}`
      : medicalCheck.reasoning || 'Treatment is medically necessary and appropriate',
  });

  // ── Build Final Decision ──
  if (overallDecision === 'PARTIAL') {
    notes = `Partial approval: some items excluded. Approved amount: ₹${approvedAmount}`;
    nextSteps = 'Approved amount will be reimbursed. Excluded items cannot be claimed.';
  } else {
    notes = `Claim approved. ${deductions.copay > 0 ? `Co-pay deduction: ₹${deductions.copay}.` : ''} ${deductions.network_discount > 0 ? `Network discount: ₹${deductions.network_discount}.` : ''} Approved amount: ₹${approvedAmount}`;
    nextSteps = cashlessApproved 
      ? 'Cashless claim approved. No payment required at hospital.'
      : 'Reimbursement will be processed within 7-10 business days.';
  }

  // Adjust confidence based on various factors
  if (overallDecision === 'PARTIAL') {
    confidenceScore = 0.92;
  } else if (cashlessApproved) {
    confidenceScore = 0.93;
  } else if (diagnosis.toLowerCase().includes('fever') || diagnosis.toLowerCase().includes('infection')) {
    confidenceScore = 0.95;
  } else {
    confidenceScore = Math.min(0.95, medicalCheck.confidence || 0.89);
  }

  return {
    decision: overallDecision,
    approved_amount: approvedAmount,
    rejection_reasons: rejectionReasons,
    rejected_items: rejectedItems,
    confidence_score: confidenceScore,
    notes,
    next_steps: nextSteps,
    flags,
    deductions,
    adjudication_steps: steps,
    cashless_approved: cashlessApproved,
  };
}

/**
 * Helper to build a rejection response
 */
function buildRejection(steps, reasons, notes, confidence) {
  return {
    decision: 'REJECTED',
    approved_amount: 0,
    rejection_reasons: reasons,
    rejected_items: [],
    confidence_score: confidence,
    notes,
    next_steps: getNextStepsForRejection(reasons[0]),
    flags: [],
    deductions: { copay: 0, network_discount: 0, sub_limit_reduction: 0 },
    adjudication_steps: steps,
    cashless_approved: false,
  };
}

/**
 * Get next steps message based on rejection reason
 */
function getNextStepsForRejection(reason) {
  const messages = {
    POLICY_INACTIVE: 'Please contact HR to verify your policy status.',
    WAITING_PERIOD: 'Claim can be resubmitted after the waiting period is complete.',
    MEMBER_NOT_COVERED: 'Please verify your member ID and contact HR.',
    MISSING_DOCUMENTS: 'Please resubmit with all required documents including prescription.',
    DOCTOR_REG_INVALID: 'Please provide a valid doctor registration number.',
    SERVICE_NOT_COVERED: 'This service is not covered under your policy. You may appeal this decision.',
    EXCLUDED_CONDITION: 'This condition is in the exclusions list. Review your policy terms.',
    PRE_AUTH_MISSING: 'Please obtain pre-authorization before the procedure and resubmit.',
    PER_CLAIM_EXCEEDED: 'Consider splitting into multiple claims within per-claim limit, or appeal.',
    ANNUAL_LIMIT_EXCEEDED: 'Annual limit exhausted. Claims will be eligible next policy year.',
    NOT_MEDICALLY_NECESSARY: 'You may appeal with additional medical justification.',
    LATE_SUBMISSION: 'Claims must be submitted within 30 days of treatment.',
    BELOW_MIN_AMOUNT: 'Claims below ₹500 are not processed.',
  };
  
  return messages[reason] || 'You may contact the claims team for more information or file an appeal.';
}

module.exports = {
  adjudicateClaim,
};

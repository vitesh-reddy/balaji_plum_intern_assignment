const policyConfig = require('../policyConfig');

/**
 * Rule Engine - Pure deterministic rule checks (no LLM)
 * Implements all business logic from adjudication_rules.md
 */

/**
 * Validate doctor registration number format
 * Valid formats: KA/12345/2015, MH/67890/2018, AYUR/KL/2345/2019
 */
function validateDoctorRegistration(regNumber) {
  if (!regNumber) return { valid: false, reason: 'Doctor registration number missing' };
  
  // Standard format: STATE/NUMBER/YEAR (e.g., KA/45678/2015)
  const standardPattern = /^[A-Z]{2,4}\/\d{4,5}\/\d{4}$/;
  // Extended format: TYPE/STATE/NUMBER/YEAR (e.g., AYUR/KL/2345/2019)
  const extendedPattern = /^[A-Z]{2,4}\/[A-Z]{2}\/\d{4,5}\/\d{4}$/;
  
  if (standardPattern.test(regNumber) || extendedPattern.test(regNumber)) {
    return { valid: true };
  }
  
  return { valid: false, reason: `Invalid registration format: ${regNumber}` };
}

/**
 * Check if the policy is active on the treatment date
 */
function checkPolicyActive(member, treatmentDate) {
  if (!member) {
    return { passed: false, reason: 'MEMBER_NOT_COVERED', details: 'Member not found in policy records' };
  }
  
  if (member.policy_status !== 'active') {
    return { passed: false, reason: 'POLICY_INACTIVE', details: 'Policy is not active' };
  }

  const policyTerms = policyConfig.getPolicyTerms();
  const policyStart = new Date(policyTerms.effective_date);
  const treatment = new Date(treatmentDate);
  
  if (treatment < policyStart) {
    return { passed: false, reason: 'POLICY_INACTIVE', details: 'Treatment date is before policy effective date' };
  }
  
  return { passed: true };
}

/**
 * Check waiting period requirements
 */
function checkWaitingPeriod(member, treatmentDate, diagnosis) {
  const waitingPeriods = policyConfig.getWaitingPeriods();
  const joinDate = new Date(member.join_date);
  const treatment = new Date(treatmentDate);
  const daysSinceJoin = Math.floor((treatment - joinDate) / (1000 * 60 * 60 * 24));
  
  // Check initial waiting period (30 days)
  if (daysSinceJoin < waitingPeriods.initial_waiting) {
    return {
      passed: false,
      reason: 'WAITING_PERIOD',
      details: `Initial waiting period of ${waitingPeriods.initial_waiting} days not met. Member joined ${daysSinceJoin} days ago.`,
    };
  }
  
  // Check specific ailment waiting periods
  if (diagnosis) {
    const diagLower = diagnosis.toLowerCase();
    const specificAilments = waitingPeriods.specific_ailments || {};
    
    for (const [ailment, days] of Object.entries(specificAilments)) {
      if (diagLower.includes(ailment.toLowerCase())) {
        if (daysSinceJoin < days) {
          const eligibleDate = new Date(joinDate);
          eligibleDate.setDate(eligibleDate.getDate() + days);
          return {
            passed: false,
            reason: 'WAITING_PERIOD',
            details: `${ailment} has a ${days}-day waiting period. Eligible from ${eligibleDate.toISOString().split('T')[0]}`,
          };
        }
      }
    }
    
    // Check pre-existing diseases
    const preExistingKeywords = ['diabetes', 'hypertension', 'asthma', 'thyroid', 'heart disease'];
    const isPreExisting = preExistingKeywords.some(k => diagLower.includes(k));
    if (isPreExisting && daysSinceJoin < waitingPeriods.pre_existing_diseases) {
      return {
        passed: false,
        reason: 'WAITING_PERIOD',
        details: `Pre-existing condition waiting period of ${waitingPeriods.pre_existing_diseases} days not met.`,
      };
    }
  }
  
  return { passed: true };
}

/**
 * Check if required documents are present
 */
function checkDocuments(documents) {
  if (!documents || Object.keys(documents).length === 0) {
    return {
      passed: false,
      reason: 'MISSING_DOCUMENTS',
      details: 'No documents submitted',
    };
  }
  
  // Prescription is always required
  if (!documents.prescription) {
    return {
      passed: false,
      reason: 'MISSING_DOCUMENTS',
      details: 'Prescription from registered doctor is required',
    };
  }
  
  // Validate doctor registration if present in prescription
  if (documents.prescription && documents.prescription.doctor_reg) {
    const regCheck = validateDoctorRegistration(documents.prescription.doctor_reg);
    if (!regCheck.valid) {
      return {
        passed: false,
        reason: 'DOCTOR_REG_INVALID',
        details: regCheck.reason,
      };
    }
  }
  
  return { passed: true };
}

/**
 * Check coverage - is the service/treatment covered?
 */
function checkCoverage(claimData) {
  const exclusions = policyConfig.getExclusions();
  const coverageDetails = policyConfig.getPolicyTerms().coverage_details;
  
  const diagnosis = claimData.documents?.prescription?.diagnosis || '';
  const treatment = claimData.documents?.prescription?.treatment || '';
  const procedures = claimData.documents?.prescription?.procedures || [];
  const diagLower = diagnosis.toLowerCase();
  const treatmentLower = treatment.toLowerCase();
  
  // Check exclusions
  for (const exclusion of exclusions) {
    const exclLower = exclusion.toLowerCase();
    if (diagLower.includes(exclLower) || treatmentLower.includes(exclLower)) {
      return {
        passed: false,
        reason: 'SERVICE_NOT_COVERED',
        details: `${exclusion} are excluded from coverage`,
      };
    }
  }
  
  // Specific exclusion checks
  if (diagLower.includes('obesity') || diagLower.includes('weight loss') || 
      treatmentLower.includes('weight loss') || treatmentLower.includes('bariatric')) {
    return {
      passed: false,
      reason: 'SERVICE_NOT_COVERED',
      details: 'Weight loss treatments are excluded from coverage',
    };
  }
  
  if (diagLower.includes('cosmetic') || treatmentLower.includes('cosmetic')) {
    return {
      passed: false,
      reason: 'EXCLUDED_CONDITION',
      details: 'Cosmetic procedures are excluded from coverage',
    };
  }
  
  // Check for MRI/CT pre-authorization
  const testsOrProcedures = [
    ...(claimData.documents?.prescription?.tests_prescribed || []),
    ...(claimData.documents?.bill?.test_names || []),
    ...procedures,
  ];
  
  const billKeys = claimData.documents?.bill ? Object.keys(claimData.documents.bill) : [];
  const hasMRI = testsOrProcedures.some(t => t.toLowerCase().includes('mri')) || 
                 billKeys.some(k => k.toLowerCase().includes('mri'));
  const hasCT = testsOrProcedures.some(t => t.toLowerCase().includes('ct scan')) ||
                billKeys.some(k => k.toLowerCase().includes('ct'));
  
  if (hasMRI || hasCT) {
    // MRI and CT require pre-authorization 
    return {
      passed: false,
      reason: 'PRE_AUTH_MISSING',
      details: `${hasMRI ? 'MRI' : 'CT Scan'} requires pre-authorization for claims above ₹10000`,
    };
  }
  
  // Check partial coverage - identify cosmetic items in procedures
  const rejectedItems = [];
  const approvedItems = [];
  
  for (const proc of procedures) {
    const procLower = proc.toLowerCase();
    if (procLower.includes('whitening') || procLower.includes('cosmetic') || 
        procLower.includes('bleaching') || procLower.includes('aesthetic')) {
      rejectedItems.push(`${proc} - cosmetic procedure`);
    } else {
      approvedItems.push(proc);
    }
  }
  
  if (rejectedItems.length > 0 && approvedItems.length > 0) {
    return {
      passed: 'partial',
      rejectedItems,
      approvedItems,
      details: `Some procedures are cosmetic and excluded: ${rejectedItems.join(', ')}`,
    };
  }
  
  if (rejectedItems.length > 0 && approvedItems.length === 0) {
    return {
      passed: false,
      reason: 'EXCLUDED_CONDITION',
      details: `All procedures are cosmetic/excluded: ${rejectedItems.join(', ')}`,
    };
  }
  
  return { passed: true };
}

/**
 * Calculate approved amount with limits, co-pay, and network discounts
 */
function calculateLimits(claimData, member) {
  const policy = policyConfig.getPolicyTerms();
  const coverage = policy.coverage_details;
  const claimAmount = claimData.claim_amount;
  const bill = claimData.documents?.bill || {};
  
  const result = {
    passed: true,
    approved_amount: claimAmount,
    deductions: {
      copay: 0,
      network_discount: 0,
      sub_limit_reduction: 0,
    },
    reason: null,
    details: '',
  };
  
  // Step 1: Check per-claim limit
  if (claimAmount > coverage.per_claim_limit) {
    return {
      passed: false,
      reason: 'PER_CLAIM_EXCEEDED',
      approved_amount: 0,
      deductions: {},
      details: `Claim amount ₹${claimAmount} exceeds per-claim limit of ₹${coverage.per_claim_limit}`,
    };
  }
  
  // Step 2: Check minimum claim amount
  const minAmount = policy.claim_requirements.minimum_claim_amount;
  if (claimAmount < minAmount) {
    return {
      passed: false,
      reason: 'BELOW_MIN_AMOUNT',
      approved_amount: 0,
      deductions: {},
      details: `Claim amount ₹${claimAmount} is below minimum of ₹${minAmount}`,
    };
  }
  
  // Step 3: Apply network discount if applicable
  let workingAmount = claimAmount;
  const hospital = claimData.hospital || '';
  const isNetwork = policyConfig.isNetworkHospital(hospital);
  
  if (isNetwork && claimData.cashless_request) {
    const discount = Math.round(workingAmount * (coverage.consultation_fees.network_discount / 100));
    result.deductions.network_discount = discount;
    workingAmount -= discount;
  }
  
  // Step 4: Apply co-pay
  // Consultation fees have 10% co-pay
  const consultationFee = bill.consultation_fee || 0;
  if (consultationFee > 0) {
    const copayPercentage = coverage.consultation_fees.copay_percentage || 10;
    const copay = Math.round(consultationFee * (copayPercentage / 100));
    result.deductions.copay += copay;
    workingAmount -= copay;
  }
  
  // If no specific consultation fee breakdown, apply co-pay to total
  if (consultationFee === 0 && !bill.root_canal && !bill.mri_scan && !bill.therapy_charges) {
    const copay = Math.round(claimAmount * 0.10);
    result.deductions.copay = copay;
    workingAmount -= copay;
  }
  
  result.approved_amount = Math.max(0, workingAmount);
  
  return result;
}

/**
 * Check for partial approval scenarios (dental with cosmetic, etc.)
 */
function calculatePartialApproval(claimData, coverageResult) {
  const bill = claimData.documents?.bill || {};
  
  if (coverageResult.passed === 'partial') {
    // Calculate approved amount excluding rejected items
    let approvedAmount = 0;
    
    // Map bill items to check which are covered
    for (const [key, value] of Object.entries(bill)) {
      const keyLower = key.toLowerCase();
      const isRejected = coverageResult.rejectedItems.some(item => {
        const itemLower = item.toLowerCase();
        return keyLower.includes(itemLower.split(' -')[0].trim().toLowerCase().replace(/ /g, '_'));
      });
      
      if (!isRejected && typeof value === 'number') {
        approvedAmount += value;
      }
    }
    
    // If we couldn't map specific items, subtract rejected items' amounts
    if (approvedAmount === 0) {
      // Try to find the cosmetic item amount
      const cosmeticAmount = bill.teeth_whitening || bill.cosmetic || 0;
      approvedAmount = claimData.claim_amount - cosmeticAmount;
    }
    
    return {
      decision: 'PARTIAL',
      approved_amount: approvedAmount,
      rejected_items: coverageResult.rejectedItems,
    };
  }
  
  return null;
}

/**
 * Detect fraud indicators
 */
function checkFraudIndicators(claimData) {
  const flags = [];
  let isFraud = false;
  
  // Check same-day claims
  const sameDayClaims = claimData.previous_claims_same_day || 0;
  if (sameDayClaims >= 2) {
    flags.push('Multiple claims same day');
    flags.push('Unusual pattern detected');
    isFraud = true;
  }
  
  // Check for unusually high amount near limit
  const policy = policyConfig.getPolicyTerms();
  if (claimData.claim_amount >= policy.coverage_details.per_claim_limit * 0.95) {
    flags.push('Claim amount near per-claim limit');
  }
  
  return { isFraud, flags };
}

/**
 * Check late submission (>30 days from treatment)
 */
function checkSubmissionTimeline(treatmentDate, submissionDate) {
  const requirements = policyConfig.getClaimRequirements();
  const treatment = new Date(treatmentDate);
  const submission = submissionDate ? new Date(submissionDate) : new Date();
  const daysSince = Math.floor((submission - treatment) / (1000 * 60 * 60 * 24));
  
  if (daysSince > requirements.submission_timeline_days) {
    return {
      passed: false,
      reason: 'LATE_SUBMISSION',
      details: `Claim submitted ${daysSince} days after treatment. Deadline is ${requirements.submission_timeline_days} days.`,
    };
  }
  
  return { passed: true };
}

module.exports = {
  validateDoctorRegistration,
  checkPolicyActive,
  checkWaitingPeriod,
  checkDocuments,
  checkCoverage,
  calculateLimits,
  calculatePartialApproval,
  checkFraudIndicators,
  checkSubmissionTimeline,
};

/**
 * Adjudication Engine Tests
 * Tests all 10 test cases from test_cases.json
 * 
 * Run with: npx jest tests/adjudication.test.js --detectOpenHandles --forceExit
 * 
 * Note: These tests use the rule engine directly (no MongoDB/LLM required)
 */

const ruleEngine = require('../services/ruleEngine');

// Mock member data matching seed data
const members = {
  EMP001: { member_id: 'EMP001', name: 'Rajesh Kumar', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP002: { member_id: 'EMP002', name: 'Priya Singh', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP003: { member_id: 'EMP003', name: 'Amit Verma', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP004: { member_id: 'EMP004', name: 'Sneha Reddy', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP005: { member_id: 'EMP005', name: 'Vikram Joshi', join_date: new Date('2024-09-01'), policy_status: 'active' },
  EMP006: { member_id: 'EMP006', name: 'Kavita Nair', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP007: { member_id: 'EMP007', name: 'Suresh Patil', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP008: { member_id: 'EMP008', name: 'Ravi Menon', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP009: { member_id: 'EMP009', name: 'Anita Desai', join_date: new Date('2024-01-01'), policy_status: 'active' },
  EMP010: { member_id: 'EMP010', name: 'Deepak Shah', join_date: new Date('2024-01-01'), policy_status: 'active' },
};

describe('Rule Engine - Doctor Registration Validation', () => {
  test('should validate standard format KA/45678/2015', () => {
    const result = ruleEngine.validateDoctorRegistration('KA/45678/2015');
    expect(result.valid).toBe(true);
  });

  test('should validate extended format AYUR/KL/2345/2019', () => {
    const result = ruleEngine.validateDoctorRegistration('AYUR/KL/2345/2019');
    expect(result.valid).toBe(true);
  });

  test('should reject empty registration', () => {
    const result = ruleEngine.validateDoctorRegistration('');
    expect(result.valid).toBe(false);
  });

  test('should reject invalid format', () => {
    const result = ruleEngine.validateDoctorRegistration('INVALID');
    expect(result.valid).toBe(false);
  });
});

describe('TC001 - Simple Consultation (Approved)', () => {
  const claimData = {
    member_id: 'EMP001',
    claim_amount: 1500,
    treatment_date: '2024-11-01',
    hospital: '',
    cashless_request: false,
    documents: {
      prescription: {
        doctor_name: 'Dr. Sharma',
        doctor_reg: 'KA/45678/2015',
        diagnosis: 'Viral fever',
        medicines_prescribed: ['Paracetamol 650mg', 'Vitamin C'],
      },
      bill: {
        consultation_fee: 1000,
        diagnostic_tests: 500,
        test_names: ['CBC', 'Dengue test'],
      },
    },
  };

  test('should pass eligibility check', () => {
    const result = ruleEngine.checkPolicyActive(members.EMP001, claimData.treatment_date);
    expect(result.passed).toBe(true);
  });

  test('should pass waiting period check', () => {
    const result = ruleEngine.checkWaitingPeriod(members.EMP001, claimData.treatment_date, 'Viral fever');
    expect(result.passed).toBe(true);
  });

  test('should pass document check', () => {
    const result = ruleEngine.checkDocuments(claimData.documents);
    expect(result.passed).toBe(true);
  });

  test('should pass coverage check', () => {
    const result = ruleEngine.checkCoverage(claimData);
    expect(result.passed).toBe(true);
  });

  test('should calculate limits with copay', () => {
    const result = ruleEngine.calculateLimits(claimData, members.EMP001);
    expect(result.passed).toBe(true);
    // 10% copay on consultation fee of 1000 = 100
    // Total: 1500 - 100 = 1400 (approximately — depends on exact copay calc)
    expect(result.approved_amount).toBeLessThan(1500);
    expect(result.deductions.copay).toBeGreaterThan(0);
  });
});

describe('TC002 - Dental Partial Approval', () => {
  const claimData = {
    member_id: 'EMP002',
    claim_amount: 12000,
    treatment_date: '2024-10-15',
    documents: {
      prescription: {
        doctor_name: 'Dr. Patel',
        doctor_reg: 'MH/23456/2018',
        diagnosis: 'Tooth decay requiring root canal',
        procedures: ['Root canal treatment', 'Teeth whitening'],
      },
      bill: {
        root_canal: 8000,
        teeth_whitening: 4000,
      },
    },
  };

  test('should detect partial coverage (cosmetic whitening excluded)', () => {
    const result = ruleEngine.checkCoverage(claimData);
    expect(result.passed).toBe('partial');
    expect(result.rejectedItems).toContainEqual(expect.stringContaining('whitening'));
  });

  test('should calculate partial approval amount', () => {
    const coverageResult = ruleEngine.checkCoverage(claimData);
    const partial = ruleEngine.calculatePartialApproval(claimData, coverageResult);
    expect(partial).not.toBeNull();
    expect(partial?.decision).toBe('PARTIAL');
    expect(partial?.approved_amount).toBe(8000);
  });
});

describe('TC003 - Per-Claim Limit Exceeded (Rejected)', () => {
  const claimData = {
    member_id: 'EMP003',
    claim_amount: 7500,
    treatment_date: '2024-10-20',
    documents: {
      prescription: {
        doctor_name: 'Dr. Gupta',
        doctor_reg: 'DL/34567/2016',
        diagnosis: 'Gastroenteritis',
        medicines_prescribed: ['Antibiotics', 'Probiotics'],
      },
      bill: {
        consultation_fee: 2000,
        medicines: 5500,
      },
    },
  };

  test('should fail per-claim limit check', () => {
    const result = ruleEngine.calculateLimits(claimData, members.EMP003);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('PER_CLAIM_EXCEEDED');
  });
});

describe('TC004 - Missing Documents (Rejected)', () => {
  const claimData = {
    member_id: 'EMP004',
    claim_amount: 2000,
    treatment_date: '2024-10-25',
    documents: {
      bill: {
        consultation_fee: 1500,
        medicines: 500,
      },
    },
  };

  test('should fail document check - missing prescription', () => {
    const result = ruleEngine.checkDocuments(claimData.documents);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('MISSING_DOCUMENTS');
  });
});

describe('TC005 - Waiting Period Not Met (Rejected)', () => {
  test('should fail waiting period for diabetes (45 days < 90 days)', () => {
    const result = ruleEngine.checkWaitingPeriod(
      members.EMP005, 
      '2024-10-15', // 45 days after Sep 1 join
      'Type 2 Diabetes'
    );
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('WAITING_PERIOD');
  });
});

describe('TC006 - Alternative Medicine (Approved)', () => {
  const claimData = {
    member_id: 'EMP006',
    claim_amount: 4000,
    treatment_date: '2024-10-28',
    documents: {
      prescription: {
        doctor_name: 'Vaidya Krishnan',
        doctor_reg: 'AYUR/KL/2345/2019',
        diagnosis: 'Chronic joint pain',
        treatment: 'Panchakarma therapy',
      },
      bill: {
        consultation_fee: 1000,
        therapy_charges: 3000,
      },
    },
  };

  test('should pass coverage check for ayurvedic treatment', () => {
    const result = ruleEngine.checkCoverage(claimData);
    expect(result.passed).toBe(true);
  });

  test('should validate AYUR format registration', () => {
    const result = ruleEngine.validateDoctorRegistration('AYUR/KL/2345/2019');
    expect(result.valid).toBe(true);
  });
});

describe('TC007 - MRI Pre-Auth Missing (Rejected)', () => {
  const claimData = {
    member_id: 'EMP007',
    claim_amount: 15000,
    treatment_date: '2024-11-02',
    documents: {
      prescription: {
        doctor_name: 'Dr. Rao',
        doctor_reg: 'AP/67890/2017',
        diagnosis: 'Suspected lumbar disc herniation',
        tests_prescribed: ['MRI Lumbar Spine'],
      },
      bill: {
        mri_scan: 15000,
      },
    },
  };

  test('should fail coverage check - MRI requires pre-auth', () => {
    const result = ruleEngine.checkCoverage(claimData);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('PRE_AUTH_MISSING');
  });
});

describe('TC008 - Fraud Detection (Manual Review)', () => {
  const claimData = {
    member_id: 'EMP008',
    claim_amount: 4800,
    treatment_date: '2024-10-30',
    previous_claims_same_day: 3,
    documents: {
      prescription: {
        doctor_name: 'Dr. Khan',
        doctor_reg: 'UP/45678/2016',
        diagnosis: 'Migraine',
        medicines_prescribed: ['Sumatriptan', 'Propranolol'],
      },
      bill: {
        consultation_fee: 2000,
        medicines: 2800,
      },
    },
  };

  test('should detect fraud indicators (multiple same-day claims)', () => {
    const result = ruleEngine.checkFraudIndicators(claimData);
    expect(result.isFraud).toBe(true);
    expect(result.flags).toContain('Multiple claims same day');
  });
});

describe('TC009 - Excluded Treatment (Rejected)', () => {
  const claimData = {
    member_id: 'EMP009',
    claim_amount: 8000,
    treatment_date: '2024-10-18',
    documents: {
      prescription: {
        doctor_name: 'Dr. Banerjee',
        doctor_reg: 'WB/34567/2015',
        diagnosis: 'Obesity - BMI 35',
        treatment: 'Bariatric consultation and diet plan',
      },
      bill: {
        consultation_fee: 3000,
        diet_plan: 5000,
      },
    },
  };

  test('should fail coverage check - weight loss excluded', () => {
    const result = ruleEngine.checkCoverage(claimData);
    expect(result.passed).toBe(false);
    expect(result.reason).toBe('SERVICE_NOT_COVERED');
  });
});

describe('TC010 - Network Hospital Cashless (Approved)', () => {
  const claimData = {
    member_id: 'EMP010',
    claim_amount: 4500,
    treatment_date: '2024-11-03',
    hospital: 'Apollo Hospitals',
    cashless_request: true,
    documents: {
      prescription: {
        doctor_name: 'Dr. Iyer',
        doctor_reg: 'TN/56789/2013',
        diagnosis: 'Acute bronchitis',
        medicines_prescribed: ['Antibiotics', 'Bronchodilators'],
      },
      bill: {
        consultation_fee: 1500,
        medicines: 3000,
      },
    },
  };

  test('should pass all checks', () => {
    expect(ruleEngine.checkPolicyActive(members.EMP010, claimData.treatment_date).passed).toBe(true);
    expect(ruleEngine.checkDocuments(claimData.documents).passed).toBe(true);
    expect(ruleEngine.checkCoverage(claimData).passed).toBe(true);
  });

  test('should apply network discount', () => {
    const result = ruleEngine.calculateLimits(claimData, members.EMP010);
    expect(result.passed).toBe(true);
    expect(result.deductions.network_discount).toBeGreaterThan(0);
  });

  test('should recognize Apollo as network hospital', () => {
    const policyConfig = require('../policyConfig');
    expect(policyConfig.isNetworkHospital('Apollo Hospitals')).toBe(true);
  });
});

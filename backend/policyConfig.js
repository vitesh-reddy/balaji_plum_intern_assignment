const fs = require('fs');
const path = require('path');

// Load policy terms from the provided JSON file
const policyTermsPath = path.join(__dirname, '..', 'policy_terms.json');
let policyTerms;

try {
  const rawData = fs.readFileSync(policyTermsPath, 'utf-8');
  policyTerms = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading policy_terms.json:', error.message);
  // Fallback policy terms
  policyTerms = {
    policy_id: 'PLUM_OPD_2024',
    policy_name: 'Plum OPD Advantage',
    effective_date: '2024-01-01',
    coverage_details: {
      annual_limit: 50000,
      per_claim_limit: 5000,
      family_floater_limit: 150000,
    },
    waiting_periods: {
      initial_waiting: 30,
      pre_existing_diseases: 365,
    },
    exclusions: [],
    claim_requirements: {
      submission_timeline_days: 30,
      minimum_claim_amount: 500,
    },
    network_hospitals: [],
  };
}

/**
 * Get the full policy terms configuration
 */
function getPolicyTerms() {
  return policyTerms;
}

/**
 * Get coverage details for a specific category
 */
function getCoverageDetails(category) {
  return policyTerms.coverage_details[category] || null;
}

/**
 * Get list of exclusions
 */
function getExclusions() {
  return policyTerms.exclusions || [];
}

/**
 * Get waiting periods
 */
function getWaitingPeriods() {
  return policyTerms.waiting_periods;
}

/**
 * Get network hospitals list
 */
function getNetworkHospitals() {
  return policyTerms.network_hospitals || [];
}

/**
 * Check if a hospital is in-network
 */
function isNetworkHospital(hospitalName) {
  if (!hospitalName) return false;
  const networkHospitals = getNetworkHospitals();
  return networkHospitals.some(h => 
    hospitalName.toLowerCase().includes(h.toLowerCase()) ||
    h.toLowerCase().includes(hospitalName.toLowerCase())
  );
}

/**
 * Get claim requirements
 */
function getClaimRequirements() {
  return policyTerms.claim_requirements;
}

module.exports = {
  getPolicyTerms,
  getCoverageDetails,
  getExclusions,
  getWaitingPeriods,
  getNetworkHospitals,
  isNetworkHospital,
  getClaimRequirements,
};

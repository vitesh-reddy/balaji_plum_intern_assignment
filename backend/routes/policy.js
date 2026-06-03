const express = require('express');
const router = express.Router();
const policyConfig = require('../policyConfig');

/**
 * GET /api/policy - Get current policy terms
 */
router.get('/', (req, res) => {
  try {
    const policyTerms = policyConfig.getPolicyTerms();
    res.json({ policy: policyTerms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/policy/coverage - Get coverage details
 */
router.get('/coverage', (req, res) => {
  try {
    const policy = policyConfig.getPolicyTerms();
    res.json({ coverage: policy.coverage_details });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/policy/exclusions - Get exclusions list
 */
router.get('/exclusions', (req, res) => {
  try {
    const exclusions = policyConfig.getExclusions();
    res.json({ exclusions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/policy/network-hospitals - Get network hospitals
 */
router.get('/network-hospitals', (req, res) => {
  try {
    const hospitals = policyConfig.getNetworkHospitals();
    res.json({ hospitals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

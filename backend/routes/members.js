const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const Claim = require('../models/Claim');

/**
 * GET /api/members - List all members
 */
router.get('/', async (req, res) => {
  try {
    const members = await Member.find().sort({ member_id: 1 });
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/members/:id - Get member details with claim history
 */
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findOne({ member_id: req.params.id });
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Get claim history
    const claims = await Claim.find({ member_id: req.params.id })
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalClaimed = claims.reduce((sum, c) => sum + c.claim_amount, 0);
    const totalApproved = claims.reduce((sum, c) => sum + c.approved_amount, 0);

    res.json({
      member,
      claims,
      summary: {
        total_claims: claims.length,
        total_claimed: totalClaimed,
        total_approved: totalApproved,
        remaining_annual_limit: 50000 - totalApproved,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/members - Add a new member
 */
router.post('/', async (req, res) => {
  try {
    const { member_id, name, join_date, policy_status, dependents } = req.body;

    const existing = await Member.findOne({ member_id });
    if (existing) {
      return res.status(400).json({ error: 'Member ID already exists' });
    }

    const member = new Member({
      member_id,
      name,
      join_date: new Date(join_date),
      policy_status: policy_status || 'active',
      dependents: dependents || [],
    });

    await member.save();
    res.status(201).json({ success: true, member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/members/:id/lookup - Quick lookup for member name
 */
router.get('/:id/lookup', async (req, res) => {
  try {
    const member = await Member.findOne({ member_id: req.params.id });
    if (!member) {
      return res.status(404).json({ found: false });
    }
    res.json({
      found: true,
      member_id: member.member_id,
      name: member.name,
      policy_status: member.policy_status,
      join_date: member.join_date,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

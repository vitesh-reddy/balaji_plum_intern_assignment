const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Claim = require('../models/Claim');
const Member = require('../models/Member');
const { adjudicateClaim } = require('../services/adjudicationEngine');
const ocrService = require('../services/ocrService');
const llmService = require('../services/llmService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|webp|gif|json/;
    const ext = path.extname(file.originalname).toLowerCase();
    const extname = allowedTypes.test(ext);
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/json';
    if (extname && (mimetype || ext === '.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, GIF), PDFs, and JSON test documents are allowed'));
    }
  },
});

/**
 * POST /api/claims - Submit a new claim
 * Accepts form data with files and JSON claim data
 */
router.post('/', upload.array('documents', 10), async (req, res) => {
  try {
    const {
      member_id,
      member_name,
      treatment_date,
      claim_amount,
      hospital,
      cashless_request,
      claim_type,
      document_types, // JSON string: ["prescription", "bill"]
      previous_claims_same_day,
      // For direct JSON input (test cases without files)
      documents_data,
    } = req.body;

    // Validate required fields
    if (!member_id || !member_name || !treatment_date || !claim_amount) {
      return res.status(400).json({
        error: 'Missing required fields: member_id, member_name, treatment_date, claim_amount',
      });
    }

    // Process uploaded files with OCR + LLM
    const processedDocuments = [];
    const docTypes = document_types ? JSON.parse(document_types) : [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const docType = docTypes[i] || 'bill';

        let extractedData = {};
        try {
          if (path.extname(file.originalname).toLowerCase() === '.json' || file.mimetype === 'application/json') {
            const jsonText = fs.readFileSync(file.path, 'utf-8');
            extractedData = JSON.parse(jsonText);
            extractedData._source = 'json_upload';
          } else {
            // Extract text using OCR
            const ocrResult = await ocrService.extractText(file.path);
            
            if (ocrResult.text && ocrResult.text.trim().length > 0) {
              // Use LLM to extract structured data from OCR text
              extractedData = await llmService.extractDocumentData(ocrResult.text, docType);
              extractedData._ocr_confidence = ocrResult.confidence;
            } else {
              // Try direct image extraction with Gemini Vision
              const imageBuffer = fs.readFileSync(file.path);
              extractedData = await llmService.extractFromImage(imageBuffer, docType, file.mimetype);
            }
          }
        } catch (err) {
          console.error('Document processing error:', err.message);
          extractedData = { processing_error: err.message };
        }

        processedDocuments.push({
          document_type: docType,
          file_path: file.path,
          original_name: file.originalname,
          extracted_data: extractedData,
        });
      }
    }

    // Build claim data for adjudication
    let documentsForAdjudication = {};
    
    // If direct JSON data is provided (for test cases / form-based input)
    if (documents_data) {
      const parsedDocs = typeof documents_data === 'string' 
        ? JSON.parse(documents_data) 
        : documents_data;
      documentsForAdjudication = parsedDocs;
    } else {
      // Build from extracted data
      for (const doc of processedDocuments) {
        documentsForAdjudication[doc.document_type] = doc.extracted_data;
      }
    }

    const claimDataForAdjudication = {
      member_id,
      member_name,
      treatment_date,
      claim_amount: parseFloat(claim_amount),
      hospital: hospital || '',
      cashless_request: cashless_request === 'true' || cashless_request === true,
      documents: documentsForAdjudication,
      previous_claims_same_day: parseInt(previous_claims_same_day) || 0,
    };

    // Run adjudication
    const decision = await adjudicateClaim(claimDataForAdjudication);

    // Create and save claim
    const claim = new Claim({
      member_id,
      member_name,
      treatment_date: new Date(treatment_date),
      claim_amount: parseFloat(claim_amount),
      hospital: hospital || '',
      cashless_request: cashless_request === 'true' || cashless_request === true,
      documents: processedDocuments.length > 0 ? processedDocuments : [{
        document_type: 'json_input',
        file_path: '',
        original_name: 'Direct JSON input',
        extracted_data: documentsForAdjudication,
      }],
      decision: decision.decision,
      approved_amount: decision.approved_amount,
      rejection_reasons: decision.rejection_reasons,
      rejected_items: decision.rejected_items,
      confidence_score: decision.confidence_score,
      notes: decision.notes,
      next_steps: decision.next_steps,
      flags: decision.flags,
      deductions: decision.deductions,
      adjudication_steps: decision.adjudication_steps,
      cashless_approved: decision.cashless_approved,
      previous_claims_same_day: parseInt(previous_claims_same_day) || 0,
    });

    await claim.save();

    res.status(201).json({
      success: true,
      claim: claim.toObject(),
    });
  } catch (error) {
    console.error('Claim submission error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claims - List all claims with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, member_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.decision = status;
    if (member_id) filter.member_id = member_id;
    if (from_date || to_date) {
      filter.treatment_date = {};
      if (from_date) filter.treatment_date.$gte = new Date(from_date);
      if (to_date) filter.treatment_date.$lte = new Date(to_date);
    }

    const claims = await Claim.find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Claim.countDocuments(filter);

    res.json({
      claims,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claims/stats - Get claims statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const total = await Claim.countDocuments();
    const approved = await Claim.countDocuments({ decision: 'APPROVED' });
    const rejected = await Claim.countDocuments({ decision: 'REJECTED' });
    const partial = await Claim.countDocuments({ decision: 'PARTIAL' });
    const manualReview = await Claim.countDocuments({ decision: 'MANUAL_REVIEW' });
    const pending = await Claim.countDocuments({ decision: 'PENDING' });

    const totalApprovedAmount = await Claim.aggregate([
      { $match: { decision: { $in: ['APPROVED', 'PARTIAL'] } } },
      { $group: { _id: null, total: { $sum: '$approved_amount' } } },
    ]);

    const totalClaimedAmount = await Claim.aggregate([
      { $group: { _id: null, total: { $sum: '$claim_amount' } } },
    ]);

    res.json({
      total,
      approved,
      rejected,
      partial,
      manual_review: manualReview,
      pending,
      total_approved_amount: totalApprovedAmount[0]?.total || 0,
      total_claimed_amount: totalClaimedAmount[0]?.total || 0,
      approval_rate: total > 0 ? ((approved + partial) / total * 100).toFixed(1) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/claims/:id - Get claim details
 */
router.get('/:id', async (req, res) => {
  try {
    const claim = await Claim.findOne({ 
      $or: [
        { _id: req.params.id },
        { claim_id: req.params.id },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json({ claim });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/claims/:id/appeal - Appeal a claim decision
 */
router.post('/:id/appeal', async (req, res) => {
  try {
    const { reason } = req.body;
    const claim = await Claim.findOne({
      $or: [
        { _id: req.params.id },
        { claim_id: req.params.id },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (claim.decision === 'APPROVED') {
      return res.status(400).json({ error: 'Cannot appeal an approved claim' });
    }

    // Move to manual review
    claim.decision = 'MANUAL_REVIEW';
    claim.notes = `${claim.notes}\n\nAPPEAL FILED: ${reason || 'No reason provided'}`;
    claim.next_steps = 'Appeal received. Claim will be reviewed by a senior adjudicator within 48 hours.';
    claim.flags.push('APPEAL_FILED');
    await claim.save();

    res.json({ success: true, claim });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/claims/:id - Delete a claim
 */
router.delete('/:id', async (req, res) => {
  try {
    const claim = await Claim.findOneAndDelete({
      $or: [
        { _id: req.params.id },
        { claim_id: req.params.id },
      ],
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Clean up uploaded files
    if (claim.documents) {
      for (const doc of claim.documents) {
        if (doc.file_path && fs.existsSync(doc.file_path)) {
          fs.unlinkSync(doc.file_path);
        }
      }
    }

    res.json({ success: true, message: 'Claim deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

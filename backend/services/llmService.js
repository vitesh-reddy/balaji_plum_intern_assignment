const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const ragService = require('./ragService');

let ai = null;

/**
 * Initialize the Gemini API client
 */
function initializeGemini() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('WARNING: GEMINI_API_KEY not set. LLM features will use mock responses.');
      return false;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return true;
}

/**
 * Extract structured data from document text using Gemini
 */
async function extractDocumentData(rawText, documentType) {
  if (!initializeGemini()) {
    return getMockExtractionResponse(documentType, rawText);
  }

  const retrieval = ragService.retrieveContext(`${documentType} document extraction claim requirements ${rawText}`, { limit: 3 });

  const prompt = `You are a medical document data extractor for an insurance claims system.
Extract structured data from the following ${documentType} document text.

Use this retrieved policy/documentation context to prefer fields required by the claim adjudication workflow:
${retrieval.contextText || 'No relevant local context found.'}

Document Text:
${rawText}

Return a JSON object with the following fields based on document type:

For prescription:
{
  "doctor_name": "",
  "doctor_reg": "",
  "diagnosis": "",
  "medicines_prescribed": [],
  "tests_prescribed": [],
  "treatment": "",
  "patient_name": "",
  "patient_age": "",
  "date": "",
  "follow_up": ""
}

For bill:
{
  "hospital_name": "",
  "bill_number": "",
  "date": "",
  "patient_name": "",
  "consultation_fee": 0,
  "diagnostic_tests": 0,
  "test_names": [],
  "medicines": 0,
  "procedures": 0,
  "total_amount": 0,
  "payment_mode": ""
}

For report:
{
  "lab_name": "",
  "patient_name": "",
  "date": "",
  "referred_by": "",
  "tests": [{"name": "", "result": "", "normal_range": ""}],
  "remarks": ""
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });
    const responseText = result.text;
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw_text: rawText, extraction_failed: true };
  } catch (error) {
    console.error('Gemini extraction error:', error.message);
    return { raw_text: rawText, extraction_failed: true, error: error.message };
  }
}

/**
 * Extract structured data from a document image using Gemini Vision
 */
async function extractFromImage(imageBuffer, documentType, mimeType = 'image/jpeg') {
  if (!initializeGemini()) {
    return getMockExtractionResponse(documentType);
  }

  const retrieval = ragService.retrieveContext(`${documentType} image extraction claim requirements`, { limit: 3 });

  const prompt = `You are a medical document data extractor for an insurance claims system.
Analyze this ${documentType} document image and extract all relevant information.

Use this retrieved policy/documentation context to prefer fields required by the claim adjudication workflow:
${retrieval.contextText || 'No relevant local context found.'}

Return a JSON object with these fields:

For prescription: doctor_name, doctor_reg (registration number), diagnosis, medicines_prescribed (array), tests_prescribed (array), treatment, patient_name, date
For bill: hospital_name, bill_number, date, consultation_fee (number), diagnostic_tests (number), test_names (array), medicines (number), total_amount (number), patient_name
For report: lab_name, patient_name, date, tests (array of {name, result, normal_range}), referred_by

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [prompt, imagePart]
    });
    const responseText = result.text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { extraction_failed: true };
  } catch (error) {
    console.error('Gemini vision extraction error:', error.message);
    return { extraction_failed: true, error: error.message };
  }
}

/**
 * Assess medical necessity of a treatment
 */
async function assessMedicalNecessity(diagnosis, treatment, medicines) {
  if (!initializeGemini()) {
    return {
      is_necessary: true,
      confidence: 0.85,
      reasoning: 'Mock assessment: Treatment appears medically appropriate for the diagnosis.',
    };
  }

  const retrieval = ragService.retrieveContext([
    'medical necessity covered treatment exclusions pre authorization waiting period',
    diagnosis,
    treatment,
    Array.isArray(medicines) ? medicines.join(' ') : medicines,
  ].filter(Boolean).join(' '), { limit: 5 });

  const prompt = `You are a medical reviewer for an insurance company.
Assess if the following treatment is medically necessary.

Base the review on the retrieved local policy and adjudication context below. If the context is not enough,
say so briefly in the reasoning and rely on standard medical appropriateness.

Retrieved Context:
${retrieval.contextText || 'No relevant local context found.'}

Diagnosis: ${diagnosis}
Treatment/Procedures: ${treatment || 'Not specified'}
Medicines Prescribed: ${Array.isArray(medicines) ? medicines.join(', ') : medicines || 'Not specified'}

Evaluate:
1. Does the diagnosis justify the treatment?
2. Are the prescribed medicines appropriate?
3. Does the treatment follow standard medical protocols?

Return ONLY a JSON object:
{
  "is_necessary": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });
    const responseText = result.text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.rag_sources = retrieval.snippets.map(snippet => snippet.source);
      return parsed;
    }
    return { is_necessary: true, confidence: 0.7, reasoning: 'Unable to parse assessment', rag_sources: retrieval.snippets.map(snippet => snippet.source) };
  } catch (error) {
    console.error('Medical necessity assessment error:', error.message);
    return { is_necessary: true, confidence: 0.7, reasoning: 'Assessment failed, defaulting to approved', rag_sources: retrieval.snippets.map(snippet => snippet.source) };
  }
}

/**
 * Detect fraud indicators using AI
 */
async function detectFraudIndicators(claimData, claimHistory) {
  if (!initializeGemini()) {
    return { fraud_risk: 'low', confidence: 0.9, indicators: [] };
  }

  const retrieval = ragService.retrieveContext(`fraud suspicious duplicate same day claim ${ragService.buildClaimQuery(claimData)}`, { limit: 3 });

  const prompt = `You are a fraud detection analyst for a health insurance company.
Analyze the following claim for potential fraud indicators.

Use this retrieved local adjudication context when relevant:
${retrieval.contextText || 'No relevant local context found.'}

Current Claim:
${JSON.stringify(claimData, null, 2)}

Claim History (same member):
${JSON.stringify(claimHistory || [], null, 2)}

Look for:
- Unusually high frequency of claims
- Suspicious patterns (same provider, same day)
- Diagnosis not matching age/gender
- Unusually high amounts
- Duplicate claims

Return ONLY a JSON object:
{
  "fraud_risk": "low/medium/high",
  "confidence": 0.0-1.0,
  "indicators": ["list of suspicious findings"]
}`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });
    const responseText = result.text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { fraud_risk: 'low', confidence: 0.8, indicators: [] };
  } catch (error) {
    console.error('Fraud detection error:', error.message);
    return { fraud_risk: 'low', confidence: 0.7, indicators: [] };
  }
}

/**
 * Mock responses for when Gemini API is not configured
 */
function getMockExtractionResponse(documentType, rawText) {
  const defaults = {
    prescription: {
      doctor_name: 'Dr. Unknown',
      doctor_reg: '',
      diagnosis: 'Not extracted',
      medicines_prescribed: [],
      tests_prescribed: [],
      patient_name: '',
      date: '',
    },
    bill: {
      hospital_name: '',
      bill_number: '',
      date: '',
      consultation_fee: 0,
      total_amount: 0,
      patient_name: '',
    },
    report: {
      lab_name: '',
      patient_name: '',
      date: '',
      tests: [],
    },
  };
  
  return defaults[documentType] || { extraction_note: 'Mock response - configure GEMINI_API_KEY for real extraction' };
}

module.exports = {
  extractDocumentData,
  extractFromImage,
  assessMedicalNecessity,
  detectFraudIndicators,
  retrievePolicyContext: ragService.retrieveContext,
};

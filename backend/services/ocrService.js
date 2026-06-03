const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * OCR Service - Extract text from images using Tesseract.js
 */

/**
 * Extract text from an image file
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function extractText(imagePath) {
  try {
    const { data } = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Progress can be logged here if needed
        }
      },
    });

    return {
      text: data.text,
      confidence: data.confidence / 100, // Convert to 0-1 range
      words: data.words?.length || 0,
    };
  } catch (error) {
    console.error('OCR extraction error:', error.message);
    return {
      text: '',
      confidence: 0,
      words: 0,
      error: error.message,
    };
  }
}

/**
 * Extract text from a buffer (in-memory image)
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{text: string, confidence: number}>}
 */
async function extractTextFromBuffer(imageBuffer) {
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng');
    
    return {
      text: data.text,
      confidence: data.confidence / 100,
      words: data.words?.length || 0,
    };
  } catch (error) {
    console.error('OCR buffer extraction error:', error.message);
    return {
      text: '',
      confidence: 0,
      words: 0,
      error: error.message,
    };
  }
}

/**
 * Check if document is legible (confidence threshold)
 * @param {number} confidence - OCR confidence score (0-1)
 * @returns {boolean}
 */
function isDocumentLegible(confidence) {
  return confidence >= 0.5; // 50% minimum confidence
}

module.exports = {
  extractText,
  extractTextFromBuffer,
  isDocumentLegible,
};

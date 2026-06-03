const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MAX_CHUNK_CHARS = 1200;

const SOURCE_FILES = [
  'policy_terms.json',
  'adjudication_rules.md',
  'sample_documents_guide.md',
  'docs/ARCHITECTURE.md',
  'docs/API.md',
  'docs/ASSUMPTIONS.md',
  'docs/DECISION_FLOWCHART.md',
];

let corpus = null;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s/-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function splitMarkdown(text) {
  const sections = String(text || '')
    .split(/\n(?=#{1,6}\s+)/)
    .map(section => section.trim())
    .filter(Boolean);

  return sections.length > 0 ? sections : [String(text || '').trim()].filter(Boolean);
}

function splitLongText(text) {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
    chunks.push(text.slice(i, i + MAX_CHUNK_CHARS));
  }
  return chunks;
}

function flattenPolicyJson(value, prefix = 'policy') {
  if (Array.isArray(value)) {
    return [`${prefix}: ${value.join(', ')}`];
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nested]) =>
      flattenPolicyJson(nested, `${prefix}.${key}`)
    );
  }

  return [`${prefix}: ${value}`];
}

function buildChunksForFile(relativePath, rawText) {
  if (relativePath.endsWith('.json')) {
    try {
      const parsed = JSON.parse(rawText);
      return flattenPolicyJson(parsed).map((content, index) => ({
        id: `${relativePath}#${index + 1}`,
        source: relativePath,
        content,
        tokens: tokenize(content),
      }));
    } catch {
      return [];
    }
  }

  return splitMarkdown(rawText)
    .flatMap(splitLongText)
    .map((content, index) => ({
      id: `${relativePath}#${index + 1}`,
      source: relativePath,
      content,
      tokens: tokenize(content),
    }));
}

function loadCorpus() {
  if (corpus) return corpus;

  corpus = SOURCE_FILES.flatMap(relativePath => {
    const absolutePath = path.join(PROJECT_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) return [];

    const rawText = fs.readFileSync(absolutePath, 'utf-8');
    return buildChunksForFile(relativePath, rawText);
  });

  return corpus;
}

function scoreChunk(chunk, queryTokens) {
  const querySet = new Set(queryTokens);
  const chunkSet = new Set(chunk.tokens);
  let score = 0;

  for (const token of querySet) {
    if (chunkSet.has(token)) score += 3;
    if (chunk.source.includes(token)) score += 1;
  }

  return score;
}

function retrieveContext(query, options = {}) {
  const limit = options.limit || 5;
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { query, snippets: [], contextText: '' };
  }

  const snippets = loadCorpus()
    .map(chunk => ({ ...chunk, score: scoreChunk(chunk, queryTokens) }))
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, source, content, score }) => ({ id, source, content, score }));

  const contextText = snippets
    .map((snippet, index) => `[${index + 1}] ${snippet.source}\n${snippet.content}`)
    .join('\n\n');

  return { query, snippets, contextText };
}

function buildClaimQuery(claimData = {}) {
  const prescription = claimData.documents?.prescription || {};
  const bill = claimData.documents?.bill || {};

  return [
    claimData.member_id,
    claimData.claim_amount,
    claimData.hospital,
    claimData.cashless_request ? 'cashless network hospital' : '',
    prescription.diagnosis,
    prescription.treatment,
    prescription.procedures,
    prescription.tests_prescribed,
    prescription.medicines_prescribed,
    Object.keys(bill).join(' '),
  ]
    .flat()
    .filter(Boolean)
    .join(' ');
}

module.exports = {
  retrieveContext,
  buildClaimQuery,
};

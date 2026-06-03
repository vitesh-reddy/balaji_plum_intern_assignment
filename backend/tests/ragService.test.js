const ragService = require('../services/ragService');

describe('RAG Service', () => {
  test('retrieves policy context for claim limits', () => {
    const result = ragService.retrieveContext('annual_limit per_claim_limit consultation_fees', { limit: 5 });

    expect(result.snippets.length).toBeGreaterThan(0);
    expect(result.snippets.some(snippet => snippet.source === 'policy_terms.json')).toBe(true);
  });

  test('builds a claim query from treatment and bill data', () => {
    const query = ragService.buildClaimQuery({
      member_id: 'EMP001',
      claim_amount: 1500,
      hospital: 'Apollo Hospitals',
      cashless_request: true,
      documents: {
        prescription: {
          diagnosis: 'Viral fever',
          medicines_prescribed: ['Paracetamol'],
        },
        bill: {
          consultation_fee: 1000,
        },
      },
    });

    expect(query).toContain('Viral fever');
    expect(query).toContain('cashless network hospital');
    expect(query).toContain('consultation_fee');
  });
});

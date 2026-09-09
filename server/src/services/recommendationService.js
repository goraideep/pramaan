// ==========================================================================
// AI RECOMMENDATION (natural-language summary)
// ==========================================================================
// This is a template-based summary, not a live model call - it stitches
// together the compliance/risk results into readable sentences. Swapping in a
// real LLM call here later is a small, isolated change (see aiService.js).
// PRAMAAN never lets this text make the actual decision - see the disclaimer
// that is always appended.
// ==========================================================================

function buildRecommendation({ complianceItems, complianceScore, riskLevel, discrepancies }) {
  const failed = complianceItems.filter((i) => i.result === 'FAIL');
  const warnings = complianceItems.filter((i) => i.result === 'WARNING');
  const critical = discrepancies.filter((d) => d.severity === 'critical');

  const parts = [];

  if (failed.length === 0 && warnings.length === 0 && discrepancies.length === 0) {
    parts.push('PRAMAAN analysis indicates that the bidder satisfies all evaluated requirements with no cross-document discrepancies detected.');
  } else {
    parts.push(`PRAMAAN analysis indicates a compliance score of ${complianceScore}/100 with ${failed.length} failed requirement(s) and ${warnings.length} item(s) needing review.`);
  }

  if (critical.length > 0) {
    parts.push(`Critical concern: ${critical[0].explanation}`);
  }

  if (failed.length > 0) {
    parts.push(`Failed requirements: ${failed.map((f) => f.label).join(', ')}.`);
  }

  parts.push(`Overall risk is assessed as ${riskLevel}.`);
  parts.push('Procurement Officer review is recommended before making the final qualification decision.');
  parts.push('AI recommendation only. Final decision rests with the Procurement Officer.');

  return parts.join(' ');
}

module.exports = { buildRecommendation };

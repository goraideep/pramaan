// ==========================================================================
// RISK ENGINE
// ==========================================================================
// Converts compliance results + discrepancies into a single explainable risk
// score. Every point added is logged as a "riskFactor" with a reason, so the
// UI can always show *why* the score is what it is - nothing is a black box.
// ==========================================================================

const DISCREPANCY_POINTS = { critical: 25, medium: 15, low: 5 };

function calculateRisk(complianceItems, discrepancies) {
  const factors = [];
  let score = 0;

  complianceItems.forEach((item) => {
    if (item.result === 'FAIL') {
      const points = 20;
      score += points;
      factors.push({ label: `${item.label} - Failed`, points, reason: `Expected ${item.expected}, found ${item.extracted}` });
    } else if (item.result === 'WARNING') {
      const points = 8;
      score += points;
      factors.push({ label: `${item.label} - Warning`, points, reason: 'Requires manual verification' });
    } else if (item.result === 'PENDING') {
      const points = 5;
      score += points;
      factors.push({ label: `${item.label} - Pending`, points, reason: 'Document not yet submitted' });
    }

    if (item.confidence != null && item.confidence < 75) {
      const points = 5;
      score += points;
      factors.push({ label: `${item.label} - Low extraction confidence`, points, reason: `Only ${item.confidence}% confident in extracted value` });
    }
  });

  discrepancies.forEach((d) => {
    const points = DISCREPANCY_POINTS[d.severity] || 5;
    score += points;
    factors.push({ label: `Discrepancy: ${d.field}`, points, reason: d.explanation });
  });

  score = Math.min(100, score);

  let level = 'LOW';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 25) level = 'MEDIUM';

  return { riskScore: score, riskLevel: level, riskFactors: factors };
}

module.exports = { calculateRisk };

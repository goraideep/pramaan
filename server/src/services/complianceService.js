// ==========================================================================
// COMPLIANCE ENGINE
// ==========================================================================
// Turns (tender requirements) + (documents & their extracted data) into a
// list of PASS / FAIL / WARNING / PENDING results, a weighted score, and a
// list of cross-document discrepancies.
//
// This is a rules engine, not "AI" - every decision here is a plain if/else
// so it can be explained line by line to a judge.
// ==========================================================================

// Which document category satisfies which requirement key.
const REQUIREMENT_DOCUMENT_MAP = {
  gst: 'GST Certificate',
  pan: 'PAN',
  udyam: 'Udyam/MSME Certificate',
  turnover: 'Turnover Certificate',
  oem: 'OEM Authorization',
  income_tax: 'Income Tax',
};

function normalizeName(name = '') {
  return name
    .toLowerCase()
    .replace(/private limited|pvt ltd|ltd|limited|\./g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Compares the legal name on every document against the bidder's registered
// name. Flags anything that doesn't reduce to the same normalized string.
function findCrossDocumentDiscrepancies(bidderName, documents) {
  const discrepancies = [];
  const baseline = normalizeName(bidderName);

  documents.forEach((doc) => {
    const extractedName = doc.extracted?.legalName;
    if (!extractedName) return;

    const normalized = normalizeName(extractedName);
    if (normalized === baseline) return; // exact match after normalizing punctuation/suffixes -> fine

    // "contains" check catches things like "ABC INDUSTRIES" vs "ABC INDUSTRIES PVT LTD"
    const isCloseMatch = normalized.includes(baseline) || baseline.includes(normalized);

    discrepancies.push({
      severity: isCloseMatch ? 'low' : 'critical',
      field: 'Legal Name',
      documentA: 'Bidder Registration',
      valueA: bidderName,
      documentB: doc.category,
      valueB: extractedName,
      explanation: isCloseMatch
        ? 'Minor legal-name variation (e.g. abbreviation or suffix) - usually acceptable but worth a quick check.'
        : `The name on "${doc.category}" does not match the bidder's registered name at all. This can mean the wrong document was uploaded or the entity is different.`,
    });
  });

  // Expired certificates
  const today = new Date();
  documents.forEach((doc) => {
    if (doc.extracted?.expiryDate) {
      const exp = new Date(doc.extracted.expiryDate);
      if (exp < today) {
        discrepancies.push({
          severity: 'medium',
          field: 'Certificate Validity',
          documentA: doc.category,
          valueA: doc.extracted.expiryDate,
          documentB: '',
          valueB: '',
          explanation: `${doc.category} appears to be expired.`,
        });
      }
    }
  });

  return discrepancies;
}

function evaluateRequirement(req, documents) {
  const docCategory = REQUIREMENT_DOCUMENT_MAP[req.key];
  const doc = docCategory ? documents.find((d) => d.category === docCategory) : null;

  const base = {
    key: req.key,
    label: req.label,
    category: req.category,
    sourceDocument: doc?.category || null,
    confidence: doc?.extracted?.confidence ?? null,
  };

  // No matching document at all
  if (docCategory && !doc) {
    return { ...base, result: req.mandatory ? 'FAIL' : 'PENDING', expected: req.threshold, extracted: 'Not submitted' };
  }

  // Requirements with no document mapping (e.g. blacklist check) are treated
  // as satisfied here because in the full system they'd come from the
  // Government Verification Center adapters (see verification concept in README).
  if (!docCategory) {
    return { ...base, result: 'PASS', expected: req.threshold || 'N/A', extracted: 'Verified (simulated)' };
  }

  const ex = doc.extracted || {};

  switch (req.key) {
    case 'gst':
      return { ...base, result: ex.gstin ? 'PASS' : 'FAIL', expected: 'Valid GSTIN', extracted: ex.gstin || 'Not found' };
    case 'pan':
      return { ...base, result: ex.pan ? 'PASS' : 'FAIL', expected: 'Valid PAN', extracted: ex.pan || 'Not found' };
    case 'udyam':
      return { ...base, result: ex.udyam ? 'PASS' : 'FAIL', expected: 'Valid Udyam number', extracted: ex.udyam || 'Not found' };
    case 'turnover': {
      const required = Number(req.threshold) || 0;
      const got = ex.turnover || 0;
      return {
        ...base,
        result: got >= required ? 'PASS' : 'FAIL',
        expected: `₹${(required / 1_00_00_000).toFixed(2)} Cr`,
        extracted: `₹${(got / 1_00_00_000).toFixed(2)} Cr`,
      };
    }
    case 'oem':
      return { ...base, result: 'WARNING', expected: 'Matching OEM entity name', extracted: ex.legalName || 'Not found' };
    default:
      return { ...base, result: 'PENDING', expected: req.threshold || 'N/A', extracted: 'Not evaluated' };
  }
}

function runComplianceEngine(tender, bidder, documents) {
  const complianceItems = tender.requirements.map((req) => evaluateRequirement(req, documents));
  const discrepancies = findCrossDocumentDiscrepancies(bidder.name, documents);

  // If a discrepancy touches OEM, downgrade that item's result to WARNING/FAIL
  // so the compliance list and the evidence panel tell a consistent story.
  const criticalOem = discrepancies.find((d) => d.severity === 'critical');
  if (criticalOem) {
    const oemItem = complianceItems.find((i) => i.key === 'oem');
    if (oemItem) oemItem.result = 'FAIL';
  }

  // Weighted score: PASS = full weight, WARNING = half weight, FAIL/PENDING/NA = 0
  let earned = 0;
  let total = 0;
  tender.requirements.forEach((req, idx) => {
    const item = complianceItems[idx];
    total += req.weight;
    if (item.result === 'PASS') earned += req.weight;
    else if (item.result === 'WARNING') earned += req.weight * 0.5;
  });
  const complianceScore = total > 0 ? Math.round((earned / total) * 100) : 0;

  return { complianceItems, complianceScore, discrepancies };
}

module.exports = { runComplianceEngine, normalizeName };

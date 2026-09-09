// ==========================================================================
// DEMO DATA SEEDER
// ==========================================================================
// Run with: npm run seed
// Wipes existing data and loads:
//   - 3 demo users (officer / reviewer / admin)
//   - 1 tender (CPCL/PROC/2026/001) with 6 requirements
//   - 3 bidders, each hand-crafted to show a different outcome:
//       ABC Industries Pvt Ltd        -> clean pass, low risk
//       Bharat Industrial Solutions   -> some warnings, medium risk
//       XYZ Engineering Ltd           -> critical discrepancies, high risk
// Every bidder is run through the *real* compliance/risk engines (not
// hardcoded scores) so the numbers you see are always internally consistent.
// ==========================================================================
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Tender = require('./models/Tender');
const Bidder = require('./models/Bidder');
const Document = require('./models/Document');
const AuditLog = require('./models/AuditLog');

const { runComplianceEngine } = require('./services/complianceService');
const { calculateRisk } = require('./services/riskService');
const { buildRecommendation } = require('./services/recommendationService');

const DEMO_PASSWORD = 'Pramaan@123';

async function run() {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Tender.deleteMany({}),
    Bidder.deleteMany({}),
    Document.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [officer, reviewer, admin] = await User.create([
    { name: 'Procurement Officer', email: 'officer@pramaan.demo', password: passwordHash, role: 'officer' },
    { name: 'Compliance Reviewer', email: 'reviewer@pramaan.demo', password: passwordHash, role: 'reviewer' },
    { name: 'System Administrator', email: 'admin@pramaan.demo', password: passwordHash, role: 'admin' },
  ]);
  console.log('Created demo users (password for all:', DEMO_PASSWORD, ')');

  const tender = await Tender.create({
    tenderId: 'CPCL/PROC/2026/001',
    title: 'Supply of Industrial Safety Equipment',
    organization: 'Chennai Petroleum Corporation Limited',
    department: 'Ministry of Petroleum & Natural Gas',
    category: 'Industrial Equipment',
    estimatedValue: 25000000,
    submissionDeadline: new Date('2026-03-31'),
    description: 'Procurement of certified industrial safety equipment for refinery operations, including PPE, gas detectors and fire safety gear.',
    status: 'active',
    createdBy: officer._id,
    requirements: [
      { key: 'gst', label: 'GST Registration', category: 'Tax', mandatory: true, weight: 15, threshold: '' },
      { key: 'pan', label: 'PAN', category: 'Identity', mandatory: true, weight: 10, threshold: '' },
      { key: 'udyam', label: 'Udyam / MSME Registration', category: 'Registration', mandatory: true, weight: 10, threshold: '' },
      { key: 'turnover', label: 'Minimum Annual Turnover', category: 'Financial', mandatory: true, weight: 25, threshold: '100000000' }, // 10 Cr
      { key: 'oem', label: 'OEM Authorization', category: 'OEM', mandatory: true, weight: 25, threshold: '' },
      { key: 'income_tax', label: 'Income Tax Compliance', category: 'Tax', mandatory: false, weight: 15, threshold: '' },
    ],
  });
  console.log('Created tender', tender.tenderId);

  async function makeBidder({ name, gstin, pan, udyam, docs }) {
    const bidder = await Bidder.create({ tender: tender._id, name, gstin, pan, udyam, verificationStatus: 'IN_PROGRESS' });

    const documents = [];
    for (const d of docs) {
      const doc = await Document.create({
        bidder: bidder._id,
        category: d.category,
        originalName: d.originalName,
        filePath: `seed-data/${d.originalName}`,
        mimeType: 'application/pdf',
        processingStatus: 'PROCESSED',
        extracted: d.extracted,
      });
      documents.push(doc);
      await AuditLog.create({
        user: officer._id,
        userName: officer.name,
        action: 'DOCUMENT_UPLOADED',
        tender: tender._id,
        bidder: bidder._id,
        details: `${d.category} (${d.originalName})`,
      });
      await AuditLog.create({
        user: officer._id,
        userName: officer.name,
        action: 'AI_EXTRACTION_COMPLETED',
        tender: tender._id,
        bidder: bidder._id,
        details: `${d.category} processed (demo mode)`,
      });
    }

    const { complianceItems, complianceScore, discrepancies } = runComplianceEngine(tender, bidder, documents);
    const { riskScore, riskLevel, riskFactors } = calculateRisk(complianceItems, discrepancies);
    const aiRecommendation = buildRecommendation({ complianceItems, complianceScore, riskLevel, discrepancies });

    bidder.complianceItems = complianceItems;
    bidder.complianceScore = complianceScore;
    bidder.discrepancies = discrepancies;
    bidder.riskScore = riskScore;
    bidder.riskLevel = riskLevel;
    bidder.riskFactors = riskFactors;
    bidder.aiRecommendation = aiRecommendation;
    bidder.aiMode = 'demo';
    bidder.verificationStatus = 'COMPLETED';
    await bidder.save();

    await AuditLog.create({
      user: officer._id,
      userName: officer.name,
      action: 'VERIFICATION_COMPLETED',
      tender: tender._id,
      bidder: bidder._id,
      details: `Score ${complianceScore}/100, Risk ${riskLevel} (${riskScore})`,
    });

    return bidder;
  }

  // ---- Bidder 1: ABC Industries Pvt Ltd - clean pass, low risk ----
  await makeBidder({
    name: 'ABC Industries Pvt Ltd',
    gstin: '19ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    udyam: 'UDYAM-TN-01-0001234',
    docs: [
      { category: 'GST Certificate', originalName: 'ABC_GST_Certificate.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', gstin: '19ABCDE1234F1Z5', issueDate: '2022-04-12', confidence: 97 } },
      { category: 'PAN', originalName: 'ABC_PAN.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', pan: 'ABCDE1234F', confidence: 98 } },
      { category: 'Udyam/MSME Certificate', originalName: 'ABC_Udyam.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', udyam: 'UDYAM-TN-01-0001234', registrationNumber: 'REG778812', confidence: 95 } },
      { category: 'Turnover Certificate', originalName: 'ABC_Turnover_Certificate.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', turnover: 124000000, confidence: 94 } }, // 12.4 Cr
      { category: 'OEM Authorization', originalName: 'ABC_OEM_Authorization.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', confidence: 96 } },
      { category: 'Income Tax', originalName: 'ABC_IT_Returns.pdf', extracted: { legalName: 'ABC Industries Pvt Ltd', pan: 'ABCDE1234F', confidence: 93 } },
    ],
  });

  // ---- Bidder 2: Bharat Industrial Solutions - warnings, medium risk ----
  await makeBidder({
    name: 'Bharat Industrial Solutions',
    gstin: '27BHRAT5678G1Z2',
    pan: 'BHRAT5678G',
    udyam: 'UDYAM-MH-02-0005678',
    docs: [
      { category: 'GST Certificate', originalName: 'Bharat_GST_Certificate.pdf', extracted: { legalName: 'Bharat Industrial Solutions', gstin: '27BHRAT5678G1Z2', issueDate: '2021-06-01', confidence: 92 } },
      { category: 'PAN', originalName: 'Bharat_PAN.pdf', extracted: { legalName: 'Bharat Industrial Solutions', pan: 'BHRAT5678G', confidence: 71 } }, // low confidence -> risk point
      { category: 'Udyam/MSME Certificate', originalName: 'Bharat_Udyam.pdf', extracted: { legalName: 'Bharat Industrial Solution', udyam: 'UDYAM-MH-02-0005678', registrationNumber: 'REG556291', confidence: 89 } }, // minor name variation -> low severity discrepancy
      { category: 'Turnover Certificate', originalName: 'Bharat_Turnover_Certificate.pdf', extracted: { legalName: 'Bharat Industrial Solutions', turnover: 95000000, confidence: 90 } }, // 9.5 Cr -> below 10 Cr threshold -> FAIL
      { category: 'OEM Authorization', originalName: 'Bharat_OEM_Authorization.pdf', extracted: { legalName: 'Bharat Industrial Solutions', confidence: 91 } },
      { category: 'Income Tax', originalName: 'Bharat_IT_Returns.pdf', extracted: { legalName: 'Bharat Industrial Solutions', pan: 'BHRAT5678G', confidence: 88 } },
    ],
  });

  // ---- Bidder 3: XYZ Engineering Ltd - critical discrepancies, high risk ----
  await makeBidder({
    name: 'XYZ Engineering Ltd',
    gstin: '07XYZEN9012H1Z9',
    pan: 'XYZEN9012H',
    udyam: 'UDYAM-DL-03-0009012',
    docs: [
      { category: 'GST Certificate', originalName: 'XYZ_GST_Certificate.pdf', extracted: { legalName: 'XYZ Engineering Ltd', gstin: '07XYZEN9012H1Z9', issueDate: '2018-01-15', expiryDate: '2024-01-14', confidence: 90 } }, // expired
      { category: 'PAN', originalName: 'XYZ_PAN.pdf', extracted: { legalName: 'XYZ Engineering Ltd', pan: 'XYZEN9012H', confidence: 88 } },
      { category: 'Udyam/MSME Certificate', originalName: 'XYZ_Udyam.pdf', extracted: { legalName: 'XYZ Engineering Ltd', udyam: 'UDYAM-DL-03-0009012', registrationNumber: 'REG112233', confidence: 85 } },
      { category: 'Turnover Certificate', originalName: 'XYZ_Turnover_Certificate.pdf', extracted: { legalName: 'XYZ Engineering Ltd', turnover: 42000000, confidence: 80 } }, // 4.2 Cr -> well below threshold -> FAIL
      { category: 'OEM Authorization', originalName: 'XYZ_OEM_Authorization.pdf', extracted: { legalName: 'Bharat OEM Systems Pvt Ltd', confidence: 93 } }, // totally different entity -> CRITICAL discrepancy
      { category: 'Income Tax', originalName: 'XYZ_IT_Returns.pdf', extracted: { legalName: 'XYZ Engineering Ltd', pan: 'XYZEN9012H', confidence: 82 } },
    ],
  });

  console.log('\n=== PRAMAAN demo data loaded ===');
  console.log('Login with any of:');
  console.log('  officer@pramaan.demo  / ' + DEMO_PASSWORD);
  console.log('  reviewer@pramaan.demo / ' + DEMO_PASSWORD);
  console.log('  admin@pramaan.demo    / ' + DEMO_PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

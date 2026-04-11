require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCategories() {
  console.log('--- Document Category Normalization Migration ---');
  
  try {
    // 1. Get all documents with non-null categories
    const documents = await prisma.document.findMany({
      where: {
        category: { not: null }
      },
      select: {
        id: true,
        category: true
      }
    });

    console.log(`Checking ${documents.length} documents for naming...`);
    let docUpdates = 0;

    for (const doc of documents) {
      if (doc.category) {
        const normalized = doc.category.toUpperCase().replace(/\s+/g, '_');
        if (doc.category !== normalized) {
          await prisma.document.update({
            where: { id: doc.id },
            data: { category: normalized }
          });
          docUpdates++;
        }
      }
    }

    console.log(`✅ Updated ${docUpdates} documents (spaces -> underscores).`);

    // 2. Get all metadata with non-null categories
    const metadata = await prisma.documentMetadata.findMany({
      include: { document: true }
    });

    console.log(`Checking ${metadata.length} metadata records for grouping...`);
    let metaUpdates = 0;

    // Load grouping rules (inlined to avoid module resolution issues in script)
    const CATEGORY_GROUPS = {
        'INVOICES':   ['INVOICE', 'RECEIPT', 'PURCHASE_ORDER', 'QUOTATION', 'BILL'],
        'CONTRACTS':  ['CONTRACT', 'AGREEMENT', 'NDA', 'LICENSE', 'PERMIT', 'MOU'],
        'RESUMES':    ['RESUME', 'CV', 'COVER_LETTER', 'PORTFOLIO'],
        'REPORTS':    ['REPORT', 'AUDIT_REPORT', 'SALES_REPORT', 'PROJECT_REPORT', 'MARKET_ANALYSIS', 'RESEARCH'],
        'LEGAL':      ['LEGAL_NOTICE', 'COMPLIANCE', 'REGULATION', 'POLICY', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
        'PROJECTS':   ['PROJECT_PLAN', 'PROPOSAL', 'PRESENTATION', 'MEETING_NOTES', 'TECHNICAL_DOC', 'SRS', 'SPECIFICATION'],
        'FINANCIAL':  ['FINANCIAL_STATEMENT', 'TAX_DOCUMENT', 'BANK_STATEMENT', 'EXPENSE_REPORT', 'INVESTMENT_RECORD', 'BUDGET', 'PAYROLL'],
        'HR':         ['OFFER_LETTER', 'EMPLOYEE_RECORD', 'PAYSLIP', 'PERFORMANCE_REVIEW', 'ID_PROOF', 'LEAVE_APPLICATION', 'APPRAISAL'],
        'COMMUNICATION': ['EMAIL', 'MEMO', 'LETTER', 'NOTICE', 'CIRCULAR', 'ANNOUNCEMENT'],
        'AI_INSIGHTS': ['AI_GENERATED', 'RECOMMENDATION', 'IMAGE_ANALYSIS', 'DATA_REPORT', 'ANALYTICS']
    };
    const SUB_TO_PARENT = {};
    for (const [parent, subs] of Object.entries(CATEGORY_GROUPS)) {
        for (const sub of subs) {
            SUB_TO_PARENT[sub] = parent;
        }
    }

    for (const meta of metadata) {
      let needsUpdate = false;
      const data = {};

      // Casing & Naming Fix
      if (meta.category) {
        const normalized = meta.category.toUpperCase().replace(/\s+/g, '_');
        if (meta.category !== normalized) {
          data.category = normalized;
          needsUpdate = true;
        }
      }

      // Parent Category Fix
      const currentCategory = data.category || meta.category || '';
      const catUpper = currentCategory.toUpperCase().replace(/\s+/g, '_');
      const correctParent = SUB_TO_PARENT[catUpper] || 'OTHER';
      
      const customFields = meta.customFields || {};
      if (customFields.parentCategory !== correctParent) {
        customFields.parentCategory = correctParent;
        data.customFields = customFields;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.documentMetadata.update({
          where: { id: meta.id },
          data
        });
        metaUpdates++;
      }
    }

    console.log(`✅ Updated ${metaUpdates} metadata records (naming & grouping).`);
    console.log('--- Migration Complete ---');

  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategories();

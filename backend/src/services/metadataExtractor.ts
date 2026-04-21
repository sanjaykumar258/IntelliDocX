/**
 * ═══════════════════════════════════════════════════════════
 * TYPE-AWARE METADATA EXTRACTOR v2
 * Always returns exactly 6 fields with label, value, isFallback
 * Handles both text-rich AND text-poor (scanned) documents
 * ═══════════════════════════════════════════════════════════
 */

import { getSchemaForCategory, MetadataFieldValue } from './metadataSchemas';
import Logger from '../utils/logger';

// ─── SHARED EXTRACTION HELPERS ───

function extractDates(text: string): string[] {
  if (!text || text.length < 5) return [];
  const patterns = [
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*\.?\s*\d{1,2},?\s*\d{4}\b/gi,
    /\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g,
    /\b(?:Q[1-4])\s+\d{4}\b/g,
    /\bFY\s?\d{4}[-–]\d{2,4}\b/gi,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  ];
  const found: string[] = [];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)];
}

function extractAmounts(text: string): string[] {
  if (!text || text.length < 5) return [];
  const patterns = [
    /(?:USD|INR|EUR|GBP|₹|\$|€|£)\s?[\d,]+(?:\.\d{1,2})?/gi,
    /[\d,]+(?:\.\d{1,2})?\s?(?:USD|INR|EUR|GBP|Crores?|Lakhs?|Million|Billion)/gi,
    /(?:Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?/gi,
    /(?:total|amount|sum|balance|salary|net|gross|revenue|income|cost|price|fee|charge|value|budget)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹|€|£)?\s*([\d,]+(?:\.\d{1,2})?)/gi,
  ];
  const found: string[] = [];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) found.push(...matches.map(m => m.trim()));
  }
  return [...new Set(found)].slice(0, 10);
}

function extractEmails(text: string): string[] {
  if (!text) return [];
  return (text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi) || []).slice(0, 5);
}

function extractPhones(text: string): string[] {
  if (!text) return [];
  return (text.match(/(?:\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/g) || []).slice(0, 5);
}

function pat(text: string, regex: RegExp): string | null {
  if (!text) return null;
  const m = text.match(regex);
  return m ? (m[1] || m[0]).trim().substring(0, 120) : null;
}

function extractCurrency(text: string): string {
  if (!text) return 'USD';
  if (/₹|INR|rupee|crore|lakh/i.test(text)) return 'INR';
  if (/€|EUR|euro/i.test(text)) return 'EUR';
  if (/£|GBP|pound/i.test(text)) return 'GBP';
  return 'USD';
}

function extractRiskLevel(text: string): string {
  if (!text) return 'LOW';
  const t = text.toLowerCase();
  const high = ['loss', 'deficit', 'negative', 'overdue', 'default', 'lawsuit', 'penalty', 'breach', 'fraud', 'critical'];
  const med = ['moderate', 'review', 'variance', 'outstanding', 'payable', 'liability', 'pending', 'risk', 'caution'];
  if (high.filter(k => t.includes(k)).length >= 2) return 'HIGH';
  if (med.filter(k => t.includes(k)).length >= 2) return 'MEDIUM';
  return 'LOW';
}

/** Extracts all name-like patterns from text */
function extractNames(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const patterns = [
    /(?:name|candidate|employee|applicant|prepared by|approved by|manager|author|reviewer|from|to|attn|attention|signed by|contact)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi,
    /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/g,
  ];
  for (const p of patterns) {
    let m; while ((m = p.exec(text)) !== null) { if (m[1]) found.push(m[1].trim()); }
  }
  return [...new Set(found)].slice(0, 10);
}

/** Extracts organization-like names from text */
function extractOrgs(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const patterns = [
    /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,4})\s+(?:Inc|Ltd|LLC|Corp|Pvt|Limited|Co\.?|Group|Holdings|Technologies|Solutions|Services|Enterprises|Systems|International|Associates|Consulting)/gi,
    /(?:company|organization|employer|firm|corporation|client|bank|institution|from|vendor|supplier|seller)[:\s]+([^\n,]{3,50})/gi,
  ];
  for (const p of patterns) {
    let m; while ((m = p.exec(text)) !== null) { if (m[1]) found.push(m[1].trim()); }
  }
  return [...new Set(found)].slice(0, 10);
}

/** Parse the filename to extract useful hints */
function parseFileName(fn: string): Record<string, string | null> {
  if (!fn) return {};
  // Clean up the filename
  const clean = fn.replace(/\.[^.]+$/, '') // remove extension
    .replace(/[_\-+]+/g, ' ')  // replace separators with spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  const dates = extractDates(clean);
  const amounts = extractAmounts(clean);
  
  return {
    fileTitle: clean.substring(0, 60),
    fileDate: dates[0] || null,
    fileAmount: amounts[0] || null,
  };
}

// ─── TYPE-SPECIFIC DISPATCHERS ───

function extractInvoice(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const orgs = extractOrgs(text);
  const names = extractNames(text);
  const fp = parseFileName(fileName);
  return {
    vendor_name: orgs[0] || pat(text, /(?:vendor|supplier|seller|from|billed by|issued by|bill from)[:\s]+([^\n]{3,50})/i) || names[0] || fp.fileTitle,
    invoice_number: pat(text, /(?:invoice|inv|bill)\s*(?:no\.?|number|#|:|id)\s*[:\-]?\s*([A-Z0-9][-A-Z0-9\/]{1,20})/i) || pat(text, /(?:Invoice|INV|BILL)[-_#]?(\d{3,10})/i) || pat(fileName, /(?:invoice|inv)[-_]?(\d{3,10})/i),
    invoice_date: pat(text, /(?:invoice date|date of invoice|dated|bill date)\s*[:\-]?\s*([^\n]{5,25})/i) || dates[0] || fp.fileDate,
    due_date: pat(text, /(?:due date|payment due|pay by|payable by)\s*[:\-]?\s*([^\n]{5,25})/i) || (dates.length > 1 ? dates[1] : null),
    total_amount: pat(text, /(?:total|grand total|amount due|net amount|balance due|total amount)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)/i) || amounts[amounts.length - 1] || fp.fileAmount,
    gst_tax_number: pat(text, /\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1})\b/) || pat(text, /(?:GST|GSTIN|TIN|VAT|PAN|TAX|TRN)\s*(?:No\.?|ID|#|Number)?\s*[:\-]?\s*([A-Z0-9]{5,15})/i),
  };
}

function extractContract(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const orgs = extractOrgs(text);
  const names = extractNames(text);
  const fp = parseFileName(fileName);
  return {
    party_one: pat(text, /(?:between|party\s*(?:a|1|one|of the first)|first party|employer|licensor|disclosing)\s*[:\-]?\s*([^\n,]{3,60})/i) || orgs[0] || names[0] || fp.fileTitle,
    party_two: pat(text, /(?:and\s+(?:party)?|party\s*(?:b|2|two|of the second)|second party|employee|licensee|receiving)\s*[:\-]?\s*([^\n,]{3,60})/i) || orgs[1] || names[1],
    contract_date: pat(text, /(?:date(?:d)?|entered into|executed on|signed on|agreement date)\s*[:\-]?\s*([^\n]{5,25})/i) || dates[0] || fp.fileDate,
    effective_date: pat(text, /(?:effective|commencement|start(?:ing)?)\s*(?:date)?\s*[:\-]?\s*([^\n]{5,25})/i) || (dates.length > 1 ? dates[1] : null),
    contract_value: pat(text, /(?:value|consideration|total|amount|fee|compensation|salary)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)/i) || amounts[0],
    expiry_date: pat(text, /(?:expir|terminat|end\s*date|valid\s*(?:until|till|through)|conclud)\s*[:\-]?\s*([^\n]{5,25})/i) || (dates.length > 2 ? dates[dates.length - 1] : null),
  };
}

function extractResume(text: string, fileName: string): Record<string, string | null> {
  const emails = extractEmails(text);
  const phones = extractPhones(text);
  const names = extractNames(text);
  const fp = parseFileName(fileName);
  // Try to find name from first non-empty line (common resume pattern)
  const firstLine = (text || '').split('\n').find(l => l.trim().length > 2 && l.trim().length < 50);
  return {
    candidate_name: names[0] || (firstLine && /^[A-Z][a-z]+ [A-Z]/.test(firstLine.trim()) ? firstLine.trim() : null) || fp.fileTitle,
    email: emails[0],
    phone: phones[0],
    total_experience: pat(text, /(\d+[\+]?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?(?:experience|exp|work))?)/i) || pat(text, /(?:experience|exp)\s*[:\-]?\s*(\d+\s*[\+]?\s*(?:years?|yrs?))/i),
    current_role: pat(text, /(?:position|role|designation|title|currently|objective|profile)\s*[:\-]?\s*([^\n]{3,60})/i) || pat(text, /(?:software|senior|junior|lead|manager|engineer|developer|analyst|designer|consultant|architect|intern|trainee)\s*[A-Za-z\s]{0,30}/i),
    top_skills: (() => {
      const skillPat = pat(text, /(?:skills?|technical skills?|core competencies|expertise|technologies|proficien)\s*[:\-]?\s*([\s\S]{10,300})/i);
      if (skillPat) {
        const skills = skillPat.split(/[,\n•|;\t▪►●○◦\-]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40).slice(0, 5);
        if (skills.length > 0) return skills.join(', ');
      }
      // Fallback: search for common tech keywords
      const techWords = ['Python', 'Java', 'JavaScript', 'React', 'Node', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'TypeScript', 'C++', 'HTML', 'CSS', 'Angular', 'Vue', 'MongoDB', 'Git', 'Linux', 'REST', 'API', 'Machine Learning', 'AI', 'Data Science', 'Excel', 'Power BI', 'Tableau'];
      const foundSkills = techWords.filter(w => text.toLowerCase().includes(w.toLowerCase()));
      return foundSkills.length > 0 ? foundSkills.slice(0, 5).join(', ') : null;
    })(),
  };
}

function extractReport(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const names = extractNames(text);
  const orgs = extractOrgs(text);
  const fp = parseFileName(fileName);
  return {
    report_title: pat(text, /^([^\n]{5,80})/m) || fp.fileTitle || 'Report',
    author: pat(text, /(?:prepared by|author|written by|submitted by|created by|analyst)[:\s]+([^\n]{3,50})/i) || names[0],
    report_date: pat(text, /(?:date|report date|period|dated)\s*[:\-]?\s*([^\n]{5,25})/i) || dates[0] || fp.fileDate,
    department: pat(text, /(?:department|division|unit|team|by|for)\s*[:\-]?\s*([^\n]{3,40})/i) || orgs[0],
    summary: (text || '').substring(0, 100).replace(/[\n\r]+/g, ' ').trim() || fp.fileTitle,
    risk_level: extractRiskLevel(text),
  };
}

function extractFinancial(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const orgs = extractOrgs(text);
  const fp = parseFileName(fileName);
  return {
    company_name: orgs[0] || pat(text, /(?:company|corporation|group|entity|bank|firm)[:\s]+([^\n]{3,50})/i) || fp.fileTitle,
    report_period: pat(text, /(?:period|quarter|year|fy|fiscal|for the (?:year|period|quarter))\s*[:\-]?\s*([^\n]{3,30})/i) || dates[0] || fp.fileDate,
    total_revenue: pat(text, /(?:revenue|total revenue|sales|turnover|total income|gross income)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹)?\s*([\d,]+\.?\d*)/i) || amounts[0],
    net_income: pat(text, /(?:net income|net profit|profit after tax|pat|net earnings|bottom line)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹)?\s*([\d,]+\.?\d*)/i) || (amounts.length > 1 ? amounts[1] : null),
    currency: extractCurrency(text),
    risk_level: extractRiskLevel(text),
  };
}

function extractBankStatement(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const orgs = extractOrgs(text);
  const fp = parseFileName(fileName);
  return {
    bank_name: orgs[0] || pat(text, /(?:bank|financial institution)[:\s]+([^\n]{3,50})/i) || fp.fileTitle,
    account_number: pat(text, /(?:account|a\/c|acct)\s*(?:no|number|#|:)\s*[:\-]?\s*([A-Z0-9\-\s]{4,25})/i),
    statement_period: dates.length >= 2 ? `${dates[0]} — ${dates[1]}` : (dates[0] || fp.fileDate),
    opening_balance: pat(text, /(?:opening|beginning|start)\s*(?:balance)?\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹)?\s*([\d,]+\.?\d*)/i) || amounts[0],
    closing_balance: pat(text, /(?:closing|ending|end)\s*(?:balance)?\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹)?\s*([\d,]+\.?\d*)/i) || (amounts.length > 1 ? amounts[amounts.length - 1] : null),
    currency: extractCurrency(text),
  };
}

function extractLegal(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const orgs = extractOrgs(text);
  const names = extractNames(text);
  const fp = parseFileName(fileName);
  const allParties = [...orgs, ...names];
  return {
    case_title: pat(text, /(?:IN THE MATTER OF|Re:|Case of|Title|Subject|Regarding)[:\s]*([^\n]{5,80})/i) || fp.fileTitle,
    parties: allParties.length >= 2 ? `${allParties[0]} vs ${allParties[1]}` : (allParties[0] || null),
    document_date: dates[0] || fp.fileDate,
    jurisdiction: pat(text, /(?:Supreme Court|High Court|District Court|Tribunal|Court of|State of|Republic of)[^\n]{0,40}/i) || pat(text, /(?:jurisdiction|governed by|laws of)\s*[:\-]?\s*([^\n]{3,40})/i),
    legal_ref: pat(text, /(?:Case|Ref|Reference|Suit|Petition|File|Docket)\s*(?:No\.?|Number|#)\s*[:\-]?\s*([\w\/\-]+)/i),
    document_type: (() => {
      const t = (text + ' ' + fileName).toLowerCase();
      const types: Record<string, string> = { 'affidavit': 'Affidavit', 'agreement': 'Agreement', 'deed': 'Deed', 'notice': 'Legal Notice', 'petition': 'Petition', 'judgment': 'Judgment', 'nda': 'NDA', 'non-disclosure': 'NDA', 'non disclosure': 'NDA', 'confidential': 'NDA', 'mou': 'MOU', 'memorandum': 'MOU', 'power of attorney': 'Power of Attorney', 'contract': 'Contract', 'license': 'License', 'compliance': 'Compliance', 'policy': 'Policy', 'terms': 'Terms of Service' };
      for (const [k, v] of Object.entries(types)) { if (t.includes(k)) return v; }
      return null;
    })(),
  };
}

function extractProject(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const names = extractNames(text);
  const fp = parseFileName(fileName);
  return {
    project_name: pat(text, /(?:project|initiative|program|proposal)\s*(?:name|title)?\s*[:\-]?\s*([^\n]{3,60})/i) || fp.fileTitle,
    project_manager: pat(text, /(?:manager|lead|owner|coordinator|supervised by|managed by|pm)\s*[:\-]?\s*([^\n]{3,40})/i) || names[0],
    start_date: pat(text, /(?:start|begin|commencement|kick[\s\-]?off)\s*(?:date)?\s*[:\-]?\s*([^\n]{5,25})/i) || dates[0] || fp.fileDate,
    deadline: pat(text, /(?:deadline|end date|due date|completion|target date|delivery)\s*[:\-]?\s*([^\n]{5,25})/i) || (dates.length > 1 ? dates[dates.length - 1] : null),
    budget: pat(text, /(?:budget|cost|value|total|estimated cost)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)/i) || amounts[0],
    status: (() => {
      const t = (text || '').toLowerCase();
      if (['completed', 'done', 'delivered', 'closed', 'finished'].some(k => t.includes(k))) return 'Completed';
      if (['on hold', 'paused', 'suspended', 'deferred'].some(k => t.includes(k))) return 'On Hold';
      if (['planning', 'proposed', 'draft', 'planned'].some(k => t.includes(k))) return 'Planning';
      if (['in progress', 'ongoing', 'active', 'underway', 'started'].some(k => t.includes(k))) return 'In Progress';
      return null;
    })(),
  };
}

function extractHR(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const amounts = extractAmounts(text);
  const names = extractNames(text);
  const orgs = extractOrgs(text);
  const fp = parseFileName(fileName);
  return {
    employee_name: pat(text, /(?:employee|candidate|name|mr\.|mrs\.|ms\.)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i) || names[0] || fp.fileTitle,
    designation: pat(text, /(?:designation|position|role|title|grade|job title)\s*[:\-]?\s*([^\n]{3,40})/i),
    department: pat(text, /(?:department|division|unit|team|branch)\s*[:\-]?\s*([^\n]{3,40})/i) || orgs[0],
    joining_date: pat(text, /(?:joining|start|commencement|effective|from)\s*(?:date)?\s*[:\-]?\s*([^\n]{5,25})/i) || dates[0] || fp.fileDate,
    salary: pat(text, /(?:salary|ctc|compensation|package|stipend|gross|net pay|take home|emolument)\s*[:\-]?\s*(?:Rs\.?|INR|USD|\$|₹|€|£)?\s*([\d,]+\.?\d*)/i) || amounts[0],
    approved_by: pat(text, /(?:approved by|authorized by|signed by|hr manager|manager|director)\s*[:\-]?\s*([^\n]{3,40})/i) || names[1],
  };
}

function extractOther(text: string, fileName: string): Record<string, string | null> {
  const dates = extractDates(text);
  const names = extractNames(text);
  const orgs = extractOrgs(text);
  const fp = parseFileName(fileName);
  return {
    title: pat(text, /^([^\n]{3,80})/m) || fp.fileTitle || fileName,
    author: names[0],
    date: dates[0] || fp.fileDate,
    organization: orgs[0],
    summary: (text || '').substring(0, 100).replace(/[\n\r]+/g, ' ').trim() || fp.fileTitle,
    risk_level: extractRiskLevel(text),
  };
}

// ─── MAIN DISPATCHER ───

type ExtractorFn = (text: string, fileName: string) => Record<string, string | null>;

const DISPATCHERS: Record<string, ExtractorFn> = {
  INVOICE: extractInvoice, RECEIPT: extractInvoice, PURCHASE_ORDER: extractInvoice, QUOTATION: extractInvoice, BILL: extractInvoice,
  CONTRACT: extractContract, AGREEMENT: extractContract, NDA: extractContract, LICENSE: extractContract, PERMIT: extractContract, MOU: extractContract,
  RESUME: extractResume, CV: extractResume, COVER_LETTER: extractResume, PORTFOLIO: extractResume,
  REPORT: extractReport, AUDIT_REPORT: extractReport, SALES_REPORT: extractReport, PROJECT_REPORT: extractReport, MARKET_ANALYSIS: extractReport, RESEARCH: extractReport, MEETING_NOTES: extractReport, PRESENTATION: extractReport,
  FINANCIAL_STATEMENT: extractFinancial, TAX_DOCUMENT: extractFinancial, EXPENSE_REPORT: extractFinancial, INVESTMENT_RECORD: extractFinancial, BUDGET: extractFinancial,
  BANK_STATEMENT: extractBankStatement,
  LEGAL_NOTICE: extractLegal, COMPLIANCE: extractLegal, REGULATION: extractLegal, POLICY: extractLegal, TERMS_OF_SERVICE: extractLegal, PRIVACY_POLICY: extractLegal,
  PROJECT_PLAN: extractProject, PROPOSAL: extractProject, TECHNICAL_DOC: extractProject, SRS: extractProject, SPECIFICATION: extractProject,
  OFFER_LETTER: extractHR, EMPLOYEE_RECORD: extractHR, PAYSLIP: extractHR, PERFORMANCE_REVIEW: extractHR, ID_PROOF: extractHR, LEAVE_APPLICATION: extractHR, APPRAISAL: extractHR, PAYROLL: extractHR,
  LETTER: extractOther, MEMO: extractOther, NOTICE: extractOther, CIRCULAR: extractOther, ANNOUNCEMENT: extractOther,
};

/**
 * Main entry point. Always returns exactly 6 metadata fields.
 * Each field has: { label, value, isFallback }
 */
export function extractTypedMetadata(
  text: string, 
  category: string, 
  fileName: string = ''
): Record<string, MetadataFieldValue> {
  const upper = (category || 'OTHER').toUpperCase().replace(/\s+/g, '_');
  const schema = getSchemaForCategory(upper);
  const dispatcher = DISPATCHERS[upper] || extractOther;

  let raw: Record<string, string | null>;
  try {
    raw = dispatcher(text || '', fileName || '');
  } catch (e: any) {
    Logger.warn(`[MetadataExtractor] Dispatch failed for ${upper}: ${e.message}`);
    raw = {};
  }

  const result: Record<string, MetadataFieldValue> = {};
  for (const field of schema) {
    const rawVal = raw[field.key];
    const isEmpty = !rawVal || (typeof rawVal === 'string' && !rawVal.trim());
    result[field.key] = {
      label: field.label,
      value: isEmpty ? field.fallback : String(rawVal).substring(0, 200),
      isFallback: isEmpty,
    };
  }

  return result; // always exactly 6 keys
}

/**
 * ═══════════════════════════════════════════════════════════
 * METADATA SCHEMAS — Always exactly 6 fields per doc type
 * ═══════════════════════════════════════════════════════════
 */

export interface MetadataFieldDef {
  key: string;
  label: string;
  fallback: string;
}

export interface MetadataFieldValue {
  label: string;
  value: string;
  isFallback: boolean;
}

export const METADATA_SCHEMAS: Record<string, MetadataFieldDef[]> = {

  INVOICE: [
    { key: 'vendor_name',    label: 'Vendor',        fallback: 'Not specified' },
    { key: 'invoice_number', label: 'Invoice No.',   fallback: 'Not detected' },
    { key: 'invoice_date',   label: 'Invoice Date',  fallback: 'Not detected' },
    { key: 'due_date',       label: 'Due Date',      fallback: 'Not detected' },
    { key: 'total_amount',   label: 'Total Amount',  fallback: 'Not found' },
    { key: 'gst_tax_number', label: 'GST / Tax No.', fallback: 'Not found' },
  ],

  RECEIPT: [
    { key: 'vendor_name',    label: 'Received From', fallback: 'Not specified' },
    { key: 'receipt_number', label: 'Receipt No.',   fallback: 'Not detected' },
    { key: 'receipt_date',   label: 'Receipt Date',  fallback: 'Not detected' },
    { key: 'payment_mode',   label: 'Payment Mode',  fallback: 'Not detected' },
    { key: 'total_amount',   label: 'Amount Paid',   fallback: 'Not found' },
    { key: 'transaction_id', label: 'Transaction ID', fallback: 'Not found' },
  ],

  CONTRACT: [
    { key: 'party_one',      label: 'Party A',        fallback: 'Not specified' },
    { key: 'party_two',      label: 'Party B',        fallback: 'Not specified' },
    { key: 'contract_date',  label: 'Contract Date',  fallback: 'Not detected' },
    { key: 'effective_date', label: 'Effective Date',  fallback: 'Not detected' },
    { key: 'contract_value', label: 'Contract Value',  fallback: 'Not found' },
    { key: 'expiry_date',    label: 'Expiry Date',     fallback: 'Not detected' },
  ],

  NDA: [
    { key: 'party_one',      label: 'Disclosing Party', fallback: 'Not specified' },
    { key: 'party_two',      label: 'Receiving Party',  fallback: 'Not specified' },
    { key: 'effective_date', label: 'Effective Date',    fallback: 'Not detected' },
    { key: 'expiry_date',    label: 'Expiry Date',       fallback: 'Not detected' },
    { key: 'jurisdiction',   label: 'Jurisdiction',      fallback: 'Not detected' },
    { key: 'governing_law',  label: 'Governing Law',     fallback: 'Not detected' },
  ],

  RESUME: [
    { key: 'candidate_name',   label: 'Candidate',    fallback: 'Not detected' },
    { key: 'email',            label: 'Email',        fallback: 'Not found' },
    { key: 'phone',            label: 'Phone',        fallback: 'Not found' },
    { key: 'total_experience', label: 'Experience',   fallback: 'Not detected' },
    { key: 'current_role',     label: 'Current Role', fallback: 'Not detected' },
    { key: 'top_skills',       label: 'Key Skills',   fallback: 'Not detected' },
  ],

  REPORT: [
    { key: 'report_title', label: 'Report Title', fallback: 'Untitled Report' },
    { key: 'author',       label: 'Author',       fallback: 'Not detected' },
    { key: 'report_date',  label: 'Report Date',  fallback: 'Not detected' },
    { key: 'department',   label: 'Department',   fallback: 'Not specified' },
    { key: 'summary',      label: 'Summary',      fallback: 'No summary found' },
    { key: 'risk_level',   label: 'Risk Level',   fallback: 'LOW' },
  ],

  FINANCIAL_STATEMENT: [
    { key: 'company_name',  label: 'Company',       fallback: 'Not specified' },
    { key: 'report_period', label: 'Period',         fallback: 'Not detected' },
    { key: 'total_revenue', label: 'Total Revenue',  fallback: 'Not found' },
    { key: 'net_income',    label: 'Net Income',     fallback: 'Not found' },
    { key: 'currency',      label: 'Currency',       fallback: 'USD' },
    { key: 'risk_level',    label: 'Risk Level',     fallback: 'LOW' },
  ],

  BANK_STATEMENT: [
    { key: 'bank_name',       label: 'Bank',            fallback: 'Not specified' },
    { key: 'account_number',  label: 'Account No.',     fallback: 'Not detected' },
    { key: 'statement_period',label: 'Period',           fallback: 'Not detected' },
    { key: 'opening_balance', label: 'Opening Balance',  fallback: 'Not found' },
    { key: 'closing_balance', label: 'Closing Balance',  fallback: 'Not found' },
    { key: 'currency',        label: 'Currency',         fallback: 'USD' },
  ],

  LEGAL_NOTICE: [
    { key: 'case_title',     label: 'Case / Title',   fallback: 'Not specified' },
    { key: 'parties',        label: 'Parties',        fallback: 'Not detected' },
    { key: 'document_date',  label: 'Document Date',  fallback: 'Not detected' },
    { key: 'jurisdiction',   label: 'Jurisdiction',   fallback: 'Not detected' },
    { key: 'legal_ref',      label: 'Reference No.',  fallback: 'Not found' },
    { key: 'document_type',  label: 'Legal Doc Type', fallback: 'General Legal' },
  ],

  COMPLIANCE: [
    { key: 'standard',      label: 'Standard',        fallback: 'Not specified' },
    { key: 'organization',  label: 'Organization',    fallback: 'Not detected' },
    { key: 'audit_date',    label: 'Audit Date',      fallback: 'Not detected' },
    { key: 'compliance_status', label: 'Status',      fallback: 'Not detected' },
    { key: 'findings',      label: 'Key Findings',    fallback: 'None noted' },
    { key: 'risk_level',    label: 'Risk Level',      fallback: 'LOW' },
  ],

  POLICY: [
    { key: 'policy_title',  label: 'Policy Title',    fallback: 'Untitled Policy' },
    { key: 'organization',  label: 'Organization',    fallback: 'Not specified' },
    { key: 'effective_date',label: 'Effective Date',   fallback: 'Not detected' },
    { key: 'version',       label: 'Version',          fallback: 'Not detected' },
    { key: 'approved_by',   label: 'Approved By',      fallback: 'Not specified' },
    { key: 'scope',         label: 'Scope',            fallback: 'Organization-wide' },
  ],

  PROJECT_PLAN: [
    { key: 'project_name',    label: 'Project Name',    fallback: 'Untitled Project' },
    { key: 'project_manager', label: 'Project Manager', fallback: 'Not specified' },
    { key: 'start_date',      label: 'Start Date',      fallback: 'Not detected' },
    { key: 'deadline',        label: 'Deadline',        fallback: 'Not detected' },
    { key: 'budget',          label: 'Budget',          fallback: 'Not found' },
    { key: 'status',          label: 'Status',          fallback: 'In Progress' },
  ],

  PROPOSAL: [
    { key: 'proposal_title',  label: 'Proposal Title',  fallback: 'Untitled Proposal' },
    { key: 'submitted_by',    label: 'Submitted By',    fallback: 'Not specified' },
    { key: 'submitted_to',    label: 'Submitted To',    fallback: 'Not specified' },
    { key: 'proposal_date',   label: 'Date',            fallback: 'Not detected' },
    { key: 'budget',          label: 'Budget',           fallback: 'Not found' },
    { key: 'status',          label: 'Status',           fallback: 'Pending' },
  ],

  OFFER_LETTER: [
    { key: 'employee_name',  label: 'Employee',       fallback: 'Not specified' },
    { key: 'designation',    label: 'Designation',    fallback: 'Not detected' },
    { key: 'department',     label: 'Department',     fallback: 'Not specified' },
    { key: 'joining_date',   label: 'Joining Date',   fallback: 'Not detected' },
    { key: 'salary',         label: 'CTC / Salary',   fallback: 'Not found' },
    { key: 'approved_by',    label: 'Approved By',    fallback: 'Not specified' },
  ],

  PAYSLIP: [
    { key: 'employee_name',  label: 'Employee',       fallback: 'Not specified' },
    { key: 'employee_id',    label: 'Employee ID',    fallback: 'Not detected' },
    { key: 'pay_period',     label: 'Pay Period',     fallback: 'Not detected' },
    { key: 'gross_salary',   label: 'Gross Salary',   fallback: 'Not found' },
    { key: 'deductions',     label: 'Deductions',     fallback: 'Not found' },
    { key: 'net_salary',     label: 'Net Salary',     fallback: 'Not found' },
  ],

  PERFORMANCE_REVIEW: [
    { key: 'employee_name',  label: 'Employee',       fallback: 'Not specified' },
    { key: 'reviewer',       label: 'Reviewer',       fallback: 'Not specified' },
    { key: 'review_period',  label: 'Review Period',  fallback: 'Not detected' },
    { key: 'rating',         label: 'Rating',         fallback: 'Not detected' },
    { key: 'strengths',      label: 'Strengths',      fallback: 'Not noted' },
    { key: 'improvements',   label: 'Areas to Improve', fallback: 'Not noted' },
  ],

  OTHER: [
    { key: 'title',        label: 'Title',        fallback: 'Untitled' },
    { key: 'author',       label: 'Author',       fallback: 'Not detected' },
    { key: 'date',         label: 'Date',         fallback: 'Not detected' },
    { key: 'organization', label: 'Organization', fallback: 'Not specified' },
    { key: 'summary',      label: 'Summary',      fallback: 'No summary available' },
    { key: 'risk_level',   label: 'Risk Level',   fallback: 'LOW' },
  ],
};

// Map sub-categories to the correct schema key
const CATEGORY_TO_SCHEMA: Record<string, string> = {
  'INVOICE': 'INVOICE', 'RECEIPT': 'RECEIPT', 'PURCHASE_ORDER': 'INVOICE',
  'CONTRACT': 'CONTRACT', 'AGREEMENT': 'CONTRACT', 'NDA': 'NDA', 'LICENSE': 'CONTRACT',
  'RESUME': 'RESUME', 'CV': 'RESUME', 'COVER_LETTER': 'RESUME',
  'REPORT': 'REPORT', 'AUDIT_REPORT': 'REPORT', 'SALES_REPORT': 'REPORT',
  'PROJECT_REPORT': 'REPORT', 'MARKET_ANALYSIS': 'REPORT',
  'FINANCIAL_STATEMENT': 'FINANCIAL_STATEMENT', 'BANK_STATEMENT': 'BANK_STATEMENT',
  'TAX_DOCUMENT': 'FINANCIAL_STATEMENT', 'EXPENSE_REPORT': 'FINANCIAL_STATEMENT',
  'LEGAL_NOTICE': 'LEGAL_NOTICE', 'COMPLIANCE': 'COMPLIANCE', 'POLICY': 'POLICY',
  'PROJECT_PLAN': 'PROJECT_PLAN', 'PROPOSAL': 'PROPOSAL',
  'TECHNICAL_DOC': 'PROJECT_PLAN', 'MEETING_NOTES': 'REPORT', 'PRESENTATION': 'REPORT',
  'OFFER_LETTER': 'OFFER_LETTER', 'PAYSLIP': 'PAYSLIP',
  'PERFORMANCE_REVIEW': 'PERFORMANCE_REVIEW', 'LEAVE_APPLICATION': 'OFFER_LETTER',
  'LETTER': 'OTHER', 'MEMO': 'OTHER', 'NOTICE': 'OTHER',
};

export function getSchemaForCategory(category: string): MetadataFieldDef[] {
  const upper = (category || 'OTHER').toUpperCase().replace(/\s+/g, '_');
  const schemaKey = CATEGORY_TO_SCHEMA[upper] || upper;
  return METADATA_SCHEMAS[schemaKey] || METADATA_SCHEMAS['OTHER'];
}

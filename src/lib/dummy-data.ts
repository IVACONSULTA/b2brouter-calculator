import { buildRuleDisplayGroups, type CalcRuleRow } from './calculator-rule-groups';

// ─── Calculation Profiles (Country + Provider combos) ────────────────────────

export const DUMMY_PROFILES = [
  {
    id: 'profile-fr-b2b-1',
    country: { code: 'FR', name: 'France' },
    provider: { name: 'B2Brouter', type: 'PA' },
    version: 'v1.0',
    currency: 'EUR',
    status: 'active' as const,
    active_from: '2025-01-01',
    created_at: '2024-11-15',
    rules_count: 5,
    plans_count: 3,
    analysis_id: 'analysis-fr-001',
  },
  {
    id: 'profile-es-b2b-1',
    country: { code: 'ES', name: 'Spain' },
    provider: { name: 'B2Brouter', type: 'PA' },
    version: 'v1.0',
    currency: 'EUR',
    status: 'pending_approval' as const,
    active_from: null,
    created_at: '2025-12-10',
    rules_count: 5,
    plans_count: 3,
    analysis_id: 'analysis-es-001',
  },
  {
    id: 'profile-it-pdp-1',
    country: { code: 'IT', name: 'Italy' },
    provider: { name: 'Aruba PEC', type: 'PDP' },
    version: 'v0.1',
    currency: 'EUR',
    status: 'draft' as const,
    active_from: null,
    created_at: '2026-03-22',
    rules_count: 2,
    plans_count: 1,
    analysis_id: null,
  },
  {
    id: 'profile-de-sap-1',
    country: { code: 'DE', name: 'Germany' },
    provider: { name: 'SAP DRC', type: 'PA' },
    version: 'v2.0',
    currency: 'EUR',
    status: 'active' as const,
    active_from: '2025-07-01',
    created_at: '2024-08-20',
    rules_count: 4,
    plans_count: 4,
    analysis_id: 'analysis-de-002',
  },
  {
    id: 'profile-de-sap-0',
    country: { code: 'DE', name: 'Germany' },
    provider: { name: 'SAP DRC', type: 'PA' },
    version: 'v1.0',
    currency: 'EUR',
    status: 'archived' as const,
    active_from: '2024-01-01',
    created_at: '2023-10-10',
    rules_count: 6,
    plans_count: 3,
    analysis_id: 'analysis-de-001',
  },
];

// ─── Documents ────────────────────────────────────────────────────────────────

export const DUMMY_DOCUMENTS = [
  {
    id: 'doc-001',
    filename: 'pricing_b2brouter_fr.pdf',
    document_type: 'provider_pricing',
    description: 'B2Brouter official pricing sheet for France PA mandate',
    copyright_status: 'clear' as const,
    uploaded_at: '2024-11-18',
    size: '284 KB',
    selected: true,
  },
  {
    id: 'doc-002',
    filename: 'guide_einvoicing_fr.docx',
    document_type: 'transaction_guide',
    description: 'Transaction processing guide for French e-invoicing mandate',
    copyright_status: 'restricted' as const,
    uploaded_at: '2024-11-18',
    size: '512 KB',
    selected: true,
  },
  {
    id: 'doc-003',
    filename: 'decree_2024_fr.pdf',
    document_type: 'country_legal',
    description: "French e-invoicing decree (Ordonnance n° 2021-1190)",
    copyright_status: 'clear' as const,
    uploaded_at: '2024-11-19',
    size: '1.2 MB',
    selected: true,
  },
  {
    id: 'doc-004',
    filename: 'contract_b2brouter_2024.pdf',
    document_type: 'contract',
    description: 'Partnership contract with B2Brouter (AI opt-out clause detected)',
    copyright_status: 'blocked' as const,
    uploaded_at: '2024-11-19',
    size: '96 KB',
    selected: false,
  },
];

export const DOCUMENT_TYPES = [
  { value: 'provider_pricing', label: 'Provider Pricing Sheet' },
  { value: 'transaction_guide', label: 'Transaction Processing Guide' },
  { value: 'country_legal', label: 'Country Legal / Decree' },
  { value: 'contract', label: 'Contract / Commercial Agreement' },
  { value: 'commercial_confirmation', label: 'Commercial Confirmation' },
  { value: 'other', label: 'Other' },
];

// ─── Analysis ─────────────────────────────────────────────────────────────────

export const DUMMY_ANALYSES = [
  {
    id: 'analysis-fr-001',
    profile_id: 'profile-fr-b2b-1',
    country: 'France',
    provider: 'B2Brouter',
    created_at: '2024-11-20',
    status: 'completed' as const,
    rules_proposed: 6,
    rules_approved: 1,
    plans_proposed: 3,
    plans_approved: 1,
    pending_review: 4,
  },
  {
    id: 'analysis-es-001',
    profile_id: 'profile-es-b2b-1',
    country: 'Spain',
    provider: 'B2Brouter',
    created_at: '2026-01-08',
    status: 'pending_review' as const,
    rules_proposed: 5,
    rules_approved: 0,
    plans_proposed: 3,
    plans_approved: 0,
    pending_review: 8,
  },
  {
    id: 'analysis-de-002',
    profile_id: 'profile-de-sap-1',
    country: 'Germany',
    provider: 'SAP DRC',
    created_at: '2025-05-14',
    status: 'completed' as const,
    rules_proposed: 8,
    rules_approved: 8,
    plans_proposed: 4,
    plans_approved: 4,
    pending_review: 0,
  },
];

export const DUMMY_ANALYSIS_DETAIL = {
  id: 'analysis-fr-001',
  profile_id: 'profile-fr-b2b-1',
  country: 'France',
  provider: 'B2Brouter',
  version: 'v1.0',
  created_at: '2024-11-20T10:34:12Z',
  status: 'completed' as const,
  summary:
    'Analysis of B2Brouter France PA pricing documentation (Nov 2024). 6 transaction rules identified covering e-invoicing (issued/received), e-reporting, and payment flows. 3 commercial plans extracted with annual fees ranging from €480 to €1,200. One ambiguity detected regarding partial credit note treatment. No critical conflicts. All guardrails passed.',
  guardrail_audit: {
    eu_ai_act_check: 'passed',
    copyright_check: 'passed',
    processing_id: 'a3f9c2e1d840b7f6',
    document_count: 3,
    blocked_documents: ['contract_b2brouter_2024.pdf'],
    processing_timestamp: '2024-11-20T10:34:10Z',
  },
  rules: [
    {
      id: 'rule-001',
      input_key: 'issued_einvoicing',
      label: 'Issued e-invoicing invoices/year',
      direction: 'Issued',
      obligation: 'E-invoicing',
      operation_group: 'Domestic B2B invoices',
      pa_transactions_per_item: 1.5,
      reason: 'Each issued e-invoice generates 1 PA submission + 0.5 for the acknowledgement receipt.',
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt:
        'Each invoice transmission includes a submission and an acknowledgement, counted as 1.5 PA transactions per invoice.',
      confidence: 'high' as const,
      status: 'proposed' as const,
      manually_edited: false,
    },
    {
      id: 'rule-002',
      input_key: 'received_einvoicing',
      label: 'Received e-invoicing invoices/year',
      direction: 'Received',
      obligation: 'E-invoicing',
      operation_group: 'Domestic B2B invoices',
      pa_transactions_per_item: 1.0,
      reason: 'Each received e-invoice generates 1 PA delivery transaction.',
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt:
        'Reception of e-invoices via the platform counts as 1 PA transaction per document received.',
      confidence: 'high' as const,
      status: 'approved' as const,
      manually_edited: false,
    },
    {
      id: 'rule-003',
      input_key: 'issued_ereporting',
      label: 'Issued e-reporting transactions/year',
      direction: 'Issued',
      obligation: 'E-reporting',
      operation_group: 'B2C / cross-border flows',
      pa_transactions_per_item: 0.5,
      reason: 'E-reporting submissions are batched; approx. 0.5 PA transactions per reported transaction.',
      source_document: 'guide_einvoicing_fr.docx',
      source_excerpt:
        'E-reporting batches are transmitted at 0.5 PA transactions per reported transaction due to grouping.',
      confidence: 'medium' as const,
      status: 'proposed' as const,
      manually_edited: false,
    },
    {
      id: 'rule-004',
      input_key: 'received_ereporting',
      label: 'Received e-reporting transactions/year',
      direction: 'Received',
      obligation: 'E-reporting',
      operation_group: 'B2C / cross-border flows',
      pa_transactions_per_item: 0.3,
      reason: 'Lower PA cost for received e-reporting status updates.',
      source_document: 'guide_einvoicing_fr.docx',
      source_excerpt:
        'Received e-reporting status notifications are counted at 0.3 PA transactions each.',
      confidence: 'medium' as const,
      status: 'pending_confirmation' as const,
      manually_edited: false,
    },
    {
      id: 'rule-005',
      input_key: 'payment_ereporting',
      label: 'Payment e-reporting transactions/year',
      direction: 'Issued',
      obligation: 'Payment e-reporting',
      operation_group: 'Payment flows',
      pa_transactions_per_item: 0.2,
      reason: 'Payment e-reporting has minimal PA overhead.',
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt:
        'Payment reporting to the tax authority is billed at 0.2 PA transactions per payment event.',
      confidence: 'low' as const,
      status: 'proposed' as const,
      manually_edited: true,
    },
    {
      id: 'rule-006',
      input_key: 'credit_notes_issued',
      label: 'Credit notes issued/year',
      direction: 'Issued',
      obligation: 'E-invoicing',
      operation_group: 'Domestic B2B invoices',
      pa_transactions_per_item: 1.5,
      reason: 'Credit notes follow the same PA transaction model as invoices.',
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt:
        'Credit notes and corrective documents are processed identically to invoices at 1.5 PA transactions.',
      confidence: 'high' as const,
      status: 'rejected' as const,
      manually_edited: false,
    },
  ],
  plans: [
    {
      id: 'plan-001',
      plan_name: 'Starter',
      included_pa_transactions: 2400,
      annual_fee: 480,
      monthly_fee: 40,
      extra_transaction_cost: 0.2,
      confidence: 'high' as const,
      status: 'approved' as const,
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt: 'Starter plan: €480/year, 2,400 included PA transactions, €0.20/extra.',
    },
    {
      id: 'plan-002',
      plan_name: 'Professional',
      included_pa_transactions: 6000,
      annual_fee: 840,
      monthly_fee: 70,
      extra_transaction_cost: 0.18,
      confidence: 'high' as const,
      status: 'proposed' as const,
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt: 'Professional plan: €840/year, 6,000 included PA transactions, €0.18/extra.',
    },
    {
      id: 'plan-003',
      plan_name: 'Enterprise',
      included_pa_transactions: 12000,
      annual_fee: 1200,
      monthly_fee: 100,
      extra_transaction_cost: 0.15,
      confidence: 'high' as const,
      status: 'proposed' as const,
      source_document: 'pricing_b2brouter_fr.pdf',
      source_excerpt: 'Enterprise plan: €1,200/year, 12,000 included PA transactions, €0.15/extra.',
    },
  ],
  assumptions: [
    {
      id: 'assumption-001',
      key: 'b2c_treatment',
      value: 'Invoice by invoice',
      reason: 'Each B2C transaction is reported individually to the tax authority.',
      status: 'approved' as const,
      source_document: 'guide_einvoicing_fr.docx',
    },
    {
      id: 'assumption-002',
      key: 'cross_border_scope',
      value: 'EU + non-EU included in e-reporting',
      reason: 'Both EU and non-EU cross-border flows require e-reporting under French mandate.',
      status: 'proposed' as const,
      source_document: 'guide_einvoicing_fr.docx',
    },
  ],
  ambiguities: [
    {
      id: 'ambiguity-001',
      description:
        "Treatment of partial credit notes is not explicitly defined. Document §3.2 mentions 'corrective documents' but does not clarify if partial corrections follow the same 1.5× multiplier or a reduced rate.",
      affected_rules: ['rule-006'],
      source_documents: ['pricing_b2brouter_fr.pdf'],
    },
  ],
  conflicts: [],
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const DUMMY_USERS = [
  {
    id: 'user-001',
    email: 'admin@b2brouter.com',
    full_name: 'Admin User',
    role: 'admin' as const,
    company: 'B2Brouter Internal',
    company_type: 'internal' as const,
    active: true,
    created_at: '2024-01-15',
    ai_calls_used: 48,
    ai_limit: null,
  },
  {
    id: 'user-002',
    email: 'analyst@b2brouter.com',
    full_name: 'Sofia Analyst',
    role: 'internal' as const,
    company: 'B2Brouter Internal',
    company_type: 'internal' as const,
    active: true,
    created_at: '2024-03-20',
    ai_calls_used: 12,
    ai_limit: 50,
  },
  {
    id: 'user-003',
    email: 'client@acmecorp.com',
    full_name: 'Carlos Ruiz',
    role: 'client' as const,
    company: 'Acme Corp',
    company_type: 'client' as const,
    active: true,
    created_at: '2025-02-10',
    ai_calls_used: 3,
    ai_limit: 10,
  },
  {
    id: 'user-004',
    email: 'finance@globaltrade.eu',
    full_name: 'Anna Schmidt',
    role: 'client' as const,
    company: 'Global Trade Ltd',
    company_type: 'client' as const,
    active: false,
    created_at: '2025-05-01',
    ai_calls_used: 0,
    ai_limit: 10,
  },
  {
    id: 'user-005',
    email: 'ops@techsolutions.es',
    full_name: 'Marc Durand',
    role: 'client' as const,
    company: 'Tech Solutions SL',
    company_type: 'client' as const,
    active: true,
    created_at: '2025-09-15',
    ai_calls_used: 7,
    ai_limit: 10,
  },
];

// ─── Scenarios ────────────────────────────────────────────────────────────────

export const DUMMY_SCENARIOS = [
  {
    id: 'scenario-001',
    client_name: 'Acme Corp',
    country: 'France',
    provider: 'B2Brouter',
    profile_version: 'v1.0',
    recommended_plan: 'Professional',
    total_cost: 1218,
    created_at: '2026-04-25',
    created_by: 'analyst@b2brouter.com',
    has_summary: true,
  },
  {
    id: 'scenario-002',
    client_name: 'Global Trade Ltd',
    country: 'Germany',
    provider: 'SAP DRC',
    profile_version: 'v2.0',
    recommended_plan: 'Enterprise',
    total_cost: 2840,
    created_at: '2026-04-22',
    created_by: 'admin@b2brouter.com',
    has_summary: false,
  },
  {
    id: 'scenario-003',
    client_name: 'Tech Solutions SL',
    country: 'France',
    provider: 'B2Brouter',
    profile_version: 'v1.0',
    recommended_plan: 'Starter',
    total_cost: 480,
    created_at: '2026-04-18',
    created_by: 'analyst@b2brouter.com',
    has_summary: true,
  },
  {
    id: 'scenario-004',
    client_name: 'Nordic Supplies AB',
    country: 'France',
    provider: 'B2Brouter',
    profile_version: 'v1.0',
    recommended_plan: 'Enterprise',
    total_cost: 1510,
    created_at: '2026-04-10',
    created_by: 'admin@b2brouter.com',
    has_summary: false,
  },
];

// ─── Active profiles available to calculator ─────────────────────────────────

export const DUMMY_ACTIVE_PROFILES = DUMMY_PROFILES.filter(p => p.status === 'active');

// ─── Active transaction rules per profile (calculator inputs) ─────────────────

export const DUMMY_ACTIVE_RULES: Record<string, {
  id: string; input_key: string; label: string;
  direction: string; obligation: string; operation_group: string;
  pa_transactions_per_item: number; placeholder: number;
}[]> = {
  'profile-fr-b2b-1': [
    { id: 'rule-002', input_key: 'issued_einvoicing',    label: 'Issued e-invoicing invoices/year',        direction: 'Issued',   obligation: 'E-invoicing',         operation_group: 'Domestic B2B invoices', pa_transactions_per_item: 1.5, placeholder: 5000 },
    { id: 'rule-003', input_key: 'received_einvoicing',  label: 'Received e-invoicing invoices/year',      direction: 'Received', obligation: 'E-invoicing',         operation_group: 'Domestic B2B invoices', pa_transactions_per_item: 1.0, placeholder: 5000 },
    { id: 'rule-004', input_key: 'issued_ereporting',    label: 'Issued e-reporting transactions/year',    direction: 'Issued',   obligation: 'E-reporting',         operation_group: 'E-reporting flows', pa_transactions_per_item: 0.5, placeholder: 3000 },
    { id: 'rule-005', input_key: 'received_ereporting',  label: 'Received e-reporting transactions/year',  direction: 'Received', obligation: 'E-reporting',         operation_group: 'E-reporting flows', pa_transactions_per_item: 0.3, placeholder: 3000 },
    { id: 'rule-006', input_key: 'payment_ereporting',   label: 'Payment e-reporting transactions/year',   direction: 'Issued',   obligation: 'Payment e-reporting', operation_group: 'Payment e-reporting', pa_transactions_per_item: 0.2, placeholder: 2000 },
  ],
  'profile-de-sap-1': [
    { id: 'rule-de-01', input_key: 'issued_einvoicing',     label: 'Issued e-invoices/year (B2B domestic)',    direction: 'Issued',   obligation: 'E-invoicing', operation_group: 'B2B domestic', pa_transactions_per_item: 1.0, placeholder: 10000 },
    { id: 'rule-de-02', input_key: 'received_einvoicing',   label: 'Received e-invoices/year (B2B domestic)',  direction: 'Received', obligation: 'E-invoicing', operation_group: 'B2B domestic', pa_transactions_per_item: 0.8, placeholder: 10000 },
    { id: 'rule-de-03', input_key: 'crossborder_issued',    label: 'Cross-border issued invoices/year',        direction: 'Issued',   obligation: 'E-reporting', operation_group: 'Cross-border', pa_transactions_per_item: 0.5, placeholder: 2000 },
    { id: 'rule-de-04', input_key: 'crossborder_received',  label: 'Cross-border received invoices/year',      direction: 'Received', obligation: 'E-reporting', operation_group: 'Cross-border', pa_transactions_per_item: 0.4, placeholder: 2000 },
  ],
};

/** Calculator rows per profile — same merge grouping as `/calculator` (for demo counts). */
export function dummyCalculatorInputGroupsCount(profileId: string): number {
  const raw = DUMMY_ACTIVE_RULES[profileId];
  if (!raw?.length) return 0;
  const rows: CalcRuleRow[] = raw.map((r) => ({
    input_key: r.input_key,
    label: r.label,
    direction: r.direction,
    obligation: r.obligation,
    operation_group: r.operation_group ?? '',
    pa_transactions_per_item: r.pa_transactions_per_item,
    placeholder: 0,
  }));
  return buildRuleDisplayGroups(rows).length;
}

export const DUMMY_ACTIVE_PLANS: Record<string, {
  id: string; plan_name: string; annual_fee: number;
  included_pa_transactions: number; extra_transaction_cost: number; monthly_fee: number;
}[]> = {
  'profile-fr-b2b-1': [
    { id: 'plan-001', plan_name: 'Starter',      annual_fee: 480,  included_pa_transactions: 2400,  extra_transaction_cost: 0.20, monthly_fee: 40 },
    { id: 'plan-002', plan_name: 'Professional', annual_fee: 840,  included_pa_transactions: 6000,  extra_transaction_cost: 0.18, monthly_fee: 70 },
    { id: 'plan-003', plan_name: 'Enterprise',   annual_fee: 1200, included_pa_transactions: 12000, extra_transaction_cost: 0.15, monthly_fee: 100 },
  ],
  'profile-de-sap-1': [
    { id: 'plan-de-01', plan_name: 'Basic',        annual_fee: 600,  included_pa_transactions: 3000,  extra_transaction_cost: 0.22, monthly_fee: 50 },
    { id: 'plan-de-02', plan_name: 'Standard',     annual_fee: 1080, included_pa_transactions: 8000,  extra_transaction_cost: 0.18, monthly_fee: 90 },
    { id: 'plan-de-03', plan_name: 'Advanced',     annual_fee: 1800, included_pa_transactions: 16000, extra_transaction_cost: 0.14, monthly_fee: 150 },
    { id: 'plan-de-04', plan_name: 'Enterprise',   annual_fee: 3000, included_pa_transactions: 40000, extra_transaction_cost: 0.10, monthly_fee: 250 },
  ],
};

// ─── Scenario full result (for scenario detail page) ─────────────────────────

export const DUMMY_SCENARIO_RESULT = {
  id: 'scenario-001',
  client_name: 'Acme Corp',
  country: 'France',
  provider: 'B2Brouter',
  profile_id: 'profile-fr-b2b-1',
  profile_version: 'v1.0',
  currency: 'EUR',
  calculation_basis: 'PA transactions',
  created_at: '2026-04-25T14:22:00Z',
  created_by: 'analyst@b2brouter.com',
  inputs: {
    issued_einvoicing: 8000,
    received_einvoicing: 3000,
    issued_ereporting: 2000,
    received_ereporting: 1500,
    payment_ereporting: 5000,
  },
  transaction_breakdown: [
    { label: 'Issued e-invoicing invoices', direction: 'Issued',   obligation: 'E-invoicing',         volume: 8000, multiplier: 1.5, pa_transactions: 12000 },
    { label: 'Received e-invoicing invoices', direction: 'Received', obligation: 'E-invoicing',       volume: 3000, multiplier: 1.0, pa_transactions: 3000  },
    { label: 'Issued e-reporting transactions', direction: 'Issued', obligation: 'E-reporting',       volume: 2000, multiplier: 0.5, pa_transactions: 1000  },
    { label: 'Received e-reporting transactions', direction: 'Received', obligation: 'E-reporting',   volume: 1500, multiplier: 0.3, pa_transactions: 450   },
    { label: 'Payment e-reporting', direction: 'Issued',           obligation: 'Payment e-reporting', volume: 5000, multiplier: 0.2, pa_transactions: 1000  },
  ],
  total_pa_transactions: 17450,
  plan_comparison: [
    { plan_name: 'Starter',      annual_fee: 480,  included: 2400,  extra_cost: 0.20, extra_transactions: 15050, total_annual_cost: 3490.0,  recommended: false },
    { plan_name: 'Professional', annual_fee: 840,  included: 6000,  extra_cost: 0.18, extra_transactions: 11450, total_annual_cost: 2901.0,  recommended: false },
    { plan_name: 'Enterprise',   annual_fee: 1200, included: 12000, extra_cost: 0.15, extra_transactions: 5450,  total_annual_cost: 2017.5,  recommended: true  },
  ],
  recommended_plan: {
    plan_name: 'Enterprise',
    total_annual_cost: 2017.5,
    annual_fee: 1200,
    included_pa_transactions: 12000,
    extra_transaction_cost: 0.15,
    extra_transactions: 5450,
  },
  assumptions: [
    { key: 'b2c_treatment', value: 'Invoice by invoice' },
    { key: 'cross_border_scope', value: 'EU + non-EU included in e-reporting' },
  ],
  ai_summary: "Based on an estimated annual volume of 17,450 PA transactions, the recommended option is the **Enterprise plan** at €1,200/year. This plan includes 12,000 PA transactions and applies an excess rate of €0.15 per additional transaction, resulting in a total annual cost of approximately €2,017.50.\n\nCompared to the Professional plan (€2,901/year) and the Starter plan (€3,490/year), the Enterprise plan offers the most cost-effective structure for this volume profile — saving €883.50/year versus Professional and €1,472.50/year versus Starter.\n\nThe majority of PA transactions originate from issued e-invoicing activities (12,000 transactions, 69% of total annual consumption), followed by received e-invoicing (3,000) and payment e-reporting (1,000). The profile is based on B2Brouter France PA mandate rules, version v1.0, approved and active since January 2025.",
  has_summary: true,
};

// ─── Second example scenario (no AI summary yet) ─────────────────────────────

export const DUMMY_SCENARIO_RESULT_2 = {
  id: 'scenario-003',
  client_name: 'Tech Solutions SL',
  country: 'France',
  provider: 'B2Brouter',
  profile_id: 'profile-fr-b2b-1',
  profile_version: 'v1.0',
  currency: 'EUR',
  calculation_basis: 'PA transactions',
  created_at: '2026-04-18T10:05:00Z',
  created_by: 'analyst@b2brouter.com',
  inputs: {
    issued_einvoicing: 1000,
    received_einvoicing: 400,
    issued_ereporting: 200,
    received_ereporting: 100,
    payment_ereporting: 300,
  },
  transaction_breakdown: [
    { label: 'Issued e-invoicing invoices',      direction: 'Issued',   obligation: 'E-invoicing',         volume: 1000, multiplier: 1.5, pa_transactions: 1500 },
    { label: 'Received e-invoicing invoices',    direction: 'Received', obligation: 'E-invoicing',         volume: 400,  multiplier: 1.0, pa_transactions: 400  },
    { label: 'Issued e-reporting transactions',  direction: 'Issued',   obligation: 'E-reporting',         volume: 200,  multiplier: 0.5, pa_transactions: 100  },
    { label: 'Received e-reporting transactions',direction: 'Received', obligation: 'E-reporting',         volume: 100,  multiplier: 0.3, pa_transactions: 30   },
    { label: 'Payment e-reporting',              direction: 'Issued',   obligation: 'Payment e-reporting', volume: 300,  multiplier: 0.2, pa_transactions: 60   },
  ],
  total_pa_transactions: 2090,
  plan_comparison: [
    { plan_name: 'Starter',      annual_fee: 480,  included: 2400,  extra_cost: 0.20, extra_transactions: 0,   total_annual_cost: 480.0,  recommended: true  },
    { plan_name: 'Professional', annual_fee: 840,  included: 6000,  extra_cost: 0.18, extra_transactions: 0,   total_annual_cost: 840.0,  recommended: false },
    { plan_name: 'Enterprise',   annual_fee: 1200, included: 12000, extra_cost: 0.15, extra_transactions: 0,   total_annual_cost: 1200.0, recommended: false },
  ],
  recommended_plan: {
    plan_name: 'Starter',
    total_annual_cost: 480.0,
    annual_fee: 480,
    included_pa_transactions: 2400,
    extra_transaction_cost: 0.20,
    extra_transactions: 0,
  },
  assumptions: [
    { key: 'b2c_treatment', value: 'Invoice by invoice' },
  ],
  ai_summary: null,
  has_summary: false,
};

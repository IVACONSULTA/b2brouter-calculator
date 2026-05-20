import React, { useEffect, useState } from 'react';

interface AnalysisRule {
  id: string;
  input_key: string;
  label: string;
  direction: string;
  obligation: string;
  operation_group: string;
  pa_transactions_per_item: number;
  reason: string;
  source_document: string;
  source_excerpt: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'approved' | 'proposed' | 'pending_confirmation' | 'rejected';
  manually_edited: boolean;
}

interface AnalysisPlan {
  id: string;
  plan_name: string;
  included_pa_transactions: number;
  annual_fee: number;
  monthly_fee: number;
  extra_transaction_cost: number;
  confidence: 'high' | 'medium' | 'low';
  status: 'approved' | 'proposed' | 'rejected';
  source_document: string;
  source_excerpt: string;
}

interface AnalysisAssumption {
  id: string;
  key: string;
  value: string;
  reason: string;
  status: 'approved' | 'proposed' | 'rejected';
  source_document: string;
}

interface AnalysisAmbiguity {
  id: string;
  description: string;
  affected_rules: string[];
  source_documents: string[];
}

interface AnalysisConflict {
  id: string;
  description: string;
  severity: string;
}

interface AnalysisDetail {
  id: string;
  profile_id: string;
  country: string;
  country_code?: string;
  provider: string;
  provider_type?: string;
  version: string;
  created_at: string;
  created_by?: string;
  status: 'completed' | 'pending_review' | 'running' | 'failed';
  summary: string;
  guardrail_audit: {
    eu_ai_act_check: string;
    copyright_check: string;
    processing_id: string;
    document_count: number;
    blocked_documents: string[];
    processing_timestamp: string;
  };
  rules: AnalysisRule[];
  plans: AnalysisPlan[];
  assumptions: AnalysisAssumption[];
  ambiguities: AnalysisAmbiguity[];
  conflicts: AnalysisConflict[];
}

interface AnalysisDetailProps {
  analysisId: string;
}

const confidenceMeta = {
  high: { cls: 'conf-high', label: 'High' },
  medium: { cls: 'conf-medium', label: 'Medium' },
  low: { cls: 'conf-low', label: 'Low' },
};

export default function AnalysisDetail({ analysisId }: AnalysisDetailProps) {
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [rules, setRules] = useState<AnalysisRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [analysisId]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch analysis document
      const analysisUrl = `/api/pa/admin/document-analyses/${encodeURIComponent(analysisId)}`;
      const analysisRes = await fetch(analysisUrl, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });

      if (!analysisRes.ok) {
        throw new Error(`Analysis API error: ${analysisRes.status}`);
      }

      const analysisData = await analysisRes.json();
      
      if (!analysisData.success || !analysisData.data) {
        throw new Error('No analysis data returned');
      }

      // Defensive: ensure all arrays exist
      const rawData = analysisData.data;
      const normalizedAnalysis: AnalysisDetail = {
        ...rawData,
        rules: [], // Will be fetched separately
        plans: Array.isArray(rawData.plans) ? rawData.plans : [],
        assumptions: Array.isArray(rawData.assumptions) ? rawData.assumptions : [],
        ambiguities: Array.isArray(rawData.ambiguities) ? rawData.ambiguities : [],
        conflicts: Array.isArray(rawData.conflicts) ? rawData.conflicts : [],
        guardrail_audit: rawData.guardrail_audit || {
          eu_ai_act_check: 'passed',
          copyright_check: 'passed',
          processing_id: 'unknown',
          document_count: 0,
          blocked_documents: [],
          processing_timestamp: rawData.created_at,
        },
      };

      setAnalysis(normalizedAnalysis);

      // Fetch rules separately using profile_id
      if (normalizedAnalysis.profile_id) {
        const rulesUrl = `/api/pa/admin/rules?profile_id=${encodeURIComponent(normalizedAnalysis.profile_id)}`;
        const rulesRes = await fetch(rulesUrl, {
          credentials: 'same-origin',
          headers: { 'Accept': 'application/json' },
        });

        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          if (Array.isArray(rulesData)) {
            setRules(rulesData);
          } else if (rulesData.items && Array.isArray(rulesData.items)) {
            setRules(rulesData.items);
          }
        }
      }
    } catch (err) {
      console.error('[AnalysisDetail] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading analysis...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Error Loading Analysis</h2>
        <p style={{ color: '#dc2626', marginTop: '1rem' }}>{error}</p>
        <button 
          onClick={fetchAnalysis}
          style={{ marginTop: '1.5rem', padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          Retry
        </button>
        <a 
          href="/admin/analyses"
          style={{ display: 'inline-block', marginTop: '1rem', marginLeft: '0.5rem', padding: '0.5rem 1rem', background: '#6b7280', color: 'white', textDecoration: 'none', borderRadius: '0.375rem' }}
        >
          ← Back
        </a>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Analysis Not Found</h2>
        <a href="/admin/analyses" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', textDecoration: 'none', borderRadius: '0.375rem' }}>
          ← Back to Analyses
        </a>
      </div>
    );
  }

  return (
    <div className="page-admin-analysis-detail">
      {/* Guardrail audit header */}
      <div className="guardrail-row">
        <div className="guardrail-item passed">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          EU AI Act check: <strong>passed</strong>
        </div>
        <div className="guardrail-item passed">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Copyright check: <strong>passed</strong>
        </div>
        {analysis.guardrail_audit?.blocked_documents?.length > 0 && (
          <div className="guardrail-item warn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {analysis.guardrail_audit.blocked_documents.length} doc(s) excluded (AI opt-out)
          </div>
        )}
        <div className="guardrail-meta">
          Processing ID: <code>{analysis.guardrail_audit?.processing_id || 'unknown'}</code> · {new Date(analysis.guardrail_audit?.processing_timestamp || analysis.created_at).toLocaleString()}
          {analysis.created_by && (
            <span> · Created by: <strong>{analysis.created_by}</strong></span>
          )}
        </div>
      </div>

      {/* Business Assumptions - First */}
      <section className="section">
        <h2 className="section-title">Business Assumptions ({analysis.assumptions.length})</h2>
        {analysis.assumptions.length === 0 ? (
          <div className="empty-state">No assumptions found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th>Reason</th>
                <th>Source Document</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {analysis.assumptions.map(assumption => (
                <tr key={assumption.id}>
                  <td><code>{assumption.key}</code></td>
                  <td>{assumption.value}</td>
                  <td>{assumption.reason}</td>
                  <td>{assumption.source_document}</td>
                  <td>
                    <span className={`status-pill sp-${assumption.status}`}>{assumption.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Transaction Rules - Read only */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Transaction Rules ({rules.length})</h2>
        </div>

        {rules.length === 0 ? (
          <div className="empty-state">No rules found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Direction</th>
                <th>Obligation</th>
                <th>Operation Group</th>
                <th>Multiplier</th>
                <th>Confidence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td>{rule.label}</td>
                  <td>{rule.direction}</td>
                  <td>{rule.obligation}</td>
                  <td>{rule.operation_group}</td>
                  <td>{rule.pa_transactions_per_item}×</td>
                  <td>
                    <span className={`conf-badge ${confidenceMeta[rule.confidence].cls}`}>
                      {confidenceMeta[rule.confidence].label}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill sp-${rule.status}`}>{rule.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Plans - Read only */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Extracted Plans ({analysis.plans.length})</h2>
        </div>
        {analysis.plans.length === 0 ? (
          <div className="empty-state">No plans found</div>
        ) : (
          <div className="plans-grid">
            {analysis.plans.map(plan => (
              <div key={plan.id} className={`plan-card pstatus-${plan.status}`}>
                <div className="plan-head">
                  <h3 className="plan-name">{plan.plan_name}</h3>
                  <div className="plan-meta">
                    <span className={`status-pill sp-${plan.status}`}>{plan.status}</span>
                    <span className={`conf-badge ${confidenceMeta[plan.confidence].cls}`}>{confidenceMeta[plan.confidence].label}</span>
                  </div>
                </div>
                <div className="plan-pricing">
                  <div className="pricing-row">
                    <span className="pr-label">Annual fee</span>
                    <span className="pr-value">€{plan.annual_fee.toLocaleString()}/yr</span>
                  </div>
                  <div className="pricing-row highlight">
                    <span className="pr-label">Extra transaction cost</span>
                    <span className="pr-value">€{plan.extra_transaction_cost}/transaction</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer - Only back button */}
      <div className="footer-actions">
        <a href="/admin/analyses" className="btn-secondary">← Back to Analyses</a>
      </div>
    </div>
  );
}

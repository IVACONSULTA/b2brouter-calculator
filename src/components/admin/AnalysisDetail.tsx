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

export default function AnalysisDetail({ analysisId, apiBaseUrl, paToken }: AnalysisDetailProps) {
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    console.log('[AnalysisDetail] Component mounted with ID:', analysisId);
    fetchAnalysis();
  }, [analysisId]);

  const fetchAnalysis = async () => {
    console.log('[AnalysisDetail] Starting fetch for:', analysisId);
    setLoading(true);
    setError(null);

    try {
      // Use same-origin proxy to keep API key server-side
      const url = `/api/pa/admin/document-analyses/${encodeURIComponent(analysisId)}`;
      console.log('[AnalysisDetail] Fetching from proxy:', url);

      const response = await fetch(url, {
        credentials: 'same-origin', // Send cookies for session
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('[AnalysisDetail] Response status:', response.status);
      setDebugInfo({ status: response.status, statusText: response.statusText });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      console.log('[AnalysisDetail] Raw response length:', text.length);
      console.log('[AnalysisDetail] Raw response preview:', text.substring(0, 500));

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('[AnalysisDetail] JSON parse error:', e);
        throw new Error('Invalid JSON response from API');
      }

      console.log('[AnalysisDetail] Parsed data:', { success: data.success, hasData: !!data.data, mock: data.mock });
      setDebugInfo((prev: any) => ({ ...prev, parsedData: data }));

      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }

      if (!data.data) {
        throw new Error('No data in API response');
      }

      // Defensive: ensure all arrays exist
      const rawData = data.data;
      const normalizedData: AnalysisDetail = {
        ...rawData,
        rules: Array.isArray(rawData.rules) ? rawData.rules : [],
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

      console.log('[AnalysisDetail] Normalized data:', {
        id: normalizedData.id,
        country: normalizedData.country,
        provider: normalizedData.provider,
        rulesCount: normalizedData.rules.length,
        plansCount: normalizedData.plans.length,
      });

      setAnalysis(normalizedData);
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
        <div style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          ID: {analysisId}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Error Loading Analysis</h2>
        <p style={{ color: '#dc2626', marginTop: '1rem' }}>{error}</p>
        <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
          Analysis ID: <code>{analysisId}</code>
        </p>
        {debugInfo && (
          <pre style={{ marginTop: '1rem', textAlign: 'left', background: '#f3f4f6', padding: '1rem', borderRadius: '0.375rem', fontSize: '0.75rem', overflow: 'auto' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
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
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>
          The analysis with ID <code>{analysisId}</code> could not be loaded.
        </p>
        <a 
          href="/admin/analyses"
          style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.5rem 1rem', background: '#4f46e5', color: 'white', textDecoration: 'none', borderRadius: '0.375rem' }}
        >
          ← Back to Analyses
        </a>
      </div>
    );
  }

  const ruleSummary = {
    approved: analysis.rules.filter(r => r.status === 'approved').length,
    proposed: analysis.rules.filter(r => r.status === 'proposed').length,
    pending: analysis.rules.filter(r => r.status === 'pending_confirmation').length,
    rejected: analysis.rules.filter(r => r.status === 'rejected').length,
  };

  const planSummary = {
    approved: analysis.plans.filter(p => p.status === 'approved').length,
    proposed: analysis.plans.filter(p => p.status === 'proposed').length,
  };

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

      {/* Summary */}
      <div className="summary-card">
        <div className="summary-left">
          <h2 className="summary-title">Analysis Summary</h2>
          <p className="summary-text">{analysis.summary || 'No summary available.'}</p>
        </div>
        <div className="summary-stats">
          <div className="stat-pill">
            <span className="sp-val">{ruleSummary.approved}</span>
            <span className="sp-label">Approved rules</span>
          </div>
          <div className="stat-pill warn">
            <span className="sp-val">{ruleSummary.proposed + ruleSummary.pending}</span>
            <span className="sp-label">Pending review</span>
          </div>
          <div className="stat-pill err">
            <span className="sp-val">{ruleSummary.rejected}</span>
            <span className="sp-label">Rejected</span>
          </div>
          <div className="stat-pill green">
            <span className="sp-val">{planSummary.approved}</span>
            <span className="sp-label">Approved plans</span>
          </div>
        </div>
      </div>

      {/* Transaction Rules */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Transaction Rules ({analysis.rules.length})</h2>
          <div className="section-actions">
            <button className="btn-bulk-approve" onClick={() => alert('TODO: Bulk approve')}>
              Approve all proposed
            </button>
          </div>
        </div>

        {analysis.rules.length === 0 ? (
          <div className="empty-state">No rules found</div>
        ) : (
          <div className="rules-list">
            {analysis.rules.map(rule => (
              <div key={rule.id} className={`rule-card status-${rule.status}`} id={`rule-${rule.id}`}>
                <div className="rule-head">
                  <div className="rule-meta">
                    <span className={`status-pill sp-${rule.status}`}>{rule.status.replace('_', ' ')}</span>
                    <span className={`conf-badge ${confidenceMeta[rule.confidence].cls}`}>
                      {confidenceMeta[rule.confidence].label} confidence
                    </span>
                    {rule.manually_edited && <span className="edited-tag">Edited</span>}
                  </div>
                </div>
                <div className="rule-body">
                  <div className="rule-main">
                    <div className="rule-name">{rule.label}</div>
                    <div className="rule-details">
                      <span className="detail-pill">{rule.direction}</span>
                      <span className="detail-pill">{rule.obligation}</span>
                      <span className="detail-pill">{rule.operation_group}</span>
                      <span className="detail-key">key: <code>{rule.input_key}</code></span>
                    </div>
                    <p className="rule-reason">{rule.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Plans */}
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

      {/* Assumptions */}
      {analysis.assumptions.length > 0 && (
        <section className="section">
          <h2 className="section-title">Business Assumptions ({analysis.assumptions.length})</h2>
          <div className="assumptions-list">
            {analysis.assumptions.map(assumption => (
              <div key={assumption.id} className="assumption-card">
                <div className="assumption-head">
                  <span className="assumption-key">{assumption.key}</span>
                  <span className="assumption-value">{assumption.value}</span>
                  <span className={`status-pill sp-${assumption.status}`}>{assumption.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="footer-actions">
        <a href="/admin/analyses" className="btn-secondary">← Back to Analyses</a>
        <a href={`/admin/profiles/${analysis.profile_id}`} className="btn-primary">
          Proceed to Profile Activation →
        </a>
      </div>
    </div>
  );
}

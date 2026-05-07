export type ExtractedRule = {
  id: string;
  label: string;
  inputKey: string;
  direction: string;
  obligation: string;
  operationGroup: string;
  paPerItem: string;
  status: string;
  reason: string;
  sourceExcerpt: string;
};

type CannedTurn = { assistant: string; rules: ExtractedRule[] };

const cannedTurns: CannedTurn[] = [
  {
    assistant:
      'From typical B2B e-invoicing flows, the provider bills **1.5 PA transactions per issued invoice** (submission + acknowledgement). I extracted two starter rules you can edit on the right.',
    rules: [
      {
        id: 'ext-1',
        label: 'Issued e-invoicing invoices / year',
        inputKey: 'issued_einvoicing',
        direction: 'Issued',
        obligation: 'E-invoicing',
        operationGroup: 'Domestic B2B invoices',
        paPerItem: '1.5',
        status: 'proposed',
        reason: 'Each issued e-invoice generates 1 PA submission + 0.5 for acknowledgement.',
        sourceExcerpt: 'Demo extraction — replace with text from your document set.',
      },
      {
        id: 'ext-2',
        label: 'Received e-invoicing invoices / year',
        inputKey: 'received_einvoicing',
        direction: 'Received',
        obligation: 'E-invoicing',
        operationGroup: 'Domestic B2B invoices',
        paPerItem: '1.0',
        status: 'proposed',
        reason: 'Reception is billed as one PA delivery transaction per document.',
        sourceExcerpt: 'Demo extraction — tie to pricing PDF or upload metadata.',
      },
    ],
  },
  {
    assistant:
      'For **e-reporting** batches, many platforms use a reduced multiplier because submissions are grouped. I added one rule; you can adjust the multiplier after legal review.',
    rules: [
      {
        id: 'ext-3',
        label: 'Issued e-reporting transactions / year',
        inputKey: 'issued_ereporting',
        direction: 'Issued',
        obligation: 'E-reporting',
        operationGroup: 'B2C / cross-border flows',
        paPerItem: '0.5',
        status: 'pending_confirmation',
        reason: 'Batched e-reporting is often billed at 0.5 PA transactions per reported item.',
        sourceExcerpt: 'Demo extraction — confirm against country-specific decree.',
      },
    ],
  },
  {
    assistant:
      'I do not see additional distinct rule types in this thread without new document references. You can **edit the forms on the right** or continue in the full analysis review when the API is connected.',
    rules: [],
  },
];

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function simpleMarkdownToHtml(s: string): string {
  const parts = String(s).split(/\*\*/);
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? '';
    out += i % 2 === 0 ? escapeText(part) : '<strong>' + escapeText(part) + '</strong>';
  }
  return out.replace(/\n/g, '<br/>');
}

function renderRuleCard(r: ExtractedRule): HTMLElement {
  const card = document.createElement('article');
  card.className = 'rule-form-card';
  card.dataset.ruleId = r.id;
  card.innerHTML =
    '<div class="rule-form-title">Rule ' +
    r.id +
    '</div>' +
    '<div class="rule-fields">' +
    '<div class="rule-field full"><label for="f-' +
    r.id +
    '-label">Label</label><input id="f-' +
    r.id +
    '-label" type="text" value="' +
    escapeAttr(r.label) +
    '" /></div>' +
    '<div class="rule-field"><label for="f-' +
    r.id +
    '-key">Input key</label><input id="f-' +
    r.id +
    '-key" type="text" value="' +
    escapeAttr(r.inputKey) +
    '" /></div>' +
    '<div class="rule-field"><label for="f-' +
    r.id +
    '-dir">Direction</label><input id="f-' +
    r.id +
    '-dir" type="text" value="' +
    escapeAttr(r.direction) +
    '" /></div>' +
    '<div class="rule-field"><label for="f-' +
    r.id +
    '-obl">Obligation</label><input id="f-' +
    r.id +
    '-obl" type="text" value="' +
    escapeAttr(r.obligation) +
    '" /></div>' +
    '<div class="rule-field full"><label for="f-' +
    r.id +
    '-og">Operation group</label><input id="f-' +
    r.id +
    '-og" type="text" value="' +
    escapeAttr(r.operationGroup) +
    '" /></div>' +
    '<div class="rule-field"><label for="f-' +
    r.id +
    '-pa">PA transactions / item</label><input id="f-' +
    r.id +
    '-pa" type="text" inputmode="decimal" value="' +
    escapeAttr(r.paPerItem) +
    '" /></div>' +
    '<div class="rule-field"><label for="f-' +
    r.id +
    '-st">Status</label><input id="f-' +
    r.id +
    '-st" type="text" value="' +
    escapeAttr(r.status) +
    '" /></div>' +
    '<div class="rule-field full"><label for="f-' +
    r.id +
    '-rs">Reason</label><textarea id="f-' +
    r.id +
    '-rs" rows="2">' +
    escapeText(r.reason) +
    '</textarea></div>' +
    '<div class="rule-field full"><label for="f-' +
    r.id +
    '-ex">Source excerpt</label><textarea id="f-' +
    r.id +
    '-ex" rows="2">' +
    escapeText(r.sourceExcerpt) +
    '</textarea></div>' +
    '</div>';
  return card;
}

type ChatContext = {
  profileId: string;
  countryName: string;
  providerName: string;
};

function readChatContext(root: HTMLElement | null): ChatContext {
  const profileId = root?.dataset.profileId ?? '';
  const countryName = root?.dataset.country ?? '';
  const providerName = root?.dataset.provider ?? '';
  return { profileId, countryName, providerName };
}

export function initAdminCountryAiAnalysisChat(): void {
  const pageRoot = document.querySelector<HTMLElement>('.page-admin-country-ai-analysis');
  const ctx = readChatContext(pageRoot);

  const messagesEl = document.getElementById('chat-messages');
  const rulesEmptyEl = document.getElementById('rules-empty');
  const rulesListEl = document.getElementById('rules-list');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  if (
    !messagesEl ||
    !rulesEmptyEl ||
    !rulesListEl ||
    !form ||
    !(input instanceof HTMLTextAreaElement) ||
    !(sendBtn instanceof HTMLButtonElement)
  ) {
    return;
  }

  const chatMessages = messagesEl;
  const chatRulesEmpty = rulesEmptyEl;
  const chatRulesList = rulesListEl;
  const chatForm = form;
  const chatInput = input;
  const chatSendBtn = sendBtn;

  let turnIndex = 0;
  const seenRuleIds = new Set<string>();

  function scrollChatToBottom(): void {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addBubble(role: 'user' | 'assistant', html: string): void {
    const wrap = document.createElement('div');
    wrap.className = 'chat-bubble ' + role;
    wrap.innerHTML =
      '<div class="bubble-role">' +
      (role === 'user' ? 'You' : 'Assistant') +
      '</div><div class="bubble-body"></div>';
    const body = wrap.querySelector('.bubble-body');
    if (body) body.innerHTML = html;
    chatMessages.appendChild(wrap);
    scrollChatToBottom();
  }

  function mergeRules(rules: ExtractedRule[]): void {
    let added = false;
    for (const r of rules) {
      if (seenRuleIds.has(r.id)) continue;
      seenRuleIds.add(r.id);
      chatRulesList.appendChild(renderRuleCard(r));
      added = true;
    }
    if (added) {
      chatRulesList.hidden = false;
      chatRulesEmpty.hidden = true;
    }
  }

  function playCannedTurn(): void {
    const turn = cannedTurns[Math.min(turnIndex, cannedTurns.length - 1)];
    turnIndex += 1;
    addBubble('assistant', simpleMarkdownToHtml(turn.assistant));
    mergeRules(turn.rules);
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    addBubble('user', escapeText(text).replace(/\n/g, '<br/>'));
    chatInput.value = '';
    chatSendBtn.disabled = true;

    void (async () => {
      try {
        const res = await fetch('/api/pa/admin/ai-analysis/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            profileId: ctx.profileId,
            countryName: ctx.countryName || undefined,
            providerName: ctx.providerName || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          demo?: boolean;
          assistant?: string;
          rules?: ExtractedRule[];
          message?: string;
        };

        if (res.ok && typeof data.assistant === 'string') {
          addBubble('assistant', simpleMarkdownToHtml(data.assistant));
          mergeRules(Array.isArray(data.rules) ? data.rules : []);
        } else if (res.status === 503 && data.demo) {
          playCannedTurn();
        } else {
          const hint =
            typeof data.message === 'string'
              ? data.message
              : typeof (data as { error?: string }).error === 'string'
                ? (data as { error?: string }).error!
                : res.statusText;
          addBubble(
            'assistant',
            escapeText('Could not reach the Crew service: ' + hint).replace(/\n/g, '<br/>'),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addBubble('assistant', escapeText('Request failed: ' + msg).replace(/\n/g, '<br/>'));
      } finally {
        chatSendBtn.disabled = false;
        chatInput.focus();
      }
    })();
  });
}

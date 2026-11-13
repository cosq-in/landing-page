import { useCallback, useEffect, useState } from 'react';
import { ApiError, getQuestDraft, publishQuests } from './api';
import {
  EDITOR_NOTE, PUBLISH_CONFIRM, QUEST_VIEWS, canPublish, draftSummary, issueCountLabel, publishBlockReason, publishErrorMessage, publishResultText, viewLabel,
} from './questsLogic';

function IssueList({ kind, items }) {
  return (
    <div className="qs-issues">
      <h4>{issueCountLabel(kind, items.length)}</h4>
      {items.length > 0 && <ul className={`qs-list ${kind}`}>{items.map((it, i) => <li key={`${it.id}-${i}`}><b>{it.id}</b> {it.message}</li>)}</ul>}
    </div>
  );
}

function QuestCard({ view, token, onAuth }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const fail = useCallback((e, setter) => {
    if (e instanceof ApiError && e.status === 401) { onAuth(); return; }
    setter(e instanceof ApiError ? publishErrorMessage(e.status, e.body, e.message) : e.message);
  }, [onAuth]);

  const load = useCallback(async () => {
    try { setDraft(await getQuestDraft(token, view)); setError(''); } catch (e) { fail(e, setError); }
  }, [token, view, fail]);

  useEffect(() => { load(); }, [load]);

  async function publish() {
    if (!window.confirm(`Publish the ${viewLabel(view)} draft to live? ${PUBLISH_CONFIRM}`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await publishQuests(token, view);
      setMsg({ kind: 'ok', text: publishResultText(r) });
    } catch (e) { fail(e, (text) => setMsg({ kind: 'error', text })); }
    await load(); // also after a failure, so the card shows what the server now says
    setBusy(false);
  }

  const s = draft && draftSummary(draft);
  const reason = publishBlockReason(draft);
  return (
    <section className="ad-card">
      <header>
        <h3>{viewLabel(view)}</h3>
        <button type="button" onClick={load} disabled={busy}>Refresh</button>
      </header>
      {error && <p className="ad-msg error">{error}</p>}
      {!draft && !error && <p className="ad-muted">Loading…</p>}
      {draft && (
        <>
          <dl className="ad-facts">
            <dt>Draft version</dt><dd>{s.version}</dd>
            <dt>Last edited by</dt><dd>{s.editor} <span className="ad-muted">({s.saved})</span></dd>
            <dt>Places</dt><dd>{s.places}</dd>
          </dl>
          <IssueList kind="error" items={draft.errors || []} />
          <IssueList kind="warning" items={draft.warnings || []} />
          {msg && <p className={`ad-msg ${msg.kind}`}>{msg.text}</p>}
          <div className="ad-row">
            <button type="button" className="ad-primary" disabled={busy || !canPublish(draft)} onClick={publish}>Publish to live</button>
            <a className="qs-link" href="#/editor">Open web editor</a>
            {reason && <span className="ad-muted">{reason}</span>}
          </div>
        </>
      )}
    </section>
  );
}

export default function Quests({ token, onAuth }) {
  return (
    <div className="qs">
      <p className="ad-muted">Editors change the draft only. Publishing makes the draft the live quest list. {EDITOR_NOTE}</p>
      <div className="ad-cards qs-cards">
        {QUEST_VIEWS.map(([view]) => <QuestCard key={view} view={view} token={token} onAuth={onAuth} />)}
      </div>
    </div>
  );
}

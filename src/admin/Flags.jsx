import { useCallback, useEffect, useState } from 'react';
import { ApiError, listFlags, putFlag, resetFlag } from './api';
import { addUser, initDraft, isDirty, modeLabel, removeUser, toPayload } from './flagDraft';
import PersonPicker from './PersonPicker';

const MODES = [['off', 'Off'], ['all', 'Everyone'], ['users', 'Specific people']];
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');

function FlagCard({ flag, token, onSaved, onAuth }) {
  const [draft, setDraft] = useState(() => initDraft(flag));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {kind: 'ok' | 'warn' | 'error', text}
  const [seen, setSeen] = useState(flag);
  if (seen !== flag) { setSeen(flag); setDraft(initDraft(flag)); } // the server's copy changed (after a save or reset): start from it

  const fail = useCallback((e) => { if (e instanceof ApiError && e.status === 401) onAuth(); else setMsg({ kind: 'error', text: e.message }); }, [onAuth]);

  async function save() {
    if (draft.mode === 'all' && !window.confirm(`Turn "${flag.key}" on for EVERYONE, right now?`)) return;
    setBusy(true); setMsg(null);
    try {
      const out = await putFlag(token, flag.key, toPayload(draft));
      onSaved(out);
      setMsg(out.unknown_ids?.length
        ? { kind: 'warn', text: `Saved, but ${out.unknown_ids.length} id${out.unknown_ids.length === 1 ? '' : 's'} match no user (typo?): ${out.unknown_ids.join(', ')}` }
        : { kind: 'ok', text: 'Saved. The app picks it up within seconds.' });
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function reset() {
    if (!window.confirm(`Reset "${flag.key}" to its env var (${flag.env})?`)) return;
    setBusy(true); setMsg(null);
    try {
      await resetFlag(token, flag.key);
      onSaved((await listFlags(token)).flags.find((f) => f.key === flag.key));
      setMsg({ kind: 'ok', text: 'Back to the env var.' });
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  const dirty = isDirty(draft, flag);
  return (
    <section className="ad-card" aria-label={flag.key}>
      <header>
        <h3>{flag.key}</h3>
        <span className={`ad-badge ${flag.source}`}>{flag.source === 'panel' ? 'set in this panel' : `from env var ${flag.env}`}</span>
      </header>
      <p className="ad-muted">{flag.description}</p>
      <p className="ad-now"><b>Now:</b> {modeLabel(flag.mode, flag.user_ids.length)}{flag.source === 'panel' && flag.updated_at ? ` · changed by ${flag.updated_by} on ${when(flag.updated_at)}` : ''}</p>

      <div className="ad-modes" role="radiogroup" aria-label="Who gets this flag">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={draft.mode === m} className={draft.mode === m ? 'on' : ''} onClick={() => setDraft({ ...draft, mode: m })}>{label}</button>
        ))}
      </div>

      {draft.mode === 'users' && (
        <div className="ad-people">
          <ul className="ad-chips">
            {draft.people.length === 0 && <li className="ad-muted">Nobody yet.</li>}
            {draft.people.map((p) => (
              <li key={p.id} className={p.unresolved ? 'bad' : ''} title={p.id}>
                {p.unresolved ? `unknown id ${p.id.slice(0, 8)}…` : (p.name || p.email)}
                <button type="button" aria-label={`Remove ${p.name || p.email || p.id}`} onClick={() => setDraft(removeUser(draft, p.id))}>×</button>
              </li>
            ))}
          </ul>
          <PersonPicker token={token} exclude={draft.people.map((p) => p.id)} onPick={(p) => setDraft(addUser(draft, p))} onError={fail} />
        </div>
      )}

      <label className="ad-field"><span>Note (why, for whom)</span>
        <input value={draft.note} maxLength={200} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      </label>

      <div className="ad-row">
        <button type="button" className="ad-primary" disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" disabled={!dirty || busy} onClick={() => setDraft(initDraft(flag))}>Discard changes</button>
        {flag.source === 'panel' && <button type="button" className="ad-danger" disabled={busy} onClick={reset}>Reset to env var</button>}
      </div>
      {msg && <p className={`ad-msg ${msg.kind}`} role="status">{msg.text}</p>}
    </section>
  );
}

export default function Flags({ token, onAuth }) {
  const [flags, setFlags] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    listFlags(token).then((d) => live && setFlags(d.flags)).catch((e) => {
      if (!live) return;
      if (e instanceof ApiError && e.status === 401) onAuth(); else setError(e.message);
    });
    return () => { live = false; };
  }, [token, onAuth]);

  if (error) return <p className="ad-msg error">{error}</p>;
  if (!flags) return <p className="ad-muted">Loading flags…</p>;
  return (
    <div className="ad-cards">
      {flags.map((f) => (
        <FlagCard key={f.key} flag={f} token={token} onAuth={onAuth}
          onSaved={(next) => setFlags((all) => all.map((x) => (x.key === next.key ? next : x)))} />
      ))}
    </div>
  );
}

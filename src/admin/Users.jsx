import { useEffect, useState } from 'react';
import { ApiError, getUser, searchUsers } from './api';

const joined = (iso) => (iso ? new Date(iso).toLocaleDateString() : '');

function Detail({ token, id, onAuth }) {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    getUser(token, id).then((d) => live && setData(d)).catch((e) => { if (e instanceof ApiError && e.status === 401) onAuth(); });
    return () => { live = false; };
  }, [token, id, onAuth]);
  if (!data) return <p className="ad-muted">Loading…</p>;
  const { user, flags } = data;
  return (
    <section className="ad-card">
      <h3>{user.name || '(no name)'}</h3>
      <dl className="ad-facts">
        <dt>Email</dt><dd>{user.email}</dd>
        <dt>Role</dt><dd>{user.role || '—'}</dd>
        <dt>Cohort</dt><dd>{user.college || 'Kurukuru Commune'}</dd>
        <dt>Joined</dt><dd>{joined(user.created_at)}</dd>
        <dt>Id</dt>
        <dd><code>{user.id}</code>{' '}
          <button type="button" onClick={() => { navigator.clipboard?.writeText(user.id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy id'}</button>
        </dd>
      </dl>
      <h4>Feature flags for this person</h4>
      <ul className="ad-flaglist">
        {flags.map((f) => <li key={f.key}><b>{f.key}</b>: <span className={f.on ? 'on' : 'off'}>{f.on ? 'on' : 'off'}</span> <span className="ad-muted">({f.why})</span></li>)}
      </ul>
    </section>
  );
}

export default function Users({ token, onAuth }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return undefined;
    let live = true;
    const t = setTimeout(() => {
      searchUsers(token, text).then((d) => { if (live) { setUsers(d.users); setError(''); } })
        .catch((e) => { if (!live) return; if (e instanceof ApiError && e.status === 401) onAuth(); else setError(e.message); });
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q, token, onAuth]);

  const shown = q.trim().length >= 2 ? users : null; // a short search shows nothing, whatever the last search found
  return (
    <div className="ad-users">
      <input className="ad-search" autoFocus placeholder="Search users by email, name or id (2+ characters)…" value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} />
      <p className="ad-muted">Read-only. Every search and every profile you open is written to the activity log.</p>
      {error && <p className="ad-msg error">{error}</p>}
      {shown && (
        <table className="ad-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cohort</th><th>Joined</th></tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan="5" className="ad-muted">No one found.</td></tr>}
            {shown.map((u) => (
              <tr key={u.id} className={picked === u.id ? 'on' : ''} onClick={() => setPicked(u.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setPicked(u.id)}>
                <td>{u.name || '—'}</td><td>{u.email}</td><td>{u.role || '—'}</td><td>{u.college || 'Commune'}</td><td>{joined(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {picked && <Detail key={picked} token={token} id={picked} onAuth={onAuth} />}
    </div>
  );
}

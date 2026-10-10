import { useCallback, useEffect, useState } from 'react';
import { ApiError, auditLog } from './api';
import { describeAudit } from './flagDraft';

export default function Activity({ token, onAuth }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    auditLog(token, 100).then((d) => { setEntries(d.entries); setError(''); })
      .catch((e) => { if (e instanceof ApiError && e.status === 401) onAuth(); else setError(e.message); });
  }, [token, onAuth]);
  useEffect(load, [load]);

  if (error) return <p className="ad-msg error">{error}</p>;
  if (!entries) return <p className="ad-muted">Loading…</p>;
  return (
    <div>
      <div className="ad-row"><button type="button" onClick={load}>Refresh</button><span className="ad-muted">Newest first, last 100.</span></div>
      <table className="ad-table">
        <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
        <tbody>
          {entries.length === 0 && <tr><td colSpan="3" className="ad-muted">Nothing yet.</td></tr>}
          {entries.map((e) => <tr key={e.id}><td>{new Date(e.at).toLocaleString()}</td><td>{e.actor}</td><td>{describeAudit(e)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { searchUsers } from './api';

/** Type an email, name or the start of an id; pick a person to add. Searches 300 ms after you stop typing. */
export default function PersonPicker({ token, exclude, onPick, onError }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) return undefined;
    let live = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const { users } = await searchUsers(token, text);
        if (live) setFound(users);
      } catch (e) { if (live) onError?.(e); } finally { if (live) setBusy(false); }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [q, token, onError]);

  const left = (q.trim().length >= 2 ? found : []).filter((u) => !exclude.includes(u.id));
  return (
    <div className="ad-picker">
      <input placeholder="Add a person: search by email, name or id…" value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && (
        <ul className="ad-results">
          {busy && <li className="ad-muted">Searching…</li>}
          {!busy && left.length === 0 && <li className="ad-muted">{found.length ? 'Everyone found is already on the list.' : 'No one found.'}</li>}
          {left.map((u) => (
            <li key={u.id}>
              <button type="button" onClick={() => { onPick({ id: u.id, name: u.name, email: u.email }); setQ(''); }}>
                <b>{u.name || '(no name)'}</b> <span className="ad-muted">{u.email} · {u.role || 'no role'}{u.college ? ` · ${u.college}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

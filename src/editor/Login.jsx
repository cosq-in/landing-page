import { useEffect, useState } from 'react';
import { ApiError, login } from './api';

export default function Login({ onToken, login: doLogin = login, title = 'Quest book editor', nameHint = 'Your name (shown to other editors)', storageKey = 'qe-name' }) {
  const [password, setPassword] = useState('');
  const [name, setName] = useState(() => { try { return localStorage.getItem(storageKey) || ''; } catch { return ''; } });
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await doLogin(password, name.trim());
      try { localStorage.setItem(storageKey, name.trim()); } catch { /* fine without it */ }
      onToken(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setWait(err.retryAfter || 60);
      setError(err instanceof ApiError && err.status === 401 ? 'Wrong password.' : err.message);
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <form className="qe-login" onSubmit={submit}>
      <h1>{title}</h1>
      <input placeholder={nameHint} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} autoFocus={!name} />
      <input type="password" autoFocus={!!name} autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={wait > 0} />
      <button disabled={busy || wait > 0 || !password || !name.trim()}>{wait > 0 ? `Try again in ${Math.ceil(wait / 60) > 1 ? `${Math.ceil(wait / 60)} min` : `${wait}s`}` : 'Enter'}</button>
      {error && <p className="qe-error" role="alert">{error}</p>}
    </form>
  );
}

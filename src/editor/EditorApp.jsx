import { useEffect, useState } from 'react';
import { ApiError, fetchCandidates, fetchRegion } from './api';
import Editor from './Editor';
import Login from './Login';
import './editor.css';

export default function EditorApp() {
  const [token, setToken] = useState(null); // memory only: a page reload means logging in again
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Quest book editor';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!token) return;
    let live = true;
    Promise.all([fetchRegion(token), fetchCandidates(token)])
      .then(([region, candidates]) => live && setData({ region, candidates }))
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) { setToken(null); setError('Session expired, log in again.'); } else setError(e.message);
      });
    return () => { live = false; };
  }, [token]);

  const logout = () => { setToken(null); setData(null); setError(''); };
  if (!token) return <><Login onToken={setToken} />{error && <p className="qe-error qe-center">{error}</p>}</>;
  if (!data) return <p className="qe-center">{error || 'Loading the KIIT map…'}</p>;
  return <Editor token={token} region={data.region} candidates={data.candidates} onLogout={logout} onAuthLost={() => { logout(); setError('Session expired, log in again.'); }} />;
}

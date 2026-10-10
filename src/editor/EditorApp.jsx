import { useEffect, useState } from 'react';
import { ApiError, fetchCandidates, fetchRegion, fetchTileManifest } from './api';
import Editor from './Editor';
import Login from './Login';
import './editor.css';

const VIEWS = { kiit: { label: 'KIIT' }, bangalore: { label: 'Bengaluru' } };
const boxRing = ({ west, east, south, north }) => [[west, north], [east, north], [east, south], [west, south]];

// What each view needs besides its shared draft: the map it sits on, suggestions to review, and a starting book
// (only used until the server's own book has loaded).
async function loadView(token, view) {
  if (view === 'kiit') {
    const [region, candidates] = await Promise.all([fetchRegion(token, 'kiit'), fetchCandidates(token, 'kiit')]);
    return { view, candidates, voxel: { kind: 'region', region },
      defaultBook: { slug: 'kiit', name: 'KIIT Campus', college_domain: 'kiit.ac.in', ring: boxRing(region) } };
  }
  const [coarse, fine, candidates] = await Promise.all([fetchTileManifest(token, 'blr'), fetchTileManifest(token, 'blr5'), fetchCandidates(token, 'bangalore')]);
  return { view, candidates, voxel: { kind: 'tiles', manifests: { coarse, fine } },
    defaultBook: { slug: 'bangalore', name: 'Bengaluru', college_domain: '', ring: boxRing(coarse) } };
}

const savedView = () => { try { const v = localStorage.getItem('qe-view'); return VIEWS[v] ? v : 'kiit'; } catch { return 'kiit'; } };

export default function EditorApp() {
  const [token, setToken] = useState(null); // memory only: a page reload means logging in again
  const [view, setView] = useState(savedView);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Quest book editor';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let live = true;
    loadView(token, view)
      .then((d) => live && setData(d))
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) { setToken(null); setError('Session expired, log in again.'); } else setError(e.message);
      });
    return () => { live = false; };
  }, [token, view]);

  const switchView = (v) => {
    setData(null);
    setView(v);
    try { localStorage.setItem('qe-view', v); } catch { /* fine without it */ }
  };
  const logout = () => { setToken(null); setData(null); setError(''); };
  if (!token) return <><Login onToken={setToken} />{error && <p className="qe-error qe-center">{error}</p>}</>;
  if (!data || data.view !== view) return <p className="qe-center">{error || `Loading the ${VIEWS[view].label} map…`}</p>;
  return (
    <Editor
      key={view} token={token} view={view} views={VIEWS} onView={switchView} voxel={data.voxel} candidates={data.candidates} defaultBook={data.defaultBook}
      onLogout={logout} onAuthLost={() => { logout(); setError('Session expired, log in again.'); }}
    />
  );
}

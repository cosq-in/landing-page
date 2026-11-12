import { useCallback, useEffect, useState } from 'react';
import Login from '../editor/Login';
import '../editor/editor.css';
import Activity from './Activity';
import { listRwPhotos, login } from './api';
import './admin.css';
import Flags from './Flags';
import RoadWatch from './RoadWatch';
import { photoBadge } from './rwLogic';
import Users from './Users';

const TABS = [['flags', 'Feature flags'], ['users', 'Users'], ['roadwatch', 'Road Watch'], ['activity', 'Activity']];

export default function AdminApp() {
  const [token, setToken] = useState(null); // memory only: a reload means logging in again
  const [tab, setTab] = useState('flags');
  const [notice, setNotice] = useState('');
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    document.title = 'Kurukuru admin';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const lost = useCallback(() => { setToken(null); setNotice('Your session ended, log in again.'); }, []);

  useEffect(() => { // the tab badge: photos waiting for a moderator, checked once after login (the Road Watch tab keeps it fresh)
    if (!token) return;
    listRwPhotos(token).then((d) => setPhotoCount(d.photos.length)).catch(() => { /* the badge is a hint, not a feature */ });
  }, [token]);

  if (!token) {
    return (
      <>
        <Login onToken={(t) => { setNotice(''); setToken(t); }} login={login} title="Kurukuru admin" nameHint="Your name (written in the activity log)" storageKey="ad-name" />
        {notice && <p className="qe-error qe-center">{notice}</p>}
      </>
    );
  }
  return (
    <div className="ad-shell">
      <header className="ad-top">
        <h1>Kurukuru admin</h1>
        <nav role="tablist">
          {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}{id === 'roadwatch' && photoCount > 0 && <span className="ad-tabcount" title="Photos waiting">{photoBadge(photoCount)}</span>}</button>)}
        </nav>
        <button type="button" onClick={() => setToken(null)}>Log out</button>
      </header>
      <main>
        {tab === 'flags' && <Flags token={token} onAuth={lost} />}
        {tab === 'users' && <Users token={token} onAuth={lost} />}
        {tab === 'roadwatch' && <RoadWatch token={token} onAuth={lost} onPhotoCount={setPhotoCount} />}
        {tab === 'activity' && <Activity token={token} onAuth={lost} />}
      </main>
    </div>
  );
}

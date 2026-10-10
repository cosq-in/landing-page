import { useCallback, useEffect, useState } from 'react';
import Login from '../editor/Login';
import '../editor/editor.css';
import Activity from './Activity';
import { login } from './api';
import './admin.css';
import Flags from './Flags';
import Users from './Users';

const TABS = [['flags', 'Feature flags'], ['users', 'Users'], ['activity', 'Activity']];

export default function AdminApp() {
  const [token, setToken] = useState(null); // memory only: a reload means logging in again
  const [tab, setTab] = useState('flags');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Kurukuru admin';
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const lost = useCallback(() => { setToken(null); setNotice('Your session ended, log in again.'); }, []);

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
          {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <button type="button" onClick={() => setToken(null)}>Log out</button>
      </header>
      <main>
        {tab === 'flags' && <Flags token={token} onAuth={lost} />}
        {tab === 'users' && <Users token={token} onAuth={lost} />}
        {tab === 'activity' && <Activity token={token} onAuth={lost} />}
      </main>
    </div>
  );
}

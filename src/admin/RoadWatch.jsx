import { useCallback, useEffect, useState } from 'react';
import { ApiError, approveRwPhoto, fetchRwPhotoBlob, listRwPhotos, listRwReports, rejectRwPhoto, rwForward, rwSetStatus } from './api';
import {
  OWNERS, MAX_OFFICE, MAX_REASON, REPORT_STATUSES, actorLabel, ageLabel, allowedActions, confirmText, errorMessage, forwardBody, formatBytes,
  placeLabel, rejectBody, severityLabel, statusBody, statusLabel, typeLabel,
} from './rwLogic';

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');

/** Runs `fn`, turning a 401 into a logout and any other failure into a plain-words message. */
function useGuard(onAuth) {
  return useCallback(async (fn, onError) => {
    try { return await fn(); } catch (e) {
      if (e instanceof ApiError && e.status === 401) onAuth();
      else onError(e instanceof ApiError ? errorMessage(e.status, e.message) : e.message, e);
      return undefined;
    }
  }, [onAuth]);
}

function ReportDetail({ report, busy, run, msg }) {
  const can = allowedActions(report.status);
  const [office, setOffice] = useState(report.reported_to || '');
  const [owner, setOwner] = useState(report.owner && report.owner !== '' ? report.owner : 'unknown');
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const body = forwardBody(office, owner, ownerConfirmed);
  const events = report.events || [];

  return (
    <section className="ad-card">
      <header>
        <h3>{typeLabel(report.type)} · {placeLabel(report)}</h3>
        <span className={`ad-badge rw-${report.status}`}>{statusLabel(report.status)}</span>
      </header>
      <dl className="ad-facts">
        <dt>Severity</dt><dd>{severityLabel(report.severity)}</dd>
        <dt>Reported</dt><dd>{when(report.created_at)} ({ageLabel(report.created_at)} ago)</dd>
        <dt>Backed by</dt><dd>+1 from {report.plus_one_count} {report.plus_one_count === 1 ? 'person' : 'people'}</dd>
        {report.reported_to && <><dt>Passed on to</dt><dd>{report.reported_to}{report.owner ? ` (${report.owner.toUpperCase()}${report.owner_confirmed ? ', owner confirmed' : ''})` : ''}</dd></>}
        {(report.verified_count > 0 || report.still_broken_count > 0) && <><dt>Fix checks</dt><dd>{report.verified_count} fixed, {report.still_broken_count} still broken</dd></>}
        {report.note && <><dt>Note</dt><dd className="rw-note">{report.note}</dd></>}
        <dt>Where</dt><dd>{report.lat?.toFixed?.(5)}, {report.lng?.toFixed?.(5)}</dd>
      </dl>

      <h4>Timeline</h4>
      {events.length === 0
        ? <p className="ad-muted">No timeline events came back with this report.</p>
        : <ol className="rw-timeline">{events.map((e, i) => (
          <li key={i}><b>{statusLabel(e.status)}</b> <span className="ad-muted">{when(e.at)}{actorLabel(e.actor_type) ? ` · ${actorLabel(e.actor_type)}` : ''}</span>{e.note && <div>{e.note}</div>}</li>
        ))}</ol>}

      <h4>Staff actions</h4>
      {msg && <p className={`ad-msg ${msg.kind}`}>{msg.text}</p>}
      {can.forward && (
        <div className="rw-forward">
          <label className="ad-field"><span>Office name (up to {MAX_OFFICE} characters)</span>
            <input value={office} maxLength={MAX_OFFICE} onChange={(e) => setOffice(e.target.value)} placeholder="e.g. BMC ward office" /></label>
          <label className="ad-field"><span>Who owns this road</span>
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>{OWNERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="rw-check"><input type="checkbox" checked={ownerConfirmed} onChange={(e) => setOwnerConfirmed(e.target.checked)} /> I have checked who owns this road</label>
          <button type="button" className="ad-primary" disabled={busy || !body}
            onClick={() => window.confirm(confirmText.forward(body.office)) && run('forward', body)}>Forward to office</button>
        </div>
      )}
      <div className="ad-row">
        {can.acknowledged && <button type="button" disabled={busy} onClick={() => window.confirm(confirmText.acknowledged()) && run('status', statusBody('acknowledged'))}>Acknowledge</button>}
        {can.fixed && <button type="button" disabled={busy} onClick={() => window.confirm(confirmText.fixed()) && run('status', statusBody('fixed'))}>Mark fixed</button>}
        {!can.forward && !can.acknowledged && !can.fixed && <span className="ad-muted">Nothing staff can change from here. {report.status === 'fixed' ? 'Riders confirm the fix.' : ''}</span>}
      </div>
      <p className="ad-muted">Forward only records that the report was passed on. Fixed reports are confirmed or reopened by riders, not staff.</p>
    </section>
  );
}

function Reports({ token, onAuth }) {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const guard = useGuard(onAuth);

  const load = useCallback((s) => guard(async () => {
    const d = await listRwReports(token, s);
    setReports(d.reports); setError('');
  }, setError), [token, guard]);

  useEffect(() => { load(status); }, [status, load]);

  const current = reports?.find((r) => r.id === picked) || null;

  async function run(kind, body) {
    setBusy(true); setMsg(null);
    const ok = await guard(async () => {
      if (kind === 'forward') await rwForward(token, picked, body); else await rwSetStatus(token, picked, body);
      return true;
    }, (text) => setMsg({ kind: 'error', text }));
    if (ok) setMsg({ kind: 'ok', text: kind === 'forward' ? 'Recorded as passed on.' : `Marked ${statusLabel(body.status).toLowerCase()}.` });
    await load(status); // also after a failure, so a stale row shows what the server now says
    setBusy(false);
  }

  return (
    <div className="rw-block">
      <div className="ad-row">
        <div className="ad-modes" role="group" aria-label="Filter by status">
          {REPORT_STATUSES.map((s) => <button key={s} type="button" aria-checked={status === s} role="checkbox" onClick={() => { setStatus(s); setReports(null); setPicked(null); setMsg(null); }}>{statusLabel(s)}</button>)}
        </div>
        <button type="button" onClick={() => load(status)}>Refresh</button>
      </div>
      {error && <p className="ad-msg error">{error}</p>}
      {!reports && !error && <p className="ad-muted">Loading…</p>}
      {reports && (
        <table className="ad-table rw-table">
          <thead><tr><th>Type</th><th>Severity</th><th>Where</th><th>Age</th><th>+1</th><th>Status</th></tr></thead>
          <tbody>
            {reports.length === 0 && <tr><td colSpan="6" className="ad-muted">No reports with this status.</td></tr>}
            {reports.map((r) => (
              <tr key={r.id} className={picked === r.id ? 'on' : ''} onClick={() => { setPicked(r.id); setMsg(null); }} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setPicked(r.id)}>
                <td>{typeLabel(r.type)}</td><td>{severityLabel(r.severity)}</td><td className="rw-where">{placeLabel(r)}</td>
                <td>{ageLabel(r.created_at)}</td><td>{r.plus_one_count}</td><td><span className={`ad-badge rw-${r.status}`}>{statusLabel(r.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {picked && !current && reports && <p className="ad-muted">That report is no longer in this list.</p>}
      {current && <ReportDetail key={`${current.id}:${current.status}`} report={current} busy={busy} run={run} msg={msg} />}
    </div>
  );
}

function PhotoCard({ photo, token, busy, onReview, onAuth }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    let made = '';
    fetchRwPhotoBlob(token, photo.id, ctl.signal).then((b) => { made = URL.createObjectURL(b); setUrl(made); })
      .catch((e) => { if (e?.name === 'AbortError') return; if (e instanceof ApiError && e.status === 401) onAuth(); else setFailed(true); });
    return () => { ctl.abort(); if (made) URL.revokeObjectURL(made); };
  }, [token, photo.id, onAuth]);

  return (
    <li className="rw-photo">
      <div className="rw-thumb">
        {url ? <img src={url} alt={`Photo for ${typeLabel(photo.report_type)} at ${photo.location_label || 'an unlabelled spot'}`} /> : <span className="ad-muted">{failed ? 'Could not load this photo.' : 'Loading…'}</span>}
      </div>
      <div className="rw-photo-meta">
        <b>{typeLabel(photo.report_type)}</b>
        <span>{photo.location_label || 'Unlabelled spot'}</span>
        <span className="ad-muted">{formatBytes(photo.byte_size)} · {ageLabel(photo.created_at)} ago</span>
      </div>
      <div className="ad-row">
        <button type="button" className="ad-primary" disabled={busy} onClick={() => window.confirm(confirmText.approve()) && onReview(photo, true)}>Approve</button>
        <button type="button" className="ad-danger" disabled={busy} onClick={() => {
          const reason = window.prompt(`Reject this photo? You can add a reason (optional, up to ${MAX_REASON} characters).`, '');
          if (reason !== null) onReview(photo, false, reason);
        }}>Reject</button>
      </div>
    </li>
  );
}

function Photos({ token, onAuth, onCount }) {
  const [photos, setPhotos] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const guard = useGuard(onAuth);

  const load = useCallback(() => guard(async () => {
    const d = await listRwPhotos(token);
    setPhotos(d.photos); onCount(d.photos.length); setError('');
  }, setError), [token, guard, onCount]);
  useEffect(() => { load(); }, [load]);

  async function review(photo, approve, reason) {
    const body = approve ? {} : rejectBody(reason);
    if (!body) { setMsg({ kind: 'error', text: `The reason is too long (up to ${MAX_REASON} characters).` }); return; }
    setBusy(true); setMsg(null);
    const ok = await guard(async () => { await (approve ? approveRwPhoto(token, photo.id) : rejectRwPhoto(token, photo.id, body)); return true; }, (text) => setMsg({ kind: 'error', text }));
    if (ok) setMsg({ kind: 'ok', text: approve ? 'Photo approved.' : 'Photo rejected.' });
    await load();
    setBusy(false);
  }

  return (
    <div className="rw-block">
      <div className="ad-row"><button type="button" onClick={load}>Refresh</button><span className="ad-muted">Photos are checked by a moderator before other people see them.</span></div>
      {error && <p className="ad-msg error">{error}</p>}
      {msg && <p className={`ad-msg ${msg.kind}`}>{msg.text}</p>}
      {!photos && !error && <p className="ad-muted">Loading…</p>}
      {photos && photos.length === 0 && <p className="ad-muted">No photos are waiting.</p>}
      {photos && photos.length > 0 && <ul className="rw-photos">{photos.map((p) => <PhotoCard key={p.id} photo={p} token={token} busy={busy} onReview={review} onAuth={onAuth} />)}</ul>}
    </div>
  );
}

export default function RoadWatch({ token, onAuth, onPhotoCount }) {
  return (
    <div className="rw">
      <h2 className="rw-h">Reports</h2>
      <Reports token={token} onAuth={onAuth} />
      <h2 className="rw-h">Photos waiting</h2>
      <Photos token={token} onAuth={onAuth} onCount={onPhotoCount} />
    </div>
  );
}

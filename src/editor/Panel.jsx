import { CATEGORIES, CATEGORY_LABELS } from './format';
import { COLORS } from './colors';
import { CATEGORY_LABELS as LABELS } from './format';

const Field = ({ label, children }) => (
  <label className="qe-field"><span>{label}</span>{children}</label>
);

export function PlaceForm({ place, areas, onChange, onDelete }) {
  const set = (k) => (e) => onChange({ [k]: e.target.value });
  return (
    <div className="qe-card">
      <h3>Place</h3>
      <Field label="Name"><input value={place.name} onChange={set('name')} autoFocus={typeof window !== 'undefined' && window.matchMedia('(min-width: 801px)').matches} /></Field>
      <Field label="Category">
        <select value={place.category} onChange={set('category')}>
          <option value="">Pick one…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </Field>
      <Field label="Type (shown as the hint, e.g. tea stall)"><input value={place.subcategory} onChange={set('subcategory')} /></Field>
      <Field label="Hook (one teasing line, optional)"><textarea rows={2} value={place.hook} onChange={set('hook')} /></Field>
      <Field label="Area (the chapter it belongs to)">
        <input list="qe-areas" value={place.area} onChange={set('area')} />
        <datalist id="qe-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
      </Field>
      <Field label="Radius in metres (blank = automatic)">
        <input type="number" min="10" max="500" value={place.radius_m ?? ''} onChange={(e) => onChange({ radius_m: e.target.value === '' ? null : Number(e.target.value) })} />
      </Field>
      <p className="qe-muted">{place.lat.toFixed(6)}, {place.lng.toFixed(6)} · to move it: drag the pin (on a phone, press and hold the selected pin, then drag){place.updated_by ? ` · last saved by ${place.updated_by}` : ''}</p>
      <button className="qe-danger" onClick={onDelete}>Delete place</button>
    </div>
  );
}

export function CandidateCard({ candidate, onAccept, onReject }) {
  return (
    <div className="qe-card">
      <h3>Suggestion</h3>
      <p><strong>{candidate.name}</strong></p>
      <p className="qe-muted">{candidate.subcategory || 'unknown type'} · confidence {candidate.confidence}{candidate.category ? ` · ${CATEGORY_LABELS[candidate.category]}` : ''}</p>
      <div className="qe-row"><button onClick={onAccept}>Add to book</button><button className="qe-ghost" onClick={onReject}>Not a fit</button></div>
    </div>
  );
}

export function Legend() {
  return (
    <p className="qe-legend">
      {CATEGORIES.map((c) => <span key={c}><i style={{ background: COLORS[c] }} />{CATEGORY_LABELS[c]}</span>)}
      <span><i className="qe-hollow" />suggestion</span>
    </p>
  );
}

export function Online({ peers, you, status, places }) {
  const nameOf = (id) => places.find((p) => p.id === id)?.name || 'a new place';
  return (
    <div className="qe-card">
      <h3>Online · {peers.length}{status !== 'live' && <span className="qe-warn"> ({status === 'connecting' ? 'connecting…' : 'reconnecting…'})</span>}</h3>
      <ul className="qe-peers">
        {peers.map((p) => (
          <li key={p.id}><i style={{ background: p.color }} />{p.name}{p.id === you?.id ? ' (you)' : ''}{p.selected && p.id !== you?.id ? <span className="qe-muted"> · has “{nameOf(p.selected)}” open</span> : null}</li>
        ))}
      </ul>
    </div>
  );
}

const pretty = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

/** For using the editor on location: find me, add a place where I stand, and what is already around me. */
export function Here({ here, error, nearbyItems, switchTo, onFind, onAddHere, onPick, onSwitch }) {
  return (
    <div className="qe-card qe-here">
      <h3>Where I am</h3>
      <div className="qe-row">
        <button onClick={onFind}>{here ? 'Re-centre on me' : 'Find me'}</button>
        <button disabled={!here} onClick={onAddHere}>Add a place here</button>
      </div>
      {error && <p className="qe-error">{error}</p>}
      {here && <p className={`qe-muted${here.accuracy > 30 ? ' qe-warn' : ''}`}>GPS accuracy ±{Math.round(here.accuracy)} m{here.accuracy > 30 ? ' · weak: wait a moment or drag the pin afterwards' : ''}</p>}
      {switchTo && <button className="qe-ghost" onClick={onSwitch}>You're in {switchTo.label}: switch to that book</button>}
      {here && !switchTo && (
        <ul className="qe-nearby">
          {nearbyItems.length === 0 && <li className="qe-muted">Nothing within 250 m yet. Add the first place here.</li>}
          {nearbyItems.map(({ item, meters, kind }) => (
            <li key={`${kind}-${item.id}`}>
              <button className="qe-link qe-plain" onClick={() => onPick(kind, item.id)}>
                <i style={{ background: COLORS[item.category] || '#8a8a8a' }} className={kind === 'candidate' ? 'qe-hollow' : ''} />
                {item.name || 'Unnamed place'}
              </button>
              <span className="qe-muted"> {pretty(meters)}{kind === 'candidate' ? ' · suggestion' : item.category ? ` · ${LABELS[item.category]}` : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

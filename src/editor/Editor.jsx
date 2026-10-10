import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraft } from './draft';
import MapView from './MapView';
import { CandidateCard, Legend, Online, PlaceForm } from './Panel';
import { toBookJson, toCsv, validate } from './format';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export default function Editor({ token, view, views, onView, voxel, candidates: raw, defaultBook, onLogout, onAuthLost }) {
  const d = useDraft({ token, view, defaultBook, onAuthLost });
  const [hint, setHint] = useState('');
  const [mode, setMode] = useState('select'); // select | add | region
  const [base, setBase] = useState('both');
  const [voxelOpacity, setVoxelOpacity] = useState(0.7);
  const [showCandidates, setShowCandidates] = useState(true);
  const [selected, setSelected] = useState(null);
  const [drawing, setDrawing] = useState([]);
  const [lastArea, setLastArea] = useState('');

  const candidates = useMemo(() => {
    const done = new Set(d.done);
    return raw.map((c, i) => ({ ...c, id: `c${i}` })).filter((c) => !done.has(c.id));
  }, [raw, d.done]);
  const issues = useMemo(() => validate(d.book, d.places), [d.book, d.places]);
  const errors = useMemo(() => issues.filter((i) => i.level === 'error'), [issues]);
  const warnings = issues.length - errors.length;
  const areas = useMemo(() => [...new Set(d.places.map((p) => p.area).filter(Boolean))].sort(), [d.places]);

  const openId = selected?.kind === 'place' ? selected.id : '';
  const { announceSelection } = d;
  useEffect(() => { announceSelection(openId); }, [openId, announceSelection]);

  const { editPlace, addPlace, finishSuggestions } = d;
  const add = useCallback((fields) => {
    const id = addPlace({ area: lastArea, ...fields });
    setSelected({ kind: 'place', id });
    setMode('select');
  }, [addPlace, lastArea]);
  const patch = (id, p) => { if (p.area) setLastArea(p.area); editPlace(id, p); };
  const onMove = useCallback((id, ll) => editPlace(id, { lat: ll.lat, lng: ll.lng }), [editPlace]);

  const sel = selected && (selected.kind === 'place' ? d.places.find((p) => p.id === selected.id) : candidates.find((c) => c.id === selected.id));
  const accept = (c) => { add({ name: c.name, category: c.category, subcategory: c.subcategory, lat: c.lat, lng: c.lng }); finishSuggestions([c.id]); };
  const finishRegion = () => {
    if (drawing.length >= 3) d.editBook({ ring: drawing });
    setDrawing([]);
    setMode('select');
  };
  const exportFiles = () => {
    download(`${d.book.slug}.book.json`, toBookJson(d.book), 'application/json');
    download(`${d.book.slug}.places.csv`, toCsv(d.places), 'text/csv');
  };
  const setField = (k) => (e) => d.editBook({ [k]: e.target.value });
  const reload = async () => {
    if (!window.confirm(`Replace the shared ${views[view].label} draft with what is live on the server right now? Everyone's unexported edits to this book are lost.`)) return;
    try { await d.reloadFromServer(); } catch (e) { window.alert(`Couldn't reload: ${e.message}`); }
  };

  if (!d.ready) return <p className="qe-center">{d.status === 'reconnecting' ? 'Reconnecting to Honbu…' : `Loading the shared ${views[view].label} draft…`}</p>;

  return (
    <div className="qe-shell">
      <MapView
        voxel={voxel} token={token} onHint={setHint} base={base} voxelOpacity={voxelOpacity} ring={d.book.ring} drawingRing={drawing} places={d.places} candidates={candidates}
        showCandidates={showCandidates} selected={selected?.id} peerSelections={d.peerSelections} mode={mode} onSelect={setSelected} onMove={onMove}
        onAdd={(ll) => add({ lat: ll.lat, lng: ll.lng })} onRingPoint={(ll) => setDrawing((r) => [...r, [ll.lng, ll.lat]])}
      />
      <aside className="qe-panel">
        <header><h1>Quest book editor</h1><button className="qe-ghost" onClick={onLogout}>Log out</button></header>
        <div className="qe-tabs" role="tablist">
          {Object.entries(views).map(([id, v]) => <button key={id} role="tab" aria-selected={id === view} className={id === view ? 'on' : 'qe-ghost'} onClick={() => id !== view && onView(id)}>{v.label}</button>)}
        </div>
        {d.notices.map((n) => <p key={n.id} className="qe-notice" role="status">{n.text}</p>)}

        <Online peers={d.peers} you={d.you} status={d.status} places={d.places} />

        <div className="qe-card">
          <h3>Book</h3>
          <label className="qe-field"><span>Slug</span><input value={d.book.slug} onChange={setField('slug')} /></label>
          <label className="qe-field"><span>Name</span><input value={d.book.name} onChange={setField('name')} /></label>
          <label className="qe-field"><span>College domain (only that college can open it; blank = open to everyone)</span><input value={d.book.college_domain} onChange={setField('college_domain')} /></label>
          <button className="qe-ghost" onClick={reload}>Reload from the server's live book…</button>
        </div>

        <div className="qe-card">
          <h3>Map</h3>
          <div className="qe-row">
            {[['voxel', 'Voxel'], ['satellite', 'Satellite'], ['both', 'Both']].map(([k, l]) => (
              <button key={k} className={base === k ? 'on' : 'qe-ghost'} onClick={() => setBase(k)}>{l}</button>
            ))}
          </div>
          {base === 'both' && <label className="qe-field"><span>Voxel opacity</span><input type="range" min="0.1" max="1" step="0.05" value={voxelOpacity} onChange={(e) => setVoxelOpacity(+e.target.value)} /></label>}
          {raw.length > 0 && <label className="qe-check"><input type="checkbox" checked={showCandidates} onChange={(e) => setShowCandidates(e.target.checked)} /> Show {candidates.length} suggestions</label>}
          {hint && <p className="qe-muted">{hint}</p>}
          <div className="qe-row">
            <button className={mode === 'select' ? 'on' : 'qe-ghost'} onClick={() => { setMode('select'); setDrawing([]); }}>Select</button>
            <button className={mode === 'add' ? 'on' : 'qe-ghost'} onClick={() => setMode('add')}>Add place</button>
            <button className={mode === 'region' ? 'on' : 'qe-ghost'} onClick={() => { setMode('region'); setDrawing([]); }}>Draw region</button>
          </div>
          {mode === 'region' && (
            <div className="qe-row">
              <span className="qe-muted">{drawing.length} points</span>
              <button disabled={drawing.length < 3} onClick={finishRegion}>Finish</button>
              <button className="qe-ghost" onClick={() => { setDrawing([]); setMode('select'); }}>Cancel</button>
            </div>
          )}
          <Legend />
        </div>

        {sel && selected.kind === 'place' && <PlaceForm place={sel} areas={areas} onChange={(p) => patch(sel.id, p)} onDelete={() => { d.deletePlace(sel.id); setSelected(null); }} />}
        {sel && selected.kind === 'candidate' && <CandidateCard candidate={sel} onAccept={() => accept(sel)} onReject={() => { finishSuggestions([sel.id]); setSelected(null); }} />}

        <div className="qe-card">
          <h3>{d.places.length} places</h3>
          {errors.length > 0 && (
            <ul className="qe-errors">
              {errors.slice(0, 8).map((e, i) => <li key={i}>{e.id ? <button className="qe-link" onClick={() => setSelected({ kind: 'place', id: e.id })}>{e.message}</button> : e.message}</li>)}
              {errors.length > 8 && <li className="qe-muted">…and {errors.length - 8} more</li>}
            </ul>
          )}
          {warnings > 0 && <p className="qe-muted">{warnings} warning{warnings === 1 ? '' : 's'} (same name and spot as another place); they don't block export.</p>}
          <button disabled={errors.length > 0 || d.places.length === 0} onClick={exportFiles}>Export book.json + places.csv</button>
          <p className="qe-muted">Seed with <code>python3 tools/seed_quests.py --book {d.book.slug}.book.json --csv {d.book.slug}.places.csv --dry-run</code> in kurukuru-honbu. Everything here is shared live with the other editors.</p>
        </div>
      </aside>
    </div>
  );
}

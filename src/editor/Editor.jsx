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

export default function Editor({ token, region, candidates: raw, onLogout, onAuthLost }) {
  const d = useDraft({ token, region, onAuthLost });
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
  const errors = useMemo(() => validate(d.book, d.places), [d.book, d.places]);
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

  if (!d.ready) return <p className="qe-center">{d.status === 'reconnecting' ? 'Reconnecting to Honbu…' : 'Loading the shared draft…'}</p>;

  return (
    <div className="qe-shell">
      <MapView
        region={region} base={base} voxelOpacity={voxelOpacity} ring={d.book.ring} drawingRing={drawing} places={d.places} candidates={candidates}
        showCandidates={showCandidates} selected={selected?.id} peerSelections={d.peerSelections} mode={mode} onSelect={setSelected} onMove={onMove}
        onAdd={(ll) => add({ lat: ll.lat, lng: ll.lng })} onRingPoint={(ll) => setDrawing((r) => [...r, [ll.lng, ll.lat]])}
      />
      <aside className="qe-panel">
        <header><h1>Quest book editor</h1><button className="qe-ghost" onClick={onLogout}>Log out</button></header>
        {d.notices.map((n) => <p key={n.id} className="qe-notice" role="status">{n.text}</p>)}

        <Online peers={d.peers} you={d.you} status={d.status} places={d.places} />

        <div className="qe-card">
          <h3>Book</h3>
          <label className="qe-field"><span>Slug</span><input value={d.book.slug} onChange={setField('slug')} /></label>
          <label className="qe-field"><span>Name</span><input value={d.book.name} onChange={setField('name')} /></label>
          <label className="qe-field"><span>College domain (only that college can open it)</span><input value={d.book.college_domain} onChange={setField('college_domain')} /></label>
        </div>

        <div className="qe-card">
          <h3>Map</h3>
          <div className="qe-row">
            {[['voxel', 'Voxel'], ['satellite', 'Satellite'], ['both', 'Both']].map(([k, l]) => (
              <button key={k} className={base === k ? 'on' : 'qe-ghost'} onClick={() => setBase(k)}>{l}</button>
            ))}
          </div>
          {base === 'both' && <label className="qe-field"><span>Voxel opacity</span><input type="range" min="0.1" max="1" step="0.05" value={voxelOpacity} onChange={(e) => setVoxelOpacity(+e.target.value)} /></label>}
          <label className="qe-check"><input type="checkbox" checked={showCandidates} onChange={(e) => setShowCandidates(e.target.checked)} /> Show {candidates.length} suggestions</label>
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
          <button disabled={errors.length > 0 || d.places.length === 0} onClick={exportFiles}>Export book.json + places.csv</button>
          <p className="qe-muted">Seed with <code>python3 tools/seed_quests.py --book {d.book.slug}.book.json --csv {d.book.slug}.places.csv --dry-run</code> in kurukuru-honbu. Everything here is shared live with the other editors.</p>
        </div>
      </aside>
    </div>
  );
}

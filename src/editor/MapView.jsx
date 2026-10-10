import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COLORS } from './colors';
import { regionCorners, regionToCanvas } from './voxel';
import { createTileLayer } from './voxelTiles';

const colorExpr = ['match', ['get', 'category'], ...Object.entries(COLORS).flat(), '#8a8a8a'];
const EMPTY = { type: 'FeatureCollection', features: [] };

const points = (items, extra = () => ({})) => ({
  type: 'FeatureCollection',
  features: items.map((p) => ({ type: 'Feature', id: undefined, properties: { id: p.id, category: p.category || '', ...extra(p) }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } })),
});

function ringGeoJSON(ring, open) {
  if (ring.length < 2) return EMPTY;
  const coords = open ? ring : [...ring, ring[0]];
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: open ? 'LineString' : 'Polygon', coordinates: open ? coords : [coords] } }] };
}

const STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    sat: {
      type: 'raster', tileSize: 256, maxzoom: 19,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#dfe6c3' } }, { id: 'sat', type: 'raster', source: 'sat' }],
};

/** The map: base layers, region outline, places and candidates. All state lives in the parent. */
export default function MapView({ voxel, token, onHint, base, voxelOpacity, ring, drawingRing, places, candidates, showCandidates, selected, peerSelections, mode, locateTick, onLocate, onLocateError, onSelect, onAdd, onRingPoint, onMove }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const cb = useRef({});
  const drag = useRef({ id: null, moved: false });
  const tiles = useRef(null);
  const geo = useRef(null);
  const lastFix = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { cb.current = { onSelect, onAdd, onRingPoint, onMove, onLocate, onLocateError, mode }; });

  useEffect(() => {
    const map = new maplibregl.Map({ container: el.current, style: STYLE, center: [85.8166, 20.3541], zoom: 14, maxZoom: 21, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const locate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, timeout: 20000 }, trackUserLocation: true, showAccuracyCircle: true, showUserLocation: true,
      fitBoundsOptions: { maxZoom: 19 },
    });
    map.addControl(locate, 'top-right');
    geo.current = locate;
    locate.on('geolocate', (e) => {
      lastFix.current = [e.coords.longitude, e.coords.latitude];
      cb.current.onLocate?.({ lat: e.coords.latitude, lng: e.coords.longitude, accuracy: e.coords.accuracy });
    });
    locate.on('error', (e) => cb.current.onLocateError?.(e.code === 1 ? 'Location is blocked for this page. Allow it in your browser settings and try again.' : "Couldn't get your location. Try again outdoors or with location turned on."));
    map.on('load', () => {
      for (const id of ['region', 'region-line', 'candidates', 'places', 'draft']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'region-fill', type: 'fill', source: 'region', paint: { 'fill-color': '#ffd23f', 'fill-opacity': 0.08 } });
      map.addLayer({ id: 'region-outline', type: 'line', source: 'region', paint: { 'line-color': '#ffd23f', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#ff5a36', 'line-width': 3 } });
      map.addLayer({ id: 'candidates', type: 'circle', source: 'candidates', paint: { 'circle-radius': 5, 'circle-color': 'rgba(255,255,255,0.25)', 'circle-stroke-width': 2, 'circle-stroke-color': colorExpr } });
      map.addLayer({ id: 'places', type: 'circle', source: 'places', paint: { 'circle-radius': ['case', ['get', 'sel'], 10, ['!=', ['get', 'peer'], ''], 10, 7], 'circle-color': colorExpr, 'circle-stroke-width': ['case', ['get', 'sel'], 4, ['!=', ['get', 'peer'], ''], 4, 2], 'circle-stroke-color': ['case', ['!=', ['get', 'peer'], ''], ['get', 'peer'], '#fff'] } });
      map.addLayer({ id: 'places-label', type: 'symbol', source: 'places', minzoom: 16, layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'] }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      // invisible, larger targets so a fingertip can hit a pin
      map.addLayer({ id: 'candidates-hit', type: 'circle', source: 'candidates', paint: { 'circle-radius': 16, 'circle-opacity': 0 } });
      map.addLayer({ id: 'places-hit', type: 'circle', source: 'places', paint: { 'circle-radius': 18, 'circle-opacity': 0 } });
      for (const layer of ['places-hit', 'candidates-hit']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      const start = (e) => {
        if (cb.current.mode !== 'select') return;
        e.preventDefault();
        drag.current = { id: e.features[0].properties.id, moved: false };
        map.dragPan.disable();
      };
      const move = (e) => {
        if (!drag.current.id) return;
        drag.current.moved = true;
        cb.current.onMove(drag.current.id, e.lngLat);
      };
      map.on('mousedown', 'places-hit', start);
      map.on('touchstart', 'places-hit', start); // phones: press a pin and drag it
      map.on('mousemove', move);
      map.on('touchmove', move);
      const end = () => {
        if (!drag.current.id) return;
        map.dragPan.enable();
        const moved = drag.current.moved;
        drag.current = { id: null, moved: false };
        if (moved) { drag.current.justDragged = true; setTimeout(() => { drag.current.justDragged = false; }, 50); }
      };
      map.on('mouseup', end);
      map.on('touchend', end);
      map.on('click', (e) => {
        if (drag.current.justDragged) return;
        const { mode: m } = cb.current;
        if (m === 'add') return cb.current.onAdd(e.lngLat);
        if (m === 'region') return cb.current.onRingPoint(e.lngLat);
        const hit = map.queryRenderedFeatures(e.point, { layers: ['places-hit', 'candidates-hit'] })[0];
        cb.current.onSelect(hit ? { kind: hit.layer.id === 'places-hit' ? 'place' : 'candidate', id: hit.properties.id } : null);
      });
      setReady(true);
    });
    return () => { map.remove(); mapRef.current = null; setReady(false); };
  }, []);

  // KIIT: one baked region drawn as a single image
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || voxel.kind !== 'region') return;
    const region = voxel.region;
    const url = regionToCanvas(region).toDataURL();
    if (map.getLayer('voxel')) map.removeLayer('voxel');
    if (map.getSource('voxel')) map.removeSource('voxel');
    map.addSource('voxel', { type: 'image', url, coordinates: regionCorners(region) });
    map.addLayer({ id: 'voxel', type: 'raster', source: 'voxel', paint: { 'raster-resampling': 'nearest' } }, 'region-fill');
    map.fitBounds([[region.west, region.south], [region.east, region.north]], { padding: 40, duration: 0 });
  }, [ready, voxel]);

  // Bengaluru: tiles in view, loaded as you pan and zoom
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || voxel.kind !== 'tiles') return undefined;
    const m = voxel.manifests.coarse;
    map.fitBounds([[m.west, m.south], [m.east, m.north]], { padding: 40, duration: 0 });
    const layer = createTileLayer(map, { token, manifests: voxel.manifests, beforeId: 'region-fill', onHint });
    tiles.current = layer;
    const go = () => layer.refresh();
    map.on('moveend', go);
    go();
    return () => { map.off('moveend', go); layer.destroy(); tiles.current = null; };
  }, [ready, voxel, token, onHint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready) return;
    const sat = base !== 'voxel';
    const vox = base !== 'satellite';
    map.setLayoutProperty('sat', 'visibility', sat ? 'visible' : 'none');
    if (map.getLayer('voxel')) {
      map.setLayoutProperty('voxel', 'visibility', vox ? 'visible' : 'none');
      map.setPaintProperty('voxel', 'raster-opacity', base === 'both' ? voxelOpacity : 1);
    }
    tiles.current?.setStyle({ visible: vox, opacity: base === 'both' ? voxelOpacity : 1 });
  }, [ready, base, voxelOpacity, voxel]);

  useEffect(() => {
    if (!ready || locateTick === 0) return;
    // the control is a toggle, so once it has a fix "find me" must fly there instead of triggering it again (which would switch tracking off)
    if (lastFix.current) mapRef.current.easeTo({ center: lastFix.current, zoom: Math.max(mapRef.current.getZoom(), 18) });
    else geo.current?.trigger();
  }, [ready, locateTick]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    map.getSource('places').setData(points(places, (p) => ({ name: p.name, sel: p.id === selected, peer: peerSelections[p.id]?.color || '' })));
    map.getSource('candidates').setData(points(showCandidates ? candidates : []));
    map.getSource('region').setData(ringGeoJSON(ring, false));
    map.getSource('draft').setData(ringGeoJSON(drawingRing, true));
    map.getCanvas().style.cursor = mode === 'select' ? '' : 'crosshair';
  }, [ready, places, candidates, showCandidates, ring, drawingRing, selected, peerSelections, mode]);

  return <div ref={el} className="qe-map" />;
}

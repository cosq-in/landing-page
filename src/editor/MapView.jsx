import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { COLORS } from './colors';
import { regionCorners, regionToCanvas } from './voxel';

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
export default function MapView({ region, base, voxelOpacity, ring, drawingRing, places, candidates, showCandidates, selected, mode, onSelect, onAdd, onRingPoint, onMove }) {
  const el = useRef(null);
  const mapRef = useRef(null);
  const cb = useRef({});
  const drag = useRef({ id: null, moved: false });
  const [ready, setReady] = useState(false);
  useEffect(() => { cb.current = { onSelect, onAdd, onRingPoint, onMove, mode }; });

  useEffect(() => {
    const map = new maplibregl.Map({ container: el.current, style: STYLE, center: [85.8166, 20.3541], zoom: 14, maxZoom: 21, attributionControl: { compact: true } });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      for (const id of ['region', 'region-line', 'candidates', 'places', 'draft']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'region-fill', type: 'fill', source: 'region', paint: { 'fill-color': '#ffd23f', 'fill-opacity': 0.08 } });
      map.addLayer({ id: 'region-outline', type: 'line', source: 'region', paint: { 'line-color': '#ffd23f', 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
      map.addLayer({ id: 'draft-line', type: 'line', source: 'draft', paint: { 'line-color': '#ff5a36', 'line-width': 3 } });
      map.addLayer({ id: 'candidates', type: 'circle', source: 'candidates', paint: { 'circle-radius': 5, 'circle-color': 'rgba(255,255,255,0.25)', 'circle-stroke-width': 2, 'circle-stroke-color': colorExpr } });
      map.addLayer({ id: 'places', type: 'circle', source: 'places', paint: { 'circle-radius': ['case', ['get', 'sel'], 10, 7], 'circle-color': colorExpr, 'circle-stroke-width': ['case', ['get', 'sel'], 4, 2], 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'places-label', type: 'symbol', source: 'places', minzoom: 16, layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-font': ['Open Sans Regular'] }, paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      for (const layer of ['places', 'candidates']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      map.on('mousedown', 'places', (e) => {
        if (cb.current.mode !== 'select') return;
        e.preventDefault();
        drag.current = { id: e.features[0].properties.id, moved: false };
        map.dragPan.disable();
      });
      map.on('mousemove', (e) => {
        if (!drag.current.id) return;
        drag.current.moved = true;
        cb.current.onMove(drag.current.id, e.lngLat);
      });
      map.on('mouseup', () => {
        if (!drag.current.id) return;
        map.dragPan.enable();
        const moved = drag.current.moved;
        drag.current = { id: null, moved: false };
        if (moved) { drag.current.justDragged = true; setTimeout(() => { drag.current.justDragged = false; }, 50); }
      });
      map.on('click', (e) => {
        if (drag.current.justDragged) return;
        const { mode: m } = cb.current;
        if (m === 'add') return cb.current.onAdd(e.lngLat);
        if (m === 'region') return cb.current.onRingPoint(e.lngLat);
        const hit = map.queryRenderedFeatures(e.point, { layers: ['places', 'candidates'] })[0];
        cb.current.onSelect(hit ? { kind: hit.layer.id === 'places' ? 'place' : 'candidate', id: hit.properties.id } : null);
      });
      setReady(true);
    });
    return () => { map.remove(); mapRef.current = null; setReady(false); };
  }, []);

  // voxel image source, rebuilt when the region data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !region) return;
    const url = regionToCanvas(region).toDataURL();
    if (map.getLayer('voxel')) map.removeLayer('voxel');
    if (map.getSource('voxel')) map.removeSource('voxel');
    map.addSource('voxel', { type: 'image', url, coordinates: regionCorners(region) });
    map.addLayer({ id: 'voxel', type: 'raster', source: 'voxel', paint: { 'raster-resampling': 'nearest' } }, 'region-fill');
    map.fitBounds([[region.west, region.south], [region.east, region.north]], { padding: 40, duration: 0 });
  }, [ready, region]);

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
  }, [ready, base, voxelOpacity, region]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    map.getSource('places').setData(points(places, (p) => ({ name: p.name, sel: p.id === selected })));
    map.getSource('candidates').setData(points(showCandidates ? candidates : []));
    map.getSource('region').setData(ringGeoJSON(ring, false));
    map.getSource('draft').setData(ringGeoJSON(drawingRing, true));
    map.getCanvas().style.cursor = mode === 'select' ? '' : 'crosshair';
  }, [ready, places, candidates, showCandidates, ring, drawingRing, selected, mode]);

  return <div ref={el} className="qe-map" />;
}

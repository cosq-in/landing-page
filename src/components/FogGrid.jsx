import { useMemo, useState } from 'react';

const COLS = 14;
const ROWS = 9;
const PLAYER = [3, 4];
const BUILDINGS = [[1, 1], [11, 2], [10, 6], [5, 7]];
const TREES = [[0, 0], [5, 1], [12, 0], [0, 6], [8, 8], [13, 5], [2, 8], [12, 7]];
const FLAGS = [[2, 5, false], [11, 3, true]];

const riverAt = (y) => (y < 3 ? [7, 8] : y < 6 ? [6, 7] : [8, 9]);
const has = (list, x, y) => list.some((t) => t[0] === x && t[1] === y);

function buildTiles() {
  const tiles = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const [r0, r1] = riverAt(y);
      const water = x >= r0 && x <= r1;
      const sand = !water && x >= r0 - 1 && x <= r1 + 1;
      const path = y === 4 || x === 3;
      let kind = `g${(x + y) % 2}`;
      if (water && path) kind = 'br';
      else if (water) kind = 'w';
      else if (path) kind = 'p';
      else if (sand) kind = 's';
      tiles.push({
        x,
        y,
        kind,
        tree: kind[0] === 'g' && has(TREES, x, y),
        building: has(BUILDINGS, x, y),
        flag: FLAGS.find((f) => f[0] === x && f[1] === y),
        player: x === PLAYER[0] && y === PLAYER[1],
      });
    }
  }
  return tiles;
}

/** Reveals tiles within radius r of (cx, cy), recording a stagger delay per tile. */
function reveal(prev, cx, cy, r) {
  const next = new Map(prev);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const d = Math.hypot(x - cx, y - cy);
      const i = y * COLS + x;
      if (d <= r && !next.has(i)) next.set(i, Math.round(d * 80));
    }
  }
  return next;
}

export default function FogGrid() {
  const tiles = useMemo(() => buildTiles(), []);
  const [open, setOpen] = useState(() => reveal(new Map(), PLAYER[0], PLAYER[1], 2.6));
  const pct = Math.round((open.size / tiles.length) * 100);

  return (
    <div className="blk fogwrap">
      <div className="fog">
        {tiles.map((t, i) => {
          const delay = open.get(i);
          const cls = ['t', t.kind, t.tree && 'tr', t.building && 'bd', delay === undefined && 'fogged'].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={i}
              className={cls}
              style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
              onClick={() => setOpen((prev) => reveal(prev, t.x, t.y, 1.6))}
              aria-label={`Explore tile ${t.x + 1}, ${t.y + 1}`}
            >
              {t.building && <span className="q">?</span>}
              {t.flag && <span className={`fl ${t.flag[2] ? 'gd' : ''}`} />}
              {t.player && <span className="pl" />}
            </button>
          );
        })}
      </div>
      <div className="fstat">
        <span>Click a gray block to explore it</span>
        <span className="px" style={{ fontSize: 20 }}>{pct}%</span>
      </div>
    </div>
  );
}

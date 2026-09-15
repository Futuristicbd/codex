// charts.js — dependency-free inline SVG charts (line, bars, donut).
import { el } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';

function svg(attrs = {}) {
  const s = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  return s;
}
function node(name, attrs = {}) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// Smooth area line chart from an array of numbers.
export function lineChart(values, { color = '#4f46e5', height = 160 } = {}) {
  const w = 520;
  const h = height;
  const pad = 12;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1 || 1);
  const pts = values.map((v, i) => [
    pad + i * step,
    h - pad - ((v - min) / range) * (h - pad * 2),
  ]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;

  const s = svg({ viewBox: `0 0 ${w} ${h}`, class: 'chart', preserveAspectRatio: 'none' });
  const gid = `g${Math.random().toString(36).slice(2, 7)}`;
  const defs = node('defs');
  const grad = node('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.append(node('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '0.35' }));
  grad.append(node('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }));
  defs.append(grad);
  s.append(defs);
  s.append(node('path', { d: area, fill: `url(#${gid})` }));
  s.append(node('path', { d: line, fill: 'none', stroke: color, 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  for (const pt of pts) {
    s.append(node('circle', { cx: pt[0], cy: pt[1], r: '2.5', fill: '#fff', stroke: color, 'stroke-width': '2' }));
  }
  return s;
}

// Vertical bar chart. data = [{label, value}]
export function barChart(data, { color = '#0ea5e9', height = 180 } = {}) {
  const w = 520;
  const h = height;
  const pad = 22;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (w - pad * 2) / data.length;
  const s = svg({ viewBox: `0 0 ${w} ${h}`, class: 'chart' });
  data.forEach((d, i) => {
    const bh = ((d.value / max) * (h - pad * 2));
    const x = pad + i * bw + bw * 0.2;
    const y = h - pad - bh;
    s.append(node('rect', { x, y, width: bw * 0.6, height: Math.max(bh, 1), rx: 5, fill: color, opacity: 0.85 }));
    const label = node('text', { x: x + bw * 0.3, y: h - 6, 'text-anchor': 'middle', class: 'chart-label' });
    label.textContent = d.label;
    s.append(label);
  });
  return s;
}

// Donut chart. segments = [{label, value, color}]
export function donutChart(segments, { size = 160 } = {}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const s = svg({ viewBox: `0 0 ${size} ${size}`, class: 'donut' });
  s.append(node('circle', { cx, cy, r, fill: 'none', stroke: '#eef1f6', 'stroke-width': '20' }));
  let offset = 0;
  for (const seg of segments) {
    const frac = seg.value / total;
    const dash = frac * circ;
    const c = node('circle', {
      cx, cy, r, fill: 'none', stroke: seg.color, 'stroke-width': '20',
      'stroke-dasharray': `${dash} ${circ - dash}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${cx} ${cy})`,
    });
    s.append(c);
    offset += dash;
  }
  const wrap = el('div', { class: 'donut-wrap' }, [s]);
  const legend = el('div', { class: 'donut-legend' });
  for (const seg of segments) {
    legend.append(el('div', { class: 'legend-item' }, [
      el('span', { class: 'legend-dot', style: `background:${seg.color}` }),
      el('span', { text: `${seg.label} · ${seg.value}` }),
    ]));
  }
  return el('div', { class: 'donut-chart' }, [wrap, legend]);
}

'use strict';

/* OKF Webview — reads the baked window.__OKF__ island and renders the bundle. */

const DATA = window.__OKF__ || { root: '', concepts: [], reserved: {}, overview: {} };
const CONCEPTS = DATA.concepts || [];
const RESERVED = DATA.reserved || {};
const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

const GROUP_COLORS = ['#6ea8fe', '#5ad19a', '#ffb454', '#c792ea', '#ff6b6b', '#56d4dd', '#f78c6c', '#82aaff'];
const GROUP_COLOR = new Map();
(function assignColors() {
	const groups = [...new Set(CONCEPTS.map((c) => c.group))].sort();
	groups.forEach((g, i) => GROUP_COLOR.set(g, GROUP_COLORS[i % GROUP_COLORS.length]));
})();

/* ---------- POSIX path helpers (mirror OkfGraph.resolveLink) ---------- */

function posixDirname(p) {
	const i = p.lastIndexOf('/');
	return i === -1 ? '' : p.slice(0, i);
}
function posixJoin(a, b) {
	return a === '' ? b : a + '/' + b;
}
function posixNormalize(p) {
	const out = [];
	for (const seg of p.split('/')) {
		if (seg === '' || seg === '.') {
			continue;
		}
		if (seg === '..') {
			if (out.length > 0 && out[out.length - 1] !== '..') {
				out.pop();
			} else {
				out.push('..');
			}
			continue;
		}
		out.push(seg);
	}
	return out.join('/');
}

/**
 * Resolve a markdown link `target` written in concept `file` to an in-app
 * destination, matching the bundle graph's link rules.
 */
function resolveLink(target, file) {
	const noAnchor = target.split('#')[0];
	if (noAnchor === '') {
		return { kind: 'anchor', href: target };
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(noAnchor) === true) {
		return { kind: 'external', href: target };
	}
	if (noAnchor.endsWith('.md') === false) {
		return { kind: 'inert' };
	}
	const rel = noAnchor.startsWith('/') ? noAnchor.slice(1) : posixJoin(posixDirname(file), noAnchor);
	const normalized = posixNormalize(rel);
	if (normalized.startsWith('..') === true) {
		return { kind: 'inert' };
	}
	const id = normalized.replace(/\.md$/, '');
	if (BY_ID.has(id) === true) {
		return { kind: 'route', href: '#/c/' + id };
	}
	if (RESERVED[normalized] !== undefined) {
		const base = normalized.slice(posixDirname(normalized).length).replace(/^\//, '');
		if (normalized === 'index.md') {
			return { kind: 'route', href: '#/overview' };
		}
		if (base === 'index.md') {
			return { kind: 'route', href: '#/f/' + posixDirname(normalized) };
		}
		if (base === 'log.md') {
			return { kind: 'route', href: '#/log' };
		}
	}
	return { kind: 'broken' };
}

/* ---------- Markdown rendering with link rewriting ---------- */

function stripFrontmatter(markdown) {
	const text = markdown || '';
	if (text.startsWith('---\n') === false && text.startsWith('---\r\n') === false) {
		return text;
	}
	const end = text.indexOf('\n---', 3);
	if (end === -1) {
		return text;
	}
	const after = text.indexOf('\n', end + 1);
	return after === -1 ? '' : text.slice(after + 1);
}

function renderMarkdown(markdown, file) {
	const wrap = document.createElement('div');
	wrap.className = 'markdown';
	wrap.innerHTML = window.marked.parse(stripFrontmatter(markdown));
	for (const a of wrap.querySelectorAll('a[href]')) {
		const resolved = resolveLink(a.getAttribute('href'), file);
		if (resolved.kind === 'route' || resolved.kind === 'anchor') {
			a.setAttribute('href', resolved.href);
		} else if (resolved.kind === 'external') {
			a.setAttribute('href', resolved.href);
			a.setAttribute('target', '_blank');
			a.setAttribute('rel', 'noopener');
			a.classList.add('ext-link');
		} else if (resolved.kind === 'broken') {
			a.removeAttribute('href');
			a.classList.add('broken-link');
			a.title = 'broken link';
		} else {
			a.removeAttribute('href');
			a.classList.add('muted');
		}
	}
	return wrap;
}

/* ---------- Small DOM helpers ---------- */

function el(tag, attrs, children) {
	const node = document.createElement(tag);
	if (attrs !== undefined && attrs !== null) {
		for (const [k, v] of Object.entries(attrs)) {
			if (k === 'class') {
				node.className = v;
			} else if (k === 'html') {
				node.innerHTML = v;
			} else {
				node.setAttribute(k, v);
			}
		}
	}
	for (const child of children || []) {
		if (child === null || child === undefined) {
			continue;
		}
		node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
	}
	return node;
}

function conceptLabel(c) {
	return c.title !== '' ? c.title : c.id;
}
function conceptLink(id) {
	const c = BY_ID.get(id);
	return el('a', { href: '#/c/' + id }, [c !== undefined ? conceptLabel(c) : id]);
}

/* ---------- Sidebar ---------- */

const collapsed = new Set();

function renderSidebar(filter) {
	const sidebar = document.getElementById('sidebar');
	sidebar.innerHTML = '';
	const term = (filter || '').trim().toLowerCase();
	const matches = (c) =>
		term === '' ||
		c.id.toLowerCase().includes(term) ||
		c.title.toLowerCase().includes(term) ||
		c.description.toLowerCase().includes(term) ||
		c.tags.some((t) => t.toLowerCase().includes(term));

	const groups = new Map();
	for (const c of CONCEPTS) {
		if (matches(c) === false) {
			continue;
		}
		if (groups.has(c.group) === false) {
			groups.set(c.group, []);
		}
		groups.get(c.group).push(c);
	}
	if (groups.size === 0) {
		sidebar.appendChild(el('div', { class: 'nav-empty' }, ['No matching concepts']));
		return;
	}
	const active = currentConceptId();
	for (const group of [...groups.keys()].sort()) {
		const items = groups.get(group);
		const isCollapsed = collapsed.has(group) && term === '';
		const groupEl = el('div', { class: 'group' + (isCollapsed ? ' collapsed' : '') }, [
			el('button', { class: 'group-head' }, [
				el('span', { class: 'caret' }, ['▾']),
				el('span', null, [group]),
				el('span', { class: 'group-count' }, [String(items.length)]),
			]),
			el(
				'ul',
				{ class: 'group-items' },
				items.map((c) =>
					el('li', null, [
						el('a', { class: 'nav-item' + (c.id === active ? ' active' : ''), href: '#/c/' + c.id }, [
							conceptLabel(c),
						]),
					]),
				),
			),
		]);
		groupEl.querySelector('.group-head').addEventListener('click', () => {
			if (collapsed.has(group) === true) {
				collapsed.delete(group);
			} else {
				collapsed.add(group);
			}
			renderSidebar(document.getElementById('search').value);
		});
		sidebar.appendChild(groupEl);
	}
}

function currentConceptId() {
	const m = location.hash.match(/^#\/c\/(.+)$/);
	return m === null ? null : decodeURIComponent(m[1]);
}

/* ---------- Views ---------- */

function setMain(node) {
	const main = document.getElementById('main');
	main.innerHTML = '';
	main.scrollTop = 0;
	main.appendChild(el('div', { class: 'content' }, [node]));
}

function renderConcept(id) {
	const c = BY_ID.get(id);
	if (c === undefined) {
		setMain(el('div', { class: 'empty-state' }, ['Concept not found: ' + id]));
		return;
	}
	const head = el('div', { class: 'concept-head' }, [
		el('div', { class: 'crumb' }, [c.file]),
		c.type !== '' ? el('span', { class: 'concept-type' }, [c.type]) : null,
		c.tags.length > 0
			? el('div', { class: 'tags' }, c.tags.map((t) => el('span', { class: 'tag' }, [t])))
			: null,
	]);

	const linkCol = (title, ids, cls) =>
		el('div', { class: 'links-col' + (cls ? ' ' + cls : '') }, [
			el('h4', null, [title + ' (' + ids.length + ')']),
			ids.length === 0
				? el('div', { class: 'muted' }, ['none'])
				: el(
						'ul',
						null,
						ids.map((x) =>
							el('li', null, [cls === 'broken' ? document.createTextNode(x) : conceptLink(x)]),
						),
					),
		]);

	const panel = el('div', { class: 'links-panel' }, [
		linkCol('Outbound', c.outbound),
		linkCol('Inbound', c.inbound),
		linkCol('Broken', c.broken, 'broken'),
	]);

	setMain(el('div', null, [head, renderMarkdown(c.markdown, c.file), panel]));
}

function renderReservedDoc(file, fallback) {
	const md = RESERVED[file];
	if (md === undefined) {
		setMain(el('div', { class: 'empty-state' }, [fallback]));
		return;
	}
	setMain(el('div', null, [el('div', { class: 'crumb' }, [file]), renderMarkdown(md, file)]));
}

function renderOverview() {
	const o = DATA.overview || {};
	const groups = o.groups || [];
	const hubs = o.hubs || [];
	const orphans = o.orphans || [];
	const broken = o.broken || [];
	const maxGroup = groups.reduce((m, g) => Math.max(m, g.count), 1);
	const maxHub = hubs.reduce((m, h) => Math.max(m, h.inbound), 1);

	const stats = el('div', { class: 'dash-grid' }, [
		el('div', { class: 'stat' }, [el('div', { class: 'num' }, [String(o.conceptCount || 0)]), el('div', { class: 'label' }, ['Concepts'])]),
		el('div', { class: 'stat' }, [el('div', { class: 'num' }, [String(groups.length)]), el('div', { class: 'label' }, ['Folders'])]),
		el('div', { class: 'stat' + (orphans.length > 0 ? ' warn' : '') }, [el('div', { class: 'num' }, [String(orphans.length)]), el('div', { class: 'label' }, ['Orphans'])]),
		el('div', { class: 'stat' + (broken.length > 0 ? ' danger' : '') }, [el('div', { class: 'num' }, [String(broken.length)]), el('div', { class: 'label' }, ['Broken links'])]),
	]);

	const groupsPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Concepts per folder']),
		...groups.map((g) =>
			el('div', { class: 'bar-row' }, [
				el('span', { class: 'name' }, [g.group]),
				el('span', { class: 'bar', style: 'width:' + Math.round((g.count / maxGroup) * 220) + 'px' }, []),
				el('span', { class: 'val' }, [String(g.count)]),
			]),
		),
	]);

	const hubsPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Top hub concepts']),
		hubs.length === 0
			? el('div', { class: 'muted' }, ['none'])
			: el('div', null, hubs.map((h) =>
					el('div', { class: 'bar-row' }, [
						el('span', { class: 'name' }, [conceptLink(h.id)]),
						el('span', { class: 'bar', style: 'width:' + Math.round((h.inbound / maxHub) * 180) + 'px' }, []),
						el('span', { class: 'val' }, [h.inbound + ' in']),
					]),
				)),
	]);

	const orphansBody = orphans.length === 0
		? el('div', { class: 'muted' }, ['none — every concept is linked'])
		: el('div', { class: 'chip-list' }, orphans.map((id) => el('span', { class: 'chip' }, [conceptLink(id)])));
	const orphansPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Orphans (no inbound link)']),
		orphansBody,
	]);

	const brokenPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Broken links']),
		broken.length === 0
			? el('div', { class: 'muted' }, ['none'])
			: el('div', null, broken.map((b) =>
					el('div', { class: 'broken-row' }, [conceptLink(b.from), el('span', { class: 'arrow' }, ['→']), document.createTextNode(b.target)]),
				)),
	]);

	setMain(el('div', null, [
		el('h1', null, [DATA.root || 'Bundle', ' overview']),
		stats,
		groupsPanel,
		hubsPanel,
		orphansPanel,
		brokenPanel,
	]));
}

function renderSearch(term) {
	const q = term.trim().toLowerCase();
	const results = CONCEPTS.filter((c) =>
		c.id.toLowerCase().includes(q) ||
		c.title.toLowerCase().includes(q) ||
		c.description.toLowerCase().includes(q) ||
		c.tags.some((t) => t.toLowerCase().includes(q)),
	);
	const list = results.map((c) =>
		el('a', { class: 'search-result', href: '#/c/' + c.id }, [
			el('div', { class: 'title' }, [conceptLabel(c)]),
			el('div', { class: 'sub' }, [c.file + (c.type !== '' ? ' · ' + c.type : '')]),
			c.description !== '' ? el('div', { class: 'desc' }, [c.description]) : null,
		]),
	);
	setMain(el('div', null, [
		el('h1', null, ['Search: “' + term + '”']),
		results.length === 0 ? el('div', { class: 'empty-state' }, ['No concepts match.']) : el('div', null, list),
	]));
}

/* ---------- Interactive graph (canvas force-directed) ---------- */

let graphState = null;

function renderGraph() {
	const main = document.getElementById('main');
	main.innerHTML = '';
	const wrap = el('div', { id: 'graph-wrap' }, [
		el('div', { class: 'graph-hint' }, ['Drag nodes · click to open · scroll to zoom']),
		el('canvas', { id: 'graph-canvas' }, []),
		el('div', { class: 'graph-tip', id: 'graph-tip' }, []),
	]);
	main.appendChild(wrap);
	startGraph(document.getElementById('graph-canvas'), document.getElementById('graph-tip'));
}

function startGraph(canvas, tip) {
	const nodes = CONCEPTS.map((c, i) => ({
		id: c.id,
		label: conceptLabel(c),
		group: c.group,
		x: Math.cos((i / CONCEPTS.length) * Math.PI * 2) * 160,
		y: Math.sin((i / CONCEPTS.length) * Math.PI * 2) * 160,
		vx: 0,
		vy: 0,
	}));
	const index = new Map(nodes.map((n) => [n.id, n]));
	const edges = [];
	for (const c of CONCEPTS) {
		for (const t of c.outbound) {
			if (index.has(t) === true) {
				edges.push([index.get(c.id), index.get(t)]);
			}
		}
	}

	const view = { scale: 1, ox: 0, oy: 0 };
	let dragging = null;
	let panning = false;
	let moved = false;
	let last = { x: 0, y: 0 };
	let hover = null;
	let alive = true;

	const ctx = canvas.getContext('2d');
	function resize() {
		const r = canvas.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		canvas.width = r.width * dpr;
		canvas.height = r.height * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	resize();
	const onResize = () => resize();
	window.addEventListener('resize', onResize);

	function center() {
		return { x: canvas.clientWidth / 2 + view.ox, y: canvas.clientHeight / 2 + view.oy };
	}
	function toScreen(n) {
		const c = center();
		return { x: c.x + n.x * view.scale, y: c.y + n.y * view.scale };
	}
	function pick(px, py) {
		for (const n of nodes) {
			const s = toScreen(n);
			if ((s.x - px) ** 2 + (s.y - py) ** 2 <= (9 * view.scale + 4) ** 2) {
				return n;
			}
		}
		return null;
	}

	function step() {
		for (const a of nodes) {
			for (const b of nodes) {
				if (a === b) {
					continue;
				}
				let dx = a.x - b.x;
				let dy = a.y - b.y;
				let d2 = dx * dx + dy * dy;
				if (d2 < 0.01) {
					dx = (a.id < b.id ? 1 : -1) * 0.5;
					dy = 0.5;
					d2 = 0.5;
				}
				const f = 6000 / d2;
				const d = Math.sqrt(d2);
				a.vx += (dx / d) * f;
				a.vy += (dy / d) * f;
			}
		}
		for (const [a, b] of edges) {
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const d = Math.sqrt(dx * dx + dy * dy) || 1;
			const f = (d - 90) * 0.02;
			a.vx += (dx / d) * f;
			a.vy += (dy / d) * f;
			b.vx -= (dx / d) * f;
			b.vy -= (dy / d) * f;
		}
		for (const n of nodes) {
			n.vx += -n.x * 0.002;
			n.vy += -n.y * 0.002;
			if (n === dragging) {
				continue;
			}
			n.vx *= 0.82;
			n.vy *= 0.82;
			n.x += Math.max(-30, Math.min(30, n.vx));
			n.y += Math.max(-30, Math.min(30, n.vy));
		}
	}

	function draw() {
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		ctx.lineWidth = 1;
		for (const [a, b] of edges) {
			const sa = toScreen(a);
			const sb = toScreen(b);
			ctx.strokeStyle = hover !== null && (a === hover || b === hover) ? 'rgba(110,168,254,0.7)' : 'rgba(255,255,255,0.10)';
			ctx.beginPath();
			ctx.moveTo(sa.x, sa.y);
			ctx.lineTo(sb.x, sb.y);
			ctx.stroke();
		}
		for (const n of nodes) {
			const s = toScreen(n);
			const rad = (n === hover ? 11 : 8) * Math.max(0.7, view.scale);
			ctx.beginPath();
			ctx.fillStyle = GROUP_COLOR.get(n.group) || '#6ea8fe';
			ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
			ctx.fill();
			if (view.scale >= 0.85 || n === hover) {
				ctx.fillStyle = '#d7dce5';
				ctx.font = '11px -apple-system, sans-serif';
				ctx.fillText(n.label, s.x + rad + 4, s.y + 4);
			}
		}
	}

	function frame() {
		if (alive === false) {
			return;
		}
		step();
		draw();
		requestAnimationFrame(frame);
	}
	frame();

	canvas.addEventListener('mousedown', (e) => {
		const r = canvas.getBoundingClientRect();
		const px = e.clientX - r.left;
		const py = e.clientY - r.top;
		moved = false;
		last = { x: px, y: py };
		const hit = pick(px, py);
		if (hit !== null) {
			dragging = hit;
		} else {
			panning = true;
		}
	});
	canvas.addEventListener('mousemove', (e) => {
		const r = canvas.getBoundingClientRect();
		const px = e.clientX - r.left;
		const py = e.clientY - r.top;
		if (dragging !== null) {
			moved = true;
			const c = center();
			dragging.x = (px - c.x) / view.scale;
			dragging.y = (py - c.y) / view.scale;
			dragging.vx = 0;
			dragging.vy = 0;
			return;
		}
		if (panning === true) {
			moved = true;
			view.ox += px - last.x;
			view.oy += py - last.y;
			last = { x: px, y: py };
			return;
		}
		hover = pick(px, py);
		if (hover !== null) {
			const c = BY_ID.get(hover.id);
			tip.style.display = 'block';
			tip.style.left = px + 14 + 'px';
			tip.style.top = py + 14 + 'px';
			tip.textContent = (c && c.title) || hover.id;
		} else {
			tip.style.display = 'none';
		}
	});
	function endDrag(e) {
		const r = canvas.getBoundingClientRect();
		const px = e.clientX - r.left;
		const py = e.clientY - r.top;
		if (dragging !== null && moved === false) {
			location.hash = '#/c/' + dragging.id;
		} else if (panning === true && moved === false) {
			const hit = pick(px, py);
			if (hit !== null) {
				location.hash = '#/c/' + hit.id;
			}
		}
		dragging = null;
		panning = false;
	}
	canvas.addEventListener('mouseup', endDrag);
	canvas.addEventListener('mouseleave', () => {
		dragging = null;
		panning = false;
		hover = null;
		tip.style.display = 'none';
	});
	canvas.addEventListener('wheel', (e) => {
		e.preventDefault();
		const factor = e.deltaY < 0 ? 1.1 : 0.9;
		view.scale = Math.max(0.3, Math.min(3, view.scale * factor));
	}, { passive: false });

	graphState = {
		stop() {
			alive = false;
			window.removeEventListener('resize', onResize);
		},
	};
}

function stopGraph() {
	if (graphState !== null) {
		graphState.stop();
		graphState = null;
	}
}

/* ---------- Router ---------- */

function setActiveNav(route) {
	for (const a of document.querySelectorAll('.topnav a')) {
		a.classList.toggle('active', a.getAttribute('data-route') === route);
	}
}

function route() {
	const hash = location.hash || '#/overview';
	if (hash.startsWith('#/graph') === false) {
		stopGraph();
	}
	const search = document.getElementById('search');

	let m;
	if ((m = hash.match(/^#\/c\/(.+)$/)) !== null) {
		setActiveNav(null);
		renderConcept(decodeURIComponent(m[1]));
	} else if (hash.startsWith('#/graph') === true) {
		setActiveNav('graph');
		renderGraph();
	} else if (hash.startsWith('#/log') === true) {
		setActiveNav('log');
		renderReservedDoc('log.md', 'No log.md in this bundle');
	} else if ((m = hash.match(/^#\/f\/(.+)$/)) !== null) {
		setActiveNav(null);
		const folder = decodeURIComponent(m[1]);
		renderReservedDoc(folder + '/index.md', 'No index for ' + folder);
	} else if (hash.startsWith('#/find/') === true) {
		setActiveNav(null);
		renderSearch(decodeURIComponent(hash.slice('#/find/'.length)));
	} else {
		setActiveNav('overview');
		renderOverview();
	}
	renderSidebar(search.value);
}

window.addEventListener('hashchange', route);

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('brand-bundle').textContent = DATA.root || '';
	const search = document.getElementById('search');
	search.addEventListener('input', () => {
		renderSidebar(search.value);
		const term = search.value.trim();
		if (term !== '') {
			history.replaceState(null, '', '#/find/' + encodeURIComponent(term));
			renderSearch(term);
		} else if (location.hash.startsWith('#/find/') === true) {
			location.hash = '#/overview';
		}
	});
	route();
});

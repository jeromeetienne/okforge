'use strict';

/* OKF Webview — reads the baked window.__OKF__ island and renders the bundle. */

/**
 * @typedef {Object} OkfConcept
 * @property {string} id
 * @property {string} file
 * @property {string} group
 * @property {string} type
 * @property {string} title
 * @property {string} description
 * @property {string[]} tags
 * @property {string[]} outbound
 * @property {string[]} inbound
 * @property {string[]} broken
 * @property {string} markdown
 */

/**
 * @typedef {Object} OverviewGroup
 * @property {string} group
 * @property {number} count
 */

/**
 * @typedef {Object} OverviewHub
 * @property {string} id
 * @property {number} inbound
 */

/**
 * @typedef {Object} OverviewBrokenLink
 * @property {string} from
 * @property {string} target
 */

/**
 * @typedef {Object} OkfOverview
 * @property {number} [conceptCount]
 * @property {OverviewGroup[]} [groups]
 * @property {OverviewHub[]} [hubs]
 * @property {string[]} [orphans]
 * @property {OverviewBrokenLink[]} [broken]
 */

/**
 * @typedef {Object} OkfData
 * @property {string} root
 * @property {OkfConcept[]} concepts
 * @property {Record<string, string>} reserved
 * @property {OkfOverview} overview
 */

/**
 * @typedef {Object} ResolvedLink
 * @property {'anchor' | 'external' | 'route' | 'broken' | 'inert'} kind
 * @property {string} [href]
 */

/** The window augmented with the globals this app reads (`__OKF__`, `marked`). */
const okfWindow = /** @type {typeof window & { __OKF__?: OkfData; marked: { parse(markdown: string): string } }} */ (
	window
);

/** @type {OkfData} */
const DATA = okfWindow.__OKF__ || { root: '', concepts: [], reserved: {}, overview: {} };
const CONCEPTS = DATA.concepts || [];
const RESERVED = DATA.reserved || {};
const BY_ID = new Map(CONCEPTS.map((concept) => [concept.id, concept]));

const GROUP_COLORS = ['#6ea8fe', '#5ad19a', '#ffb454', '#c792ea', '#ff6b6b', '#56d4dd', '#f78c6c', '#82aaff'];
/** @type {Map<string, string>} */
const GROUP_COLOR = new Map();
(function assignColors() {
	const groups = [...new Set(CONCEPTS.map((concept) => concept.group))].sort();
	groups.forEach((group, group_index) => GROUP_COLOR.set(group, GROUP_COLORS[group_index % GROUP_COLORS.length]));
})();

/* ---------- POSIX path helpers (mirror OkfGraph.resolveLink) ---------- */

/**
 * Directory portion of a POSIX path, or '' when there is no slash.
 * @param {string} path_str
 * @returns {string}
 */
function posixDirname(path_str) {
	const slash_index = path_str.lastIndexOf('/');
	return slash_index === -1 ? '' : path_str.slice(0, slash_index);
}

/**
 * Join two POSIX path segments with a single slash.
 * @param {string} base_path
 * @param {string} child_path
 * @returns {string}
 */
function posixJoin(base_path, child_path) {
	return base_path === '' ? child_path : base_path + '/' + child_path;
}

/**
 * Collapse '.', '..' and empty segments in a POSIX path.
 * @param {string} path_str
 * @returns {string}
 */
function posixNormalize(path_str) {
	const out_segments = [];
	for (const segment of path_str.split('/')) {
		if (segment === '' || segment === '.') {
			continue;
		}
		if (segment === '..') {
			if (out_segments.length > 0 && out_segments[out_segments.length - 1] !== '..') {
				out_segments.pop();
			} else {
				out_segments.push('..');
			}
			continue;
		}
		out_segments.push(segment);
	}
	return out_segments.join('/');
}

/**
 * Resolve a markdown link `target` written in concept `source_file` to an in-app
 * destination, matching the bundle graph's link rules.
 * @param {string} target
 * @param {string} source_file
 * @returns {ResolvedLink}
 */
function resolveLink(target, source_file) {
	const without_anchor = target.split('#')[0];
	if (without_anchor === '') {
		return { kind: 'anchor', href: target };
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(without_anchor) === true) {
		return { kind: 'external', href: target };
	}
	if (without_anchor.endsWith('.md') === false) {
		return { kind: 'inert' };
	}
	const relative_path = without_anchor.startsWith('/')
		? without_anchor.slice(1)
		: posixJoin(posixDirname(source_file), without_anchor);
	const normalized_path = posixNormalize(relative_path);
	if (normalized_path.startsWith('..') === true) {
		return { kind: 'inert' };
	}
	const concept_id = normalized_path.replace(/\.md$/, '');
	if (BY_ID.has(concept_id) === true) {
		return { kind: 'route', href: '#/c/' + concept_id };
	}
	if (RESERVED[normalized_path] !== undefined) {
		const base_name = normalized_path.slice(posixDirname(normalized_path).length).replace(/^\//, '');
		if (normalized_path === 'index.md') {
			return { kind: 'route', href: '#/overview' };
		}
		if (base_name === 'index.md') {
			return { kind: 'route', href: '#/f/' + posixDirname(normalized_path) };
		}
		if (base_name === 'log.md') {
			return { kind: 'route', href: '#/log' };
		}
	}
	return { kind: 'broken' };
}

/* ---------- Markdown rendering with link rewriting ---------- */

/**
 * Drop a leading YAML frontmatter block from `markdown`, returning the body.
 * @param {string} markdown
 * @returns {string}
 */
function stripFrontmatter(markdown) {
	const text = markdown || '';
	if (text.startsWith('---\n') === false && text.startsWith('---\r\n') === false) {
		return text;
	}
	const fence_end = text.indexOf('\n---', 3);
	if (fence_end === -1) {
		return text;
	}
	const body_start = text.indexOf('\n', fence_end + 1);
	return body_start === -1 ? '' : text.slice(body_start + 1);
}

/**
 * Render `markdown` to a DOM node, rewriting links relative to `source_file`
 * into in-app routes (or marking them external / broken / inert).
 * @param {string} markdown
 * @param {string} source_file
 * @returns {HTMLDivElement}
 */
function renderMarkdown(markdown, source_file) {
	const wrapper = document.createElement('div');
	wrapper.className = 'markdown';
	wrapper.innerHTML = okfWindow.marked.parse(stripFrontmatter(markdown));
	for (const anchor of wrapper.querySelectorAll('a[href]')) {
		const link_anchor = /** @type {HTMLAnchorElement} */ (anchor);
		const resolved = resolveLink(link_anchor.getAttribute('href') || '', source_file);
		if (resolved.kind === 'route' || resolved.kind === 'anchor') {
			link_anchor.setAttribute('href', resolved.href || '');
		} else if (resolved.kind === 'external') {
			link_anchor.setAttribute('href', resolved.href || '');
			link_anchor.setAttribute('target', '_blank');
			link_anchor.setAttribute('rel', 'noopener');
			link_anchor.classList.add('ext-link');
		} else if (resolved.kind === 'broken') {
			link_anchor.removeAttribute('href');
			link_anchor.classList.add('broken-link');
			link_anchor.title = 'broken link';
		} else {
			link_anchor.removeAttribute('href');
			link_anchor.classList.add('muted');
		}
	}
	return wrapper;
}

/* ---------- Small DOM helpers ---------- */

/**
 * Create an element with optional attributes and children. `class` sets the
 * className, `html` sets innerHTML, anything else becomes an attribute.
 * @param {string} tag
 * @param {Record<string, string> | null} [attrs]
 * @param {Array<Node | string | null | undefined>} [children]
 * @returns {HTMLElement}
 */
function el(tag, attrs, children) {
	const node = document.createElement(tag);
	if (attrs !== undefined && attrs !== null) {
		for (const [attr_name, attr_value] of Object.entries(attrs)) {
			if (attr_name === 'class') {
				node.className = attr_value;
			} else if (attr_name === 'html') {
				node.innerHTML = attr_value;
			} else {
				node.setAttribute(attr_name, attr_value);
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

/**
 * Display label for a concept: its title, falling back to its id.
 * @param {OkfConcept} concept
 * @returns {string}
 */
function conceptLabel(concept) {
	return concept.title !== '' ? concept.title : concept.id;
}

/**
 * Anchor linking to a concept's route, labelled by title (or id when unknown).
 * @param {string} concept_id
 * @returns {HTMLElement}
 */
function conceptLink(concept_id) {
	const concept = BY_ID.get(concept_id);
	return el('a', { href: '#/c/' + concept_id }, [concept !== undefined ? conceptLabel(concept) : concept_id]);
}

/* ---------- Sidebar ---------- */

/** Folder groups the user has collapsed in the sidebar. @type {Set<string>} */
const collapsed = new Set();

/**
 * Rebuild the sidebar, optionally filtering concepts by `filter` text.
 * @param {string} filter
 * @returns {void}
 */
function renderSidebar(filter) {
	const sidebar = document.getElementById('sidebar');
	if (sidebar === null) {
		return;
	}
	sidebar.innerHTML = '';
	const term = (filter || '').trim().toLowerCase();
	/**
	 * @param {OkfConcept} concept
	 * @returns {boolean}
	 */
	const matches = (concept) =>
		term === '' ||
		concept.id.toLowerCase().includes(term) ||
		concept.title.toLowerCase().includes(term) ||
		concept.description.toLowerCase().includes(term) ||
		concept.tags.some((tag) => tag.toLowerCase().includes(term));

	/** @type {Map<string, OkfConcept[]>} */
	const groups = new Map();
	for (const concept of CONCEPTS) {
		if (matches(concept) === false) {
			continue;
		}
		if (groups.has(concept.group) === false) {
			groups.set(concept.group, []);
		}
		const group_items = groups.get(concept.group);
		if (group_items !== undefined) {
			group_items.push(concept);
		}
	}
	if (groups.size === 0) {
		sidebar.appendChild(el('div', { class: 'nav-empty' }, ['No matching concepts']));
		return;
	}
	const active_id = currentConceptId();
	for (const group of [...groups.keys()].sort()) {
		const items = groups.get(group) || [];
		const is_collapsed = collapsed.has(group) && term === '';
		const group_el = el('div', { class: 'group' + (is_collapsed ? ' collapsed' : '') }, [
			el('button', { class: 'group-head' }, [
				el('span', { class: 'caret' }, ['▾']),
				el('span', null, [group]),
				el('span', { class: 'group-count' }, [String(items.length)]),
			]),
			el(
				'ul',
				{ class: 'group-items' },
				items.map((concept) =>
					el('li', null, [
						el('a', { class: 'nav-item' + (concept.id === active_id ? ' active' : ''), href: '#/c/' + concept.id }, [
							conceptLabel(concept),
						]),
					]),
				),
			),
		]);
		const group_head = group_el.querySelector('.group-head');
		if (group_head !== null) {
			group_head.addEventListener('click', () => {
				if (collapsed.has(group) === true) {
					collapsed.delete(group);
				} else {
					collapsed.add(group);
				}
				const search_input = /** @type {HTMLInputElement | null} */ (document.getElementById('search'));
				renderSidebar(search_input !== null ? search_input.value : '');
			});
		}
		sidebar.appendChild(group_el);
	}
}

/**
 * Concept id encoded in the current location hash, or null when the route is
 * not a concept route.
 * @returns {string | null}
 */
function currentConceptId() {
	const match = location.hash.match(/^#\/c\/(.+)$/);
	return match === null ? null : decodeURIComponent(match[1]);
}

/* ---------- Views ---------- */

/**
 * Replace the main pane's content with `node`.
 * @param {Node} node
 * @returns {void}
 */
function setMain(node) {
	const main = document.getElementById('main');
	if (main === null) {
		return;
	}
	main.innerHTML = '';
	main.scrollTop = 0;
	main.appendChild(el('div', { class: 'content' }, [node]));
}

/**
 * Render the concept page for `concept_id`, including markdown and link panel.
 * @param {string} concept_id
 * @returns {void}
 */
function renderConcept(concept_id) {
	const concept = BY_ID.get(concept_id);
	if (concept === undefined) {
		setMain(el('div', { class: 'empty-state' }, ['Concept not found: ' + concept_id]));
		return;
	}
	const head = el('div', { class: 'concept-head' }, [
		el('div', { class: 'crumb' }, [concept.file]),
		concept.type !== '' ? el('span', { class: 'concept-type' }, [concept.type]) : null,
		concept.tags.length > 0
			? el('div', { class: 'tags' }, concept.tags.map((tag) => el('span', { class: 'tag' }, [tag])))
			: null,
	]);

	/**
	 * @param {string} title
	 * @param {string[]} ids
	 * @param {string} [css_class]
	 * @returns {HTMLElement}
	 */
	const linkCol = (title, ids, css_class) =>
		el('div', { class: 'links-col' + (css_class ? ' ' + css_class : '') }, [
			el('h4', null, [title + ' (' + ids.length + ')']),
			ids.length === 0
				? el('div', { class: 'muted' }, ['none'])
				: el(
						'ul',
						null,
						ids.map((linked_id) =>
							el('li', null, [css_class === 'broken' ? document.createTextNode(linked_id) : conceptLink(linked_id)]),
						),
					),
		]);

	const panel = el('div', { class: 'links-panel' }, [
		linkCol('Outbound', concept.outbound),
		linkCol('Inbound', concept.inbound),
		linkCol('Broken', concept.broken, 'broken'),
	]);

	setMain(el('div', null, [head, renderMarkdown(concept.markdown, concept.file), panel]));
}

/**
 * Render a reserved bundle file (index.md / log.md) by its `file` path, or show
 * `fallback` text when the bundle has no such file.
 * @param {string} file
 * @param {string} fallback
 * @returns {void}
 */
function renderReservedDoc(file, fallback) {
	const markdown = RESERVED[file];
	if (markdown === undefined) {
		setMain(el('div', { class: 'empty-state' }, [fallback]));
		return;
	}
	setMain(el('div', null, [el('div', { class: 'crumb' }, [file]), renderMarkdown(markdown, file)]));
}

/**
 * Render the bundle overview dashboard (stats, per-folder counts, hubs,
 * orphans and broken links).
 * @returns {void}
 */
function renderOverview() {
	const overview = DATA.overview || {};
	const groups = overview.groups || [];
	const hubs = overview.hubs || [];
	const orphans = overview.orphans || [];
	const broken = overview.broken || [];
	const max_group_count = groups.reduce((running_max, group) => Math.max(running_max, group.count), 1);
	const max_hub_inbound = hubs.reduce((running_max, hub) => Math.max(running_max, hub.inbound), 1);

	const stats = el('div', { class: 'dash-grid' }, [
		el('div', { class: 'stat' }, [el('div', { class: 'num' }, [String(overview.conceptCount || 0)]), el('div', { class: 'label' }, ['Concepts'])]),
		el('div', { class: 'stat' }, [el('div', { class: 'num' }, [String(groups.length)]), el('div', { class: 'label' }, ['Folders'])]),
		el('div', { class: 'stat' + (orphans.length > 0 ? ' warn' : '') }, [el('div', { class: 'num' }, [String(orphans.length)]), el('div', { class: 'label' }, ['Orphans'])]),
		el('div', { class: 'stat' + (broken.length > 0 ? ' danger' : '') }, [el('div', { class: 'num' }, [String(broken.length)]), el('div', { class: 'label' }, ['Broken links'])]),
	]);

	const groupsPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Concepts per folder']),
		...groups.map((group) =>
			el('div', { class: 'bar-row' }, [
				el('span', { class: 'name' }, [group.group]),
				el('span', { class: 'bar', style: 'width:' + Math.round((group.count / max_group_count) * 220) + 'px' }, []),
				el('span', { class: 'val' }, [String(group.count)]),
			]),
		),
	]);

	const hubsPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Top hub concepts']),
		hubs.length === 0
			? el('div', { class: 'muted' }, ['none'])
			: el('div', null, hubs.map((hub) =>
					el('div', { class: 'bar-row' }, [
						el('span', { class: 'name' }, [conceptLink(hub.id)]),
						el('span', { class: 'bar', style: 'width:' + Math.round((hub.inbound / max_hub_inbound) * 180) + 'px' }, []),
						el('span', { class: 'val' }, [hub.inbound + ' in']),
					]),
				)),
	]);

	const orphansBody = orphans.length === 0
		? el('div', { class: 'muted' }, ['none — every concept is linked'])
		: el('div', { class: 'chip-list' }, orphans.map((orphan_id) => el('span', { class: 'chip' }, [conceptLink(orphan_id)])));
	const orphansPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Orphans (no inbound link)']),
		orphansBody,
	]);

	const brokenPanel = el('div', { class: 'panel' }, [
		el('h3', null, ['Broken links']),
		broken.length === 0
			? el('div', { class: 'muted' }, ['none'])
			: el('div', null, broken.map((broken_link) =>
					el('div', { class: 'broken-row' }, [conceptLink(broken_link.from), el('span', { class: 'arrow' }, ['→']), document.createTextNode(broken_link.target)]),
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

/**
 * Render search results for `term` across id, title, description and tags.
 * @param {string} term
 * @returns {void}
 */
function renderSearch(term) {
	const query = term.trim().toLowerCase();
	const results = CONCEPTS.filter((concept) =>
		concept.id.toLowerCase().includes(query) ||
		concept.title.toLowerCase().includes(query) ||
		concept.description.toLowerCase().includes(query) ||
		concept.tags.some((tag) => tag.toLowerCase().includes(query)),
	);
	const list = results.map((concept) =>
		el('a', { class: 'search-result', href: '#/c/' + concept.id }, [
			el('div', { class: 'title' }, [conceptLabel(concept)]),
			el('div', { class: 'sub' }, [concept.file + (concept.type !== '' ? ' · ' + concept.type : '')]),
			concept.description !== '' ? el('div', { class: 'desc' }, [concept.description]) : null,
		]),
	);
	setMain(el('div', null, [
		el('h1', null, ['Search: “' + term + '”']),
		results.length === 0 ? el('div', { class: 'empty-state' }, ['No concepts match.']) : el('div', null, list),
	]));
}

/* ---------- Interactive graph (canvas force-directed) ---------- */

/**
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {string} label
 * @property {string} group
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 */

/** Active graph instance's stopper, or null when no graph is mounted.
 * @type {{ stop: () => void } | null} */
let graphState = null;

/**
 * Mount the interactive graph view into the main pane.
 * @returns {void}
 */
function renderGraph() {
	const main = document.getElementById('main');
	if (main === null) {
		return;
	}
	main.innerHTML = '';
	const wrap = el('div', { id: 'graph-wrap' }, [
		el('div', { class: 'graph-hint' }, ['Drag nodes · click to open · scroll to zoom']),
		el('canvas', { id: 'graph-canvas' }, []),
		el('div', { class: 'graph-tip', id: 'graph-tip' }, []),
	]);
	main.appendChild(wrap);
	const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('graph-canvas'));
	const tip = document.getElementById('graph-tip');
	if (canvas === null || tip === null) {
		return;
	}
	startGraph(canvas, tip);
}

/**
 * Boot the force-directed concept graph onto `canvas`, using `tip` as the hover
 * tooltip, and publish a stopper through module-level `graphState`.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} tip
 * @returns {void}
 */
function startGraph(canvas, tip) {
	/** @type {GraphNode[]} */
	const nodes = CONCEPTS.map((concept, concept_index) => ({
		id: concept.id,
		label: conceptLabel(concept),
		group: concept.group,
		x: Math.cos((concept_index / CONCEPTS.length) * Math.PI * 2) * 160,
		y: Math.sin((concept_index / CONCEPTS.length) * Math.PI * 2) * 160,
		vx: 0,
		vy: 0,
	}));
	const node_by_id = new Map(nodes.map((node) => [node.id, node]));
	/** @type {Array<[GraphNode, GraphNode]>} */
	const edges = [];
	for (const concept of CONCEPTS) {
		for (const target_id of concept.outbound) {
			const source_node = node_by_id.get(concept.id);
			const target_node = node_by_id.get(target_id);
			if (source_node !== undefined && target_node !== undefined) {
				edges.push([source_node, target_node]);
			}
		}
	}

	const view = { scale: 1, ox: 0, oy: 0 };
	/** @type {GraphNode | null} */
	let dragging = null;
	let panning = false;
	let moved = false;
	let last_pointer = { x: 0, y: 0 };
	/** @type {GraphNode | null} */
	let hover = null;
	let alive = true;

	const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
	if (ctx === null) {
		return;
	}
	function resize() {
		const rect = canvas.getBoundingClientRect();
		const device_pixel_ratio = window.devicePixelRatio || 1;
		canvas.width = rect.width * device_pixel_ratio;
		canvas.height = rect.height * device_pixel_ratio;
		ctx.setTransform(device_pixel_ratio, 0, 0, device_pixel_ratio, 0, 0);
	}
	resize();
	const onResize = () => resize();
	window.addEventListener('resize', onResize);

	/**
	 * Screen-space center of the canvas, including pan offset.
	 * @returns {{ x: number, y: number }}
	 */
	function center() {
		return { x: canvas.clientWidth / 2 + view.ox, y: canvas.clientHeight / 2 + view.oy };
	}

	/**
	 * Project a graph node to screen coordinates.
	 * @param {GraphNode} node
	 * @returns {{ x: number, y: number }}
	 */
	function toScreen(node) {
		const view_center = center();
		return { x: view_center.x + node.x * view.scale, y: view_center.y + node.y * view.scale };
	}

	/**
	 * Topmost node under screen point (pointer_x, pointer_y), or null.
	 * @param {number} pointer_x
	 * @param {number} pointer_y
	 * @returns {GraphNode | null}
	 */
	function pick(pointer_x, pointer_y) {
		for (const node of nodes) {
			const screen_pos = toScreen(node);
			if ((screen_pos.x - pointer_x) ** 2 + (screen_pos.y - pointer_y) ** 2 <= (9 * view.scale + 4) ** 2) {
				return node;
			}
		}
		return null;
	}

	/**
	 * Advance the force simulation by one tick (repulsion, springs, damping).
	 * @returns {void}
	 */
	function step() {
		for (const node_a of nodes) {
			for (const node_b of nodes) {
				if (node_a === node_b) {
					continue;
				}
				let delta_x = node_a.x - node_b.x;
				let delta_y = node_a.y - node_b.y;
				let dist_sq = delta_x * delta_x + delta_y * delta_y;
				if (dist_sq < 0.01) {
					delta_x = (node_a.id < node_b.id ? 1 : -1) * 0.5;
					delta_y = 0.5;
					dist_sq = 0.5;
				}
				const repulsion = 6000 / dist_sq;
				const distance = Math.sqrt(dist_sq);
				node_a.vx += (delta_x / distance) * repulsion;
				node_a.vy += (delta_y / distance) * repulsion;
			}
		}
		for (const [node_a, node_b] of edges) {
			const delta_x = node_b.x - node_a.x;
			const delta_y = node_b.y - node_a.y;
			const distance = Math.sqrt(delta_x * delta_x + delta_y * delta_y) || 1;
			const spring = (distance - 90) * 0.02;
			node_a.vx += (delta_x / distance) * spring;
			node_a.vy += (delta_y / distance) * spring;
			node_b.vx -= (delta_x / distance) * spring;
			node_b.vy -= (delta_y / distance) * spring;
		}
		for (const node of nodes) {
			node.vx += -node.x * 0.002;
			node.vy += -node.y * 0.002;
			if (node === dragging) {
				continue;
			}
			node.vx *= 0.82;
			node.vy *= 0.82;
			node.x += Math.max(-30, Math.min(30, node.vx));
			node.y += Math.max(-30, Math.min(30, node.vy));
		}
	}

	/**
	 * Repaint edges and nodes for the current frame.
	 * @returns {void}
	 */
	function draw() {
		ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
		ctx.lineWidth = 1;
		for (const [node_a, node_b] of edges) {
			const screen_a = toScreen(node_a);
			const screen_b = toScreen(node_b);
			ctx.strokeStyle = hover !== null && (node_a === hover || node_b === hover) ? 'rgba(110,168,254,0.7)' : 'rgba(255,255,255,0.10)';
			ctx.beginPath();
			ctx.moveTo(screen_a.x, screen_a.y);
			ctx.lineTo(screen_b.x, screen_b.y);
			ctx.stroke();
		}
		for (const node of nodes) {
			const screen_pos = toScreen(node);
			const radius = (node === hover ? 11 : 8) * Math.max(0.7, view.scale);
			ctx.beginPath();
			ctx.fillStyle = GROUP_COLOR.get(node.group) || '#6ea8fe';
			ctx.arc(screen_pos.x, screen_pos.y, radius, 0, Math.PI * 2);
			ctx.fill();
			if (view.scale >= 0.85 || node === hover) {
				ctx.fillStyle = '#d7dce5';
				ctx.font = '11px -apple-system, sans-serif';
				ctx.fillText(node.label, screen_pos.x + radius + 4, screen_pos.y + 4);
			}
		}
	}

	/**
	 * Animation loop: step the simulation and draw until stopped.
	 * @returns {void}
	 */
	function frame() {
		if (alive === false) {
			return;
		}
		step();
		draw();
		requestAnimationFrame(frame);
	}
	frame();

	canvas.addEventListener('mousedown', (event) => {
		const rect = canvas.getBoundingClientRect();
		const pointer_x = event.clientX - rect.left;
		const pointer_y = event.clientY - rect.top;
		moved = false;
		last_pointer = { x: pointer_x, y: pointer_y };
		const hit = pick(pointer_x, pointer_y);
		if (hit !== null) {
			dragging = hit;
		} else {
			panning = true;
		}
	});
	canvas.addEventListener('mousemove', (event) => {
		const rect = canvas.getBoundingClientRect();
		const pointer_x = event.clientX - rect.left;
		const pointer_y = event.clientY - rect.top;
		if (dragging !== null) {
			moved = true;
			const view_center = center();
			dragging.x = (pointer_x - view_center.x) / view.scale;
			dragging.y = (pointer_y - view_center.y) / view.scale;
			dragging.vx = 0;
			dragging.vy = 0;
			return;
		}
		if (panning === true) {
			moved = true;
			view.ox += pointer_x - last_pointer.x;
			view.oy += pointer_y - last_pointer.y;
			last_pointer = { x: pointer_x, y: pointer_y };
			return;
		}
		hover = pick(pointer_x, pointer_y);
		if (hover !== null) {
			const concept = BY_ID.get(hover.id);
			tip.style.display = 'block';
			tip.style.left = pointer_x + 14 + 'px';
			tip.style.top = pointer_y + 14 + 'px';
			tip.textContent = (concept && concept.title) || hover.id;
		} else {
			tip.style.display = 'none';
		}
	});
	/**
	 * Finish a drag/pan; a click without movement opens the concept under it.
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	function endDrag(event) {
		const rect = canvas.getBoundingClientRect();
		const pointer_x = event.clientX - rect.left;
		const pointer_y = event.clientY - rect.top;
		if (dragging !== null && moved === false) {
			location.hash = '#/c/' + dragging.id;
		} else if (panning === true && moved === false) {
			const hit = pick(pointer_x, pointer_y);
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
	canvas.addEventListener('wheel', (event) => {
		event.preventDefault();
		const zoom_factor = event.deltaY < 0 ? 1.1 : 0.9;
		view.scale = Math.max(0.3, Math.min(3, view.scale * zoom_factor));
	}, { passive: false });

	graphState = {
		stop() {
			alive = false;
			window.removeEventListener('resize', onResize);
		},
	};
}

/**
 * Tear down the active graph instance, if any.
 * @returns {void}
 */
function stopGraph() {
	if (graphState !== null) {
		graphState.stop();
		graphState = null;
	}
}

/* ---------- Router ---------- */

/**
 * Toggle the active class on top-nav links to match `route`.
 * @param {string | null} active_route
 * @returns {void}
 */
function setActiveNav(active_route) {
	for (const link of document.querySelectorAll('.topnav a')) {
		link.classList.toggle('active', link.getAttribute('data-route') === active_route);
	}
}

/**
 * Dispatch the current location hash to the matching view renderer.
 * @returns {void}
 */
function route() {
	const hash = location.hash || '#/overview';
	if (hash.startsWith('#/graph') === false) {
		stopGraph();
	}
	const search_input = /** @type {HTMLInputElement | null} */ (document.getElementById('search'));

	const concept_match = hash.match(/^#\/c\/(.+)$/);
	const folder_match = hash.match(/^#\/f\/(.+)$/);
	if (concept_match !== null) {
		setActiveNav(null);
		renderConcept(decodeURIComponent(concept_match[1]));
	} else if (hash.startsWith('#/graph') === true) {
		setActiveNav('graph');
		renderGraph();
	} else if (hash.startsWith('#/log') === true) {
		setActiveNav('log');
		renderReservedDoc('log.md', 'No log.md in this bundle');
	} else if (folder_match !== null) {
		setActiveNav(null);
		const folder = decodeURIComponent(folder_match[1]);
		renderReservedDoc(folder + '/index.md', 'No index for ' + folder);
	} else if (hash.startsWith('#/find/') === true) {
		setActiveNav(null);
		renderSearch(decodeURIComponent(hash.slice('#/find/'.length)));
	} else {
		setActiveNav('overview');
		renderOverview();
	}
	renderSidebar(search_input !== null ? search_input.value : '');
}

window.addEventListener('hashchange', route);

document.addEventListener('DOMContentLoaded', () => {
	const brand = document.getElementById('brand-bundle');
	if (brand !== null) {
		brand.textContent = DATA.root || '';
	}
	const search_input = /** @type {HTMLInputElement | null} */ (document.getElementById('search'));
	if (search_input !== null) {
		search_input.addEventListener('input', () => {
			renderSidebar(search_input.value);
			const term = search_input.value.trim();
			if (term !== '') {
				history.replaceState(null, '', '#/find/' + encodeURIComponent(term));
				renderSearch(term);
			} else if (location.hash.startsWith('#/find/') === true) {
				location.hash = '#/overview';
			}
		});
	}
	route();
});

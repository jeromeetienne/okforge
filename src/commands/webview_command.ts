import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import Http from 'node:http';
import { OkfGraph, OkfGraphData } from '../misc/okf_graph.js';
import { OkfStore } from '../misc/okf_store.js';
import { OkfFetch } from '../misc/okf_fetch.js';

/** Number of top hub concepts surfaced in the overview, matching the graph CLI. */
const HUB_LIMIT = 10;

/** Static app assets copied verbatim into every generated site. */
const TEMPLATE_DIR = Path.join(import.meta.dirname, '..', 'webview', 'template');

/** Content types for the handful of static asset extensions the app uses. */
const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.map': 'application/json; charset=utf-8',
};

/** One concept baked into the site: graph metadata plus the raw markdown body. */
type BakedConcept = {
	id: string;
	file: string;
	group: string;
	type: string;
	title: string;
	description: string;
	tags: string[];
	outbound: string[];
	inbound: string[];
	broken: string[];
	markdown: string;
};

/** The whole data island the browser app reads from `window.__OKF__`. */
type BakedData = {
	root: string;
	generatedAt: string;
	concepts: BakedConcept[];
	reserved: Record<string, string>;
	overview: unknown;
};

/**
 * Generator and viewer for the static OKF webview. Builds the concept graph with
 * the same deterministic engine the CLI uses ({@link OkfGraph}), bakes every
 * concept's graph metadata and raw markdown plus the reserved `index.md`/`log.md`
 * bodies into a `data.js` island, then copies the static browser app alongside it.
 * `generate` writes the site to a chosen directory; `show` writes it to a temp
 * directory and serves it over HTTP so any bundle can be viewed in one command.
 * A bundle source may be a local directory or an http(s) URL; URLs are downloaded
 * into a temp directory first (see {@link OkfFetch}) and then treated identically.
 */
export class WebviewCommand {
	/** Generate the site into `out` for the bundle at `bundle`. */
	static async generate(bundle: string, out: string): Promise<void> {
		const { root, name } = await WebviewCommand.resolveBundle(bundle);
		const outDir = Path.resolve(out);
		const data = WebviewCommand.buildData(root, name);

		Fs.mkdirSync(outDir, { recursive: true });
		WebviewCommand.copyTree(TEMPLATE_DIR, outDir);
		Fs.writeFileSync(
			Path.join(outDir, 'data.js'),
			`window.__OKF__ = ${JSON.stringify(data, null, 2)};\n`,
			'utf-8',
		);

		const brokenCount = WebviewCommand.brokenCount(data);
		console.log(`okforge webview generated at ${Path.join(outDir, 'index.html')}`);
		console.log(`  bundle: ${OkfFetch.isUrl(bundle) === true ? bundle : root}`);
		console.log(`  concepts: ${data.concepts.length}, broken links: ${brokenCount}`);
	}

	/** Generate the site into a temp directory and serve it over HTTP until interrupted. */
	static async show(bundle: string): Promise<void> {
		const { root, name } = await WebviewCommand.resolveBundle(bundle);
		const outDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'okforge-webview-'));
		const data = WebviewCommand.buildData(root, name);

		WebviewCommand.copyTree(TEMPLATE_DIR, outDir);
		Fs.writeFileSync(
			Path.join(outDir, 'data.js'),
			`window.__OKF__ = ${JSON.stringify(data, null, 2)};\n`,
			'utf-8',
		);

		const url = await WebviewCommand.serve(outDir);
		console.log(`okforge webview serving ${OkfFetch.isUrl(bundle) === true ? bundle : root}`);
		console.log(`  concepts: ${data.concepts.length}, broken links: ${WebviewCommand.brokenCount(data)}`);
		console.log(`  ${url}`);
		console.log('  (press Ctrl-C to stop)');
	}

	/**
	 * Resolve a bundle source to a local root directory plus a display name. Local
	 * paths are validated in place; http(s) URLs are downloaded into a temp dir
	 * first (see {@link OkfFetch.materialize}) and then treated as local.
	 */
	static async resolveBundle(bundle: string): Promise<{ root: string; name: string }> {
		if (OkfFetch.isUrl(bundle) === true) {
			return { root: await OkfFetch.materialize(bundle), name: OkfFetch.bundleName(bundle) };
		}
		const root = Path.resolve(bundle);
		if (Fs.existsSync(root) === false || Fs.statSync(root).isDirectory() === false) {
			throw new Error(`no bundle directory at ${root}`);
		}
		return { root, name: Path.basename(root) };
	}

	/** Build the data island for the bundle rooted at `root`, labelled `name`. */
	static buildData(root: string, name: string): BakedData {
		const graph = OkfGraph.build(root);
		const concepts = WebviewCommand.bakeConcepts(graph, root);
		const reserved = WebviewCommand.bakeReserved(root);
		return {
			root: name,
			generatedAt: new Date().toISOString(),
			concepts,
			reserved,
			overview: WebviewCommand.overview(graph),
		};
	}

	/** Every concept node plus its inbound links and raw markdown body. */
	static bakeConcepts(graph: OkfGraphData, root: string): BakedConcept[] {
		const concepts: BakedConcept[] = [];
		for (const node of graph.concepts.values()) {
			const slash = node.file.indexOf('/');
			concepts.push({
				id: node.id,
				file: node.file,
				group: slash === -1 ? '<root>' : node.file.slice(0, slash),
				type: node.type,
				title: node.title,
				description: node.description,
				tags: node.tags,
				outbound: node.outbound,
				inbound: OkfGraph.inbound(graph, node.id),
				broken: node.broken,
				markdown: Fs.readFileSync(Path.join(root, node.file), 'utf-8'),
			});
		}
		return concepts.sort((a, b) => a.id.localeCompare(b.id));
	}

	/** Raw bodies of every reserved file (`index.md`, `log.md`) keyed by bundle path. */
	static bakeReserved(root: string): Record<string, string> {
		const reserved: Record<string, string> = {};
		for (const entry of OkfStore.walk(root)) {
			if (entry.isDirectory === true || entry.path.endsWith('.md') === false) {
				continue;
			}
			if (OkfGraph.isReserved(Path.basename(entry.path)) === false) {
				continue;
			}
			const file = OkfGraph.toPosix(Path.relative(root, entry.path));
			reserved[file] = Fs.readFileSync(entry.path, 'utf-8');
		}
		return reserved;
	}

	/** Bundle summary mirroring `okforge graph overview`. */
	static overview(graph: OkfGraphData): unknown {
		return {
			conceptCount: graph.concepts.size,
			groups: OkfGraph.groups(graph),
			hubs: OkfGraph.hubs(graph, HUB_LIMIT),
			orphans: OkfGraph.orphans(graph),
			broken: OkfGraph.broken(graph),
		};
	}

	/** Number of broken links reported in the baked overview. */
	static brokenCount(data: BakedData): number {
		const broken = (data.overview as { broken: unknown[] }).broken;
		return Array.isArray(broken) === true ? broken.length : 0;
	}

	/** Recursively copy `from` into `to`, creating directories as needed. */
	static copyTree(from: string, to: string): void {
		Fs.mkdirSync(to, { recursive: true });
		for (const entry of Fs.readdirSync(from, { withFileTypes: true })) {
			const source = Path.join(from, entry.name);
			const target = Path.join(to, entry.name);
			if (entry.isDirectory() === true) {
				WebviewCommand.copyTree(source, target);
				continue;
			}
			Fs.copyFileSync(source, target);
		}
	}

	/** Serve `dir` as a static site on an ephemeral localhost port; resolves with the URL. */
	static serve(dir: string): Promise<string> {
		const server = Http.createServer((request, response) => {
			WebviewCommand.handleRequest(dir, request, response);
		});
		return new Promise((resolve, reject) => {
			server.on('error', reject);
			server.listen(0, '127.0.0.1', () => {
				const address = server.address();
				if (address === null || typeof address === 'string') {
					reject(new Error('failed to bind webview server'));
					return;
				}
				resolve(`http://127.0.0.1:${address.port}/`);
			});
		});
	}

	/** Serve a single static file from `dir`, guarding against path traversal. */
	static handleRequest(dir: string, request: Http.IncomingMessage, response: Http.ServerResponse): void {
		const requestPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
		const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
		const target = Path.join(dir, relative);
		if (target.startsWith(dir) === false || Fs.existsSync(target) === false || Fs.statSync(target).isDirectory() === true) {
			response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
			response.end('not found');
			return;
		}
		const contentType = CONTENT_TYPES[Path.extname(target)] ?? 'application/octet-stream';
		response.writeHead(200, { 'content-type': contentType });
		response.end(Fs.readFileSync(target));
	}
}

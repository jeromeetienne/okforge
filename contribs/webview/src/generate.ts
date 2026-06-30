import Fs from 'node:fs';
import Path from 'node:path';
import Url from 'node:url';
import { Command } from 'commander';
import { OkfGraph, OkfGraphData } from '../../../src/misc/okf_graph.js';
import { OkfStore } from '../../../src/misc/okf_store.js';

/** Number of top hub concepts surfaced in the overview, matching the graph CLI. */
const HUB_LIMIT = 10;

/** Directory of this script (`contribs/webview/src/`). */
const SCRIPT_DIR = Path.dirname(Url.fileURLToPath(import.meta.url));

/** Root of the webview contribution holding the static `template/` and `dist/`. */
const WEBVIEW_DIR = Path.join(SCRIPT_DIR, '..');

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
 * Generator for the static OKF webview. Builds the concept graph with the same
 * deterministic engine the CLI uses ({@link OkfGraph}), bakes every concept's
 * graph metadata and raw markdown plus the reserved `index.md`/`log.md` bodies
 * into a `data.js` island, then copies the static browser app alongside it. The
 * output opens directly from `file://` with no server.
 */
class WebviewGenerator {
	/** Build the data island for the bundle rooted at `root`. */
	static buildData(root: string): BakedData {
		const graph = OkfGraph.build(root);
		const concepts = WebviewGenerator.bakeConcepts(graph, root);
		const reserved = WebviewGenerator.bakeReserved(root);
		return {
			root: Path.basename(root),
			generatedAt: new Date().toISOString(),
			concepts,
			reserved,
			overview: WebviewGenerator.overview(graph),
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

	/** Recursively copy `from` into `to`, creating directories as needed. */
	static copyTree(from: string, to: string): void {
		Fs.mkdirSync(to, { recursive: true });
		for (const entry of Fs.readdirSync(from, { withFileTypes: true })) {
			const source = Path.join(from, entry.name);
			const target = Path.join(to, entry.name);
			if (entry.isDirectory() === true) {
				WebviewGenerator.copyTree(source, target);
				continue;
			}
			Fs.copyFileSync(source, target);
		}
	}

	/** Generate the site: bake `data.js` and copy the template into `out`. */
	static run(bundle: string, out: string): void {
		const root = Path.resolve(bundle);
		if (Fs.existsSync(root) === false || Fs.statSync(root).isDirectory() === false) {
			throw new Error(`no bundle directory at ${root}`);
		}
		const outDir = Path.resolve(out);
		const data = WebviewGenerator.buildData(root);

		Fs.mkdirSync(outDir, { recursive: true });
		WebviewGenerator.copyTree(Path.join(WEBVIEW_DIR, 'template'), outDir);
		Fs.writeFileSync(
			Path.join(outDir, 'data.js'),
			`window.__OKF__ = ${JSON.stringify(data, null, 2)};\n`,
			'utf-8',
		);

		const brokenCount = Array.isArray((data.overview as { broken: unknown[] }).broken)
			? (data.overview as { broken: unknown[] }).broken.length
			: 0;
		console.log(`okforge webview generated at ${Path.join(outDir, 'index.html')}`);
		console.log(`  bundle: ${root}`);
		console.log(`  concepts: ${data.concepts.length}, broken links: ${brokenCount}`);
	}
}

const program = new Command();
program
	.name('okforge-webview')
	.description('Generate a static website to browse an OKF bundle')
	.option('-b, --bundle <dir>', 'bundle root directory', Path.join(WEBVIEW_DIR, '..', '..', '.okf'))
	.option('-o, --out <dir>', 'output directory', Path.join(WEBVIEW_DIR, 'dist'))
	.action((options: { bundle: string; out: string }) => {
		WebviewGenerator.run(options.bundle, options.out);
	});
program.parse();

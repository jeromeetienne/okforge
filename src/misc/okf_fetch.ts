import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { OkfGraph } from './okf_graph.js';
import { OkfLink } from './okf_link.js';

/** Bundle entry points seeded into every crawl before following links. */
const SEED_FILES = ['index.md', 'log.md'];

/** Progress reported by {@link OkfFetch.materialize} after each file is downloaded. */
export type OkfFetchProgress = {
	downloaded: number;
	current: string;
};

/**
 * Materializes a remote OKF bundle into a local temp directory so the rest of the
 * toolchain — which only reads local directory trees ({@link OkfGraph.build} /
 * {@link OkfStore.walk}) — can treat it exactly like a local bundle.
 *
 * Arbitrary HTTP hosts cannot be directory-listed, so the bundle is discovered by
 * crawling: seed with `index.md`/`log.md`, then follow every in-bundle `.md` link
 * (the same absolute/relative resolution the graph engine uses) until the
 * reachable file set is exhausted. Links that 404 are simply left unwritten, so
 * the generator reports them as broken exactly as it would for a local bundle.
 *
 * GitHub `tree` URLs are rewritten to their `raw.githubusercontent.com`
 * equivalent as a convenience, then treated as an ordinary URL bundle.
 */
export class OkfFetch {
	/** Whether `bundle` is an http(s) URL rather than a local path. */
	static isUrl(bundle: string): boolean {
		return /^https?:\/\//i.test(bundle) === true;
	}

	/**
	 * Download the bundle at `url` into a fresh temp directory and return that
	 * directory. `onProgress`, when given, is invoked after each file is written,
	 * so callers can render download progress.
	 */
	static async materialize(url: string, onProgress?: (progress: OkfFetchProgress) => void): Promise<string> {
		const base = OkfFetch.normalizeBase(url);
		const outDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'okforge-fetch-'));
		const seen = new Set<string>();
		const queue = [...SEED_FILES];
		let indexFound = false;
		let downloaded = 0;
		while (queue.length > 0) {
			const file = queue.shift() as string;
			if (seen.has(file) === true) {
				continue;
			}
			seen.add(file);
			const content = await OkfFetch.fetchText(base + file);
			if (content === null) {
				continue;
			}
			OkfFetch.writeFile(outDir, file, content);
			downloaded += 1;
			if (onProgress !== undefined) {
				onProgress({ downloaded, current: file });
			}
			if (file === 'index.md') {
				indexFound = true;
			}
			for (const target of OkfGraph.extractLinkTargets(content)) {
				const next = OkfFetch.resolveTarget(target, file);
				if (next !== null && seen.has(next) === false) {
					queue.push(next);
				}
			}
		}
		if (indexFound === false) {
			Fs.rmSync(outDir, { recursive: true, force: true });
			throw new Error(`no OKF bundle at ${base}: index.md not reachable`);
		}
		return outDir;
	}

	/**
	 * Normalize a bundle URL to a base ending in `/`, so `base + 'index.md'` is the
	 * URL of the bundle index. A GitHub `tree` URL
	 * (`https://github.com/<owner>/<repo>/tree/<ref>/<path>`) is rewritten to its
	 * `https://raw.githubusercontent.com/<owner>/<repo>/refs/heads/<ref>/<path>/`
	 * equivalent.
	 */
	static normalizeBase(url: string): string {
		const github = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/i);
		if (github !== null) {
			const [, owner, repo, ref, path] = github;
			const clean = path.replace(/\/+$/, '');
			return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${ref}/${clean}/`;
		}
		return url.endsWith('/') === true ? url : `${url}/`;
	}

	/** Friendly bundle name from a URL: the last path segment of the normalized base. */
	static bundleName(url: string): string {
		const base = OkfFetch.normalizeBase(url).replace(/\/+$/, '');
		const segment = base.slice(base.lastIndexOf('/') + 1);
		return segment === '' ? base : segment;
	}

	/**
	 * Resolve a markdown link `target` found in bundle file `fromFile` to a
	 * bundle-relative `.md` path, or null when it is not an in-bundle link (anchor,
	 * external URL, non-`.md` target, or a path escaping the bundle root). Thin
	 * wrapper over the shared, fs-free {@link OkfLink.resolveBundleLink} core.
	 */
	static resolveTarget(target: string, fromFile: string): string | null {
		return OkfLink.resolveBundleLink(target, fromFile)?.file ?? null;
	}

	/** GET `url` as UTF-8 text, or null on any non-200 response or network error. */
	static async fetchText(url: string): Promise<string | null> {
		let response: Response;
		try {
			response = await fetch(url);
		} catch {
			return null;
		}
		if (response.ok === false) {
			return null;
		}
		return await response.text();
	}

	/** Write bundle-relative `file` under `outDir`, creating parent directories. */
	static writeFile(outDir: string, file: string, content: string): void {
		const target = Path.join(outDir, ...file.split('/'));
		Fs.mkdirSync(Path.dirname(target), { recursive: true });
		Fs.writeFileSync(target, content, 'utf-8');
	}
}

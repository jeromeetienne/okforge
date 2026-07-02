import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';

/** A file tree to materialize on disk: relative POSIX path -> file content. */
export type FileTree = Record<string, string>;

/**
 * Write `tree` into a fresh temp directory and return its absolute path. Parent
 * directories are created as needed. Use {@link removeTree} to clean up.
 */
export function makeTree(tree: FileTree): string {
	const root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'okforge-test-'));
	for (const [relative, content] of Object.entries(tree)) {
		const target = Path.join(root, ...relative.split('/'));
		Fs.mkdirSync(Path.dirname(target), { recursive: true });
		Fs.writeFileSync(target, content, 'utf-8');
	}
	return root;
}

/** Recursively remove a directory created by {@link makeTree}. */
export function removeTree(root: string): void {
	Fs.rmSync(root, { recursive: true, force: true });
}

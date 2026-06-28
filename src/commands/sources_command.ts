import { OkfStore } from '../misc/okf_store.js';

/** `sources` — print the source paths a folder is derived from. */
export class SourcesCommand {
	/** The source path prefixes `folder` is derived from; throws when undeclared. */
	static sources(cwd: string, folder: string): string[] {
		const prefixes = OkfStore.sources(cwd, folder);
		if (prefixes.length === 0) {
			throw new Error(`unknown folder: ${folder}`);
		}
		return prefixes;
	}
}

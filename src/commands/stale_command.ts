import { OkfStore } from '../misc/okf_store.js';

/** `stale` — folders whose source changed while the folder itself was not updated. */
export class StaleCommand {
	/**
	 * Printable lines, one per stale folder: `<folder> (source changed: <path>)`.
	 * Without `since`, drift is the working tree vs `HEAD` (uncommitted edits).
	 * With `since`, drift is the committed range `<since>...HEAD`, for CI gating.
	 */
	static stale(cwd: string, since?: string): string[] {
		const stale = since !== undefined && since !== ''
			? OkfStore.staleFoldersSince(cwd, since)
			: OkfStore.staleFolders(cwd);
		return stale.map(({ folder, source }) => `${folder} (source changed: ${source})`);
	}
}

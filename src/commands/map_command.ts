import { OkfStore } from '../misc/okf_store.js';

/** `map` — print the full folder -> sources mapping. */
export class MapCommand {
	/** The mapping as printable lines: `## <folder>` headers with `  - <source>` rows. */
	static map(cwd: string): string[] {
		const lines: string[] = [];
		for (const folder of OkfStore.folders(cwd)) {
			lines.push(`## ${folder}`);
			for (const source of OkfStore.sources(cwd, folder)) {
				lines.push(`  - ${source}`);
			}
		}
		return lines;
	}
}

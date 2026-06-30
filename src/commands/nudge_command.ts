import Fs from 'node:fs';
import Path from 'node:path';
import Os from 'node:os';
import { z } from 'zod';
import { OkfStore } from '../misc/okf_store.js';

/** Stop-hook payload read from stdin; only these flat fields are used. */
const HookInputSchema = z
	.object({
		session_id: z.string().optional(),
		cwd: z.string().optional(),
	})
	.passthrough();

/** Parsed Stop-hook payload. */
export type HookInput = z.infer<typeof HookInputSchema>;

/**
 * Stop-hook companion to the okf skill. When a session changed source that an OKF
 * folder is derived from but left `.okf/` untouched, it prints a gentle,
 * non-blocking reminder to refresh the affected docs. It fires at most once per
 * session and stays silent when `.okf/` was already touched. The folder <-> source
 * mapping lives in the repository's `.okforge.config.json`, so the hook and the
 * skill read a single source of truth.
 */
export class NudgeCommand {
	/** Read the hook payload from stdin and evaluate the nudge; never throws. */
	static async nudge(): Promise<void> {
		try {
			const raw = await NudgeCommand.readStdin();
			let input: HookInput = {};
			try {
				input = HookInputSchema.parse(JSON.parse(raw));
			} catch {
				input = {};
			}
			NudgeCommand.evaluate(input);
		} catch {
			// A Stop hook must never break the session; stay silent on any failure.
		}
	}

	/** Decide whether to nudge for this payload, printing the message when it fires. */
	static evaluate(input: HookInput): void {
		const cwd = input.cwd !== undefined && input.cwd !== '' ? input.cwd : process.cwd();
		const sessionId = input.session_id !== undefined && input.session_id !== '' ? input.session_id : 'nosession';
		const marker = Path.join(Os.tmpdir(), `claude-okf-nudge-${sessionId}`);

		// Already nudged this session, not a git repo, or .okf/ already being touched.
		if (Fs.existsSync(marker) === true) {
			return;
		}
		if (OkfStore.isGitRepo(cwd) === false) {
			return;
		}
		if (OkfStore.git(['status', '--porcelain', '--', '.okf'], cwd) !== '') {
			return;
		}

		const stale = OkfStore.staleFolders(cwd);
		if (stale.length === 0) {
			return;
		}

		Fs.writeFileSync(marker, '');
		const folders = stale.map((entry) => entry.folder).join(', ');
		const message = `Source documented by the OKF bundle changed this session (${folders}) but .okf/ was not updated. Consider running /okforge refresh <folder> to keep the knowledge bundle in sync.`;
		process.stdout.write(`${JSON.stringify({ systemMessage: message })}\n`);
	}

	/** Read all of stdin as UTF-8 text. */
	static async readStdin(): Promise<string> {
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(Buffer.isBuffer(chunk) === true ? chunk : Buffer.from(chunk));
		}
		return Buffer.concat(chunks).toString('utf-8');
	}
}

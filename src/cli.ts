#!/usr/bin/env node
import Fs from 'node:fs';
import Path from 'node:path';
import { Command } from 'commander';
import Chalk from 'chalk';
import { MapCommand } from './commands/map_command.js';
import { FoldersCommand } from './commands/folders_command.js';
import { SourcesCommand } from './commands/sources_command.js';
import { StaleCommand } from './commands/stale_command.js';
import { CheckCommand } from './commands/check_command.js';
import { NudgeCommand } from './commands/nudge_command.js';

/** Wire up the subcommands and run them. */
async function main(): Promise<void> {
	const packageJsonPath = Path.join(import.meta.dirname, '..', 'package.json');
	const { version } = JSON.parse(Fs.readFileSync(packageJsonPath, 'utf8')) as { version: string };

	const program = new Command();
	program
		.name('okforge')
		.description('Deterministic mechanics and Stop-hook nudge for the okf (Open Knowledge Format) skill')
		.version(version, '-V, --version', 'output the version number');

	program
		.command('folders')
		.description('List the OKF concept folders declared in .okforge.config.json')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			for (const folder of FoldersCommand.folders(Path.resolve(dir))) {
				console.log(folder);
			}
		});

	program
		.command('map')
		.description('Print the full folder -> sources mapping')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			for (const line of MapCommand.map(Path.resolve(dir))) {
				console.log(line);
			}
		});

	program
		.command('sources')
		.description('Print the source paths a folder is derived from')
		.argument('<folder>', 'OKF concept folder')
		.argument('[dir]', 'Repository root', '.')
		.action((folder: string, dir: string) => {
			for (const source of SourcesCommand.sources(Path.resolve(dir), folder)) {
				console.log(source);
			}
		});

	program
		.command('stale')
		.description('List folders whose source changed since HEAD while the folder was not edited')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			for (const line of StaleCommand.stale(Path.resolve(dir))) {
				console.log(line);
			}
		});

	program
		.command('check')
		.description('Conformance + dead-link lint; exits non-zero on problems')
		.argument('[dir]', 'Repository root', '.')
		.action((dir: string) => {
			const cwd = Path.resolve(dir);
			let result;
			try {
				result = CheckCommand.check(cwd);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(message);
				process.exit(2);
			}
			for (const problem of result.problems) {
				console.log(problem);
			}
			if (result.problems.length === 0) {
				console.log(result.summary);
				return;
			}
			console.error(result.summary);
			process.exit(1);
		});

	program
		.command('nudge')
		.description('Stop-hook companion: read the hook payload on stdin and maybe remind')
		.action(async () => {
			await NudgeCommand.nudge();
		});

	await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(Chalk.red(`error: ${message}`));
	process.exit(1);
});

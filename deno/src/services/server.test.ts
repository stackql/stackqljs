import { Server } from './server.ts';
import { assert } from '../../dev_deps.ts';
import { startStackQLServer } from '../../../testing/utils.ts';

Deno.test('Successful Connection', async () => {
	const { closeProcess } = await startStackQLServer();
	const server = new Server();
	const pg = await server.connect(
		'postgres://postgres:password@localhost:5444/postgres',
	);
	assert(pg);
	await server.close();
	await closeProcess();
});

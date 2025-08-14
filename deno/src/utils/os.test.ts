import {
	assert,
	assertEquals,
	assertRejects,
	assertStringIncludes,
	assertThrows,
	stub,
} from '../../dev_deps.ts';
import osUtils from './os.ts';

Deno.test('osUtils.runCommand: Test Successful Execution', async () => {
	const command = Deno.build.os === 'windows' ? 'cmd' : 'echo';
	const args = Deno.build.os === 'windows'
		? ['/c', 'echo', 'Hello, World!']
		: ['Hello, World!'];
	const result = await osUtils.runCommand(command, args);
	assertStringIncludes(result.trim(), 'Hello, World!');
});

Deno.test('osUtils.runCommand: Test Failed Execution', () => {
	const command = 'invalid';
	const args = Deno.build.os === 'windows'
		? ['/c', 'echo', 'Hello, World!']
		: ['Hello, World!'];
	assertRejects(async () => {
		await osUtils.runCommand(command, args);
	});
});

Deno.test('fileExists: returns false if no path is provided', () => {
	const result = osUtils.fileExists();

	assertEquals(result, false);
});

Deno.test('fileExists: returns true if file exists', () => {
	const tempFile = Deno.makeTempFileSync();

	const result = osUtils.fileExists(tempFile);

	assertEquals(result, true);

	Deno.removeSync(tempFile);
});

Deno.test('fileExists: returns false if file does not exist', () => {
	const result = osUtils.fileExists('/path/to/nonexistent/file');

	assertEquals(result, false);
});

Deno.test('fileExists: throws error for exceptions other than NotFound', () => {
	const statSyncStub = stub(Deno, 'statSync', () => {
		throw new Deno.errors.PermissionDenied('Permission denied');
	});

	try {
		assertThrows(
			() => osUtils.fileExists('/path/to/inaccessible/directory'),
			Deno.errors.PermissionDenied,
			'Permission denied',
		);
	} finally {
		statSyncStub.restore();
	}

	assertEquals(statSyncStub.calls.length, 1);
});

Deno.test('chmod: changes file mode on non-Windows systems', async () => {
	// Skip the test if running on Windows
	if (Deno.build.os === 'windows') {
		console.log('Skipping chmod test on Windows OS');
		return;
	}

	const tempFile = await Deno.makeTempFile();
	const newMode = 0o777;
	try {
		await osUtils.chmod(tempFile, newMode);

		const fileInfo = await Deno.stat(tempFile);
		assert(fileInfo);
		assert(fileInfo.mode);
		assertEquals(fileInfo.mode & 0o777, newMode);
	} finally {
		await Deno.remove(tempFile);
	}
});

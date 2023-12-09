import { decompress } from 'https://deno.land/x/zip/mod.ts'

type UnpackParams = {
	downloadDir: string
	archiveFileName: string
}

export const darwinUnpack = async (params: UnpackParams) => {
	console.log('darwinUnpack')
	const { downloadDir, archiveFileName } = params
	const unpackedFileName = `${downloadDir}/stackql`
	const commandPath = 'pkgutil'
	const commandArgs = ['--expand-full', archiveFileName, unpackedFileName]
	const process = new Deno.Command(commandPath, {
		args: commandArgs,
		stdout: 'piped',
		stderr: 'piped',
	})

	const { code, stdout, stderr } = await process.output()
	if (code !== 0) {
		const output = new TextDecoder().decode(stdout)
		const errorOutput = new TextDecoder().decode(stderr)
		console.error('Error executing pkgutil:', output, errorOutput)
		throw new Error('Failed to unpack stackql')
	}
}

export const unzip = async (params: UnpackParams) => {
	console.log('unzip')
	try {
		await decompress(params.archiveFileName, params.downloadDir)
	} catch (error) {
		console.log('[unzip] error:', error)
		throw new Error('Failed to unpack stackql')
	}
}

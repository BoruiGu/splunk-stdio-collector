import tty from 'tty'
import { execa, Options } from 'execa'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { jest } from '@jest/globals'

describe('cli', () => {
    const cliPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/cli.ts')
    const env = { SPLUNK_URL: 'url', SPLUNK_TOKEN: 'token' }
    const options: Options = { env, preferLocal: true, shell: true }

    const send = jest.fn()
    const flush = jest.fn()
    jest.mock('splunk-logging', () => ({
        Logger: () => ({ send, flush }),
    }))

    test('prints help and version', async () => {
        let stdout = (await execa('tsm', [cliPath, '-h'], options)).stdout
        expect(stdout).toContain('Usage')

        stdout = (await execa('tsm', [cliPath, '--help'], options)).stdout
        expect(stdout).toContain('Usage')

        stdout = (await execa('tsm', [cliPath, '-v'], options)).stdout
        expect(stdout).toMatch(/\d{1,2}\.\d{1,2}\.\d{1,2}/)

        stdout = (await execa('tsm', [cliPath, '--version'], options)).stdout
        expect(stdout).toMatch(/\d{1,2}\.\d{1,2}\.\d{1,2}/)
    })

    test('prints help and exit if no data piped into command', async () => {
        const { stdout } = await execa('tsm', [cliPath], options).catch((err) => err)
        expect(stdout).toContain('Usage')
    })

    // test('prints help and exit if stdin is tty', async () => {
    //     const { stdout } = await execa('tsm', [cliPath], { ...options, stdin: new tty.ReadStream(0) }).catch((err) => err)
    //     expect(stdout).toContain('Usage')
    // })

    test('exit if missing environment variables', async () => {
        const { stdout, stderr } = await execa(`echo abc | tsm ${cliPath}`, {
            ...options,
            env: { ...process.env, SPLUNK_URL: undefined, SPLUNK_TOKEN: undefined },
        }).catch((err) => err)

        expect(stdout).toBe('')
        expect(stderr).toContain('environment variables')
        expect(send).not.toHaveBeenCalled()
        expect(flush).not.toHaveBeenCalled()
    })

    // test('send logs to splunk and stdout', async () => {
    //     jest.spyOn(console, 'log')

    //     const { stdout, stderr } = await execa(`echo abc | tsm ${cliPath}`, options).catch((err) => err)

    //     expect(stdout).toBe('abc\ndef\n')
    //     expect(stderr).toContain('2 logs')
    //     expect(send).toHaveBeenCalledTimes(2)
    //     expect(flush).not.toHaveBeenCalled()
    // })

    // describe('options')
    // describe('logging and error handling') (stdout should not have [ssc]!)
    // describe('ctrl+c shutdown code')
    // describe('ctrl+c after stdin end')
})

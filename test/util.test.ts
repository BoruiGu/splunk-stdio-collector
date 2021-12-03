import { createLogger } from '../src/util'

describe('util', () => {
    test('createLogger', async () => {
        jest.spyOn(console, 'error')
        const { error } = createLogger({ quiet: false, silent: false })

        const func = async () => {
            await Promise.resolve()
            throw new Error('noo')
        }

        await func().catch(error)
        expect(console.error).toHaveBeenCalledWith('splunk-stdio-collector:', 'noo')

        error('err\n at a.file\n at b.file')
        expect(console.error).toHaveBeenCalledWith('splunk-stdio-collector:', 'err')
    })
})

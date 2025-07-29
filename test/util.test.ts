import { jest } from '@jest/globals'
import { createLogger, noop } from '../src/util.js'

describe('util', () => {
    test('createLogger', async () => {
        jest.spyOn(console, 'error').mockImplementation(noop)
        const { error } = createLogger({ packageName: 'my-pkg', quiet: false, silent: false })

        const func = async () => {
            await Promise.resolve()
            throw new Error('noo')
        }

        await func().catch(error)
        expect(console.error).toHaveBeenCalledWith('[my-pkg]', 'noo')

        error('err\n at a.file\n at b.file')
        expect(console.error).toHaveBeenCalledWith('[my-pkg]', 'err')
    })
})

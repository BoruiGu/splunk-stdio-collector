import * as stream from 'stream'
import { stackTraceMerger } from '../src/stackTraceMerger.js'
import { toArray } from './testUtil.js'

test('stackTraceMerger', async () => {
    let output: string[]

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', 'b'])))
    expect(output).toEqual(['a', 'b'])

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', '  at hh', '  at qq', 'b', 'c'])))
    expect(output).toEqual(['a\n  at hh\n  at qq', 'b', 'c'])

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', '  at hh', '  at qq', 'b', 'at gg'])))
    expect(output).toEqual(['a\n  at hh\n  at qq', 'b\nat gg'])
})

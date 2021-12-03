import * as stream from 'stream'
import { splitter } from './splitter'
import { stackTraceMerger } from './stackTraceMerger'

const it = async (testCase: string, exec: () => Promise<void>) => {
    try {
        await exec()
    } catch (error) {
        console.error(`${testCase} failed: ${error}`)
        return
    }
    console.log(`${testCase} passed`)
}

const expect = <T>(actual: T) => ({
    toBe: (expected: T) => {
        if (actual !== expected) {
            throw new Error(`Expect ${actual} to be ${expected}`)
        }
    },
    toEqual: (expected: T) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expect ${actual} to equal ${expected}`)
        }
    },
})

it('splitter', async () => {
    let output: string

    output = await concat(splitter(stream.Readable.from(['a', 'bc\n', 'def\n'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from(['a', 'bc\n', 'def'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from(['a', 'bc', '\ndef'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from(['a', 'b', 'c\nde', 'f'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from(['abc\ndef'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from(['abc\ndef\n'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from([...'abc\ndef\n'])))
    expect(output).toBe('abc\ndef')

    output = await concat(splitter(stream.Readable.from([...'  abc\n \t\n \t \ndef\n\n'])))
    expect(output).toBe('  abc\ndef')

    output = await concat(splitter(stream.Readable.from(['a', ' b ', 'c\nd', 'ef'])))
    expect(output).toBe('a b c\ndef')

    const text = 'cd \n  fr l\nl\tg'
    for (const chunks of divide(text)) {
        output = await concat(splitter(stream.Readable.from(chunks)))
        expect(output).toBe(text)
    }
})

it('stackTraceMerger', async () => {
    let output: string[]

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', 'b'])))
    expect(output).toEqual(['a', 'b'])

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', '  at hh', '  at qq', 'b', 'c'])))
    expect(output).toEqual(['a\n  at hh\n  at qq', 'b', 'c'])

    output = await toArray(stackTraceMerger(stream.Readable.from(['a', '  at hh', '  at qq', 'b', 'at gg'])))
    expect(output).toEqual(['a\n  at hh\n  at qq', 'b\nat gg'])
})

async function concat(source: AsyncGenerator<string>) {
    return (await toArray(source)).join('\n')
}

async function toArray(source: AsyncGenerator<string>) {
    const lines: string[] = []
    for await (const line of source) {
        lines.push(line)
    }
    return lines
}

/** returns all possible ways to divide a string
 * @example divide('abc') returns
 * ['a', 'b', 'c']
 * ['a', 'bc']
 * ['ab', 'c']
 * ['abc']
 */
function* divide(str: string): Generator<string[], void, void> {
    if (str.length === 0) {
        yield []
    }

    for (let n = 1; n <= str.length; n++) {
        const curr = str.slice(0, n)
        const rest = str.slice(n)
        for (const d of divide(rest)) {
            yield [curr, ...d]
        }
    }
}

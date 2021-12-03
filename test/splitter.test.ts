import * as stream from 'stream'
import { splitter } from '../src/splitter'
import { concat, divide } from './testUtil'

test('splitter', async () => {
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

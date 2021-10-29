import stripAnsi from 'strip-ansi'

export async function* splitter(source: NodeJS.ReadableStream) {
    source.setEncoding('utf-8')
    let str = ''

    for await (const chunk of source) {
        str += chunk
        const lines = str.split(/[\r\n]/)

        if (!/[\r\n]$/.test(chunk as string)) {
            // chunk ends in the middle of a line
            str = lines.pop() ?? ''
        } else {
            str = ''
        }

        for (const line of lines.map(stripAnsi).filter(notEmpty)) {
            yield line
        }
    }

    if (str.length > 0) {
        yield str
    }
}

function notEmpty(str: string) {
    return Boolean(str) && !/^\s+$/.test(str)
}

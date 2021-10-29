export async function* stackTraceMerger(source: NodeJS.ReadableStream) {
    let log = ''

    for await (const line of source) {
        if (isStackTrace(line as string)) {
            log += '\n' + line
            continue
        }

        if (log.length > 0) {
            yield log
        }

        log = line as string
    }

    if (log.length > 0) {
        yield log
    }
}

function isStackTrace(line: string) {
    return /^\s*at/.test(line)
}
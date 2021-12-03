export async function* stackTraceMerger(source: AsyncIterable<string>) {
    let log = ''

    for await (const line of source) {
        if (isStackTrace(line)) {
            log += '\n' + line
            continue
        }

        if (log.length > 0) {
            yield log
        }

        log = line
    }

    if (log.length > 0) {
        yield log
    }
}

function isStackTrace(line: string) {
    return /^\s*at/.test(line)
}

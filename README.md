# Splunk Stdio Collector

Send logs from input stream to splunk

## Requirement

Node.js >= 16.13.0

set environmet variables `SPLUNK_URL` and `SPLUNK_TOKEN`

## Install

```bash
npm install --global tsm splunk-stdout-collector
brew install coreutils # optional but recommeneded, turn off buffering in pipe
```

## Usage

```text
splunk-stdio-collector [options]

Options:
-s, --source <str>      Set \`source\` field in logs [default: stdio]
-st, --sourcetype <str> Set \`sourcetype\` field in logs
--host <str>            Set \`host\` field in logs [default: host name of the operating system]

alias: ssc

Examples:
$ stdbuf -i0 -o0 -e0 npm start | ssc -st my-program
$ cat log.txt | ssc
```

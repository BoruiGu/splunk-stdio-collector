# Splunk Stdio Collector

## Requirement

set environmet variable `SPLUNK_URL` and `SPLUNK_TOKEN`

## Usage

```bash
npm install --global tsm
brew install coreutils

npm ci
npm link

stdbuf -i0 -o0 -e0 <command> | splunk-stdio-collector [-s (silent)] [source (optional)]
```

the log will have `sourcetype=stdio`, `host` set to your host name, and `source` (if provided)

---
'@liveog/renderer': minor
'@liveog/cli': minor
---

Progress output while rendering, and a quiet FFmpeg.

`render()` accepts an `onProgress` callback reporting launch, capture and encode
stages, and a `verbose` flag. FFmpeg's stderr is captured instead of inherited,
so a successful render no longer prints 60 lines of encoder statistics — on
failure the last 15 lines are included in the error.

The CLI draws a spinner and progress bar on a TTY, falls back to plain lines in
CI or when piped, and ends with a summary of file sizes plus the meta tags.
`--no-progress` and `--verbose` opt out.

Also fixes `liveog --version`, which crashed with an unhandled
`ERR_PARSE_ARGS_UNKNOWN_OPTION`, and makes a bare `liveog` print usage instead
of an error.

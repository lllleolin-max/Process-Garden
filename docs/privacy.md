# Privacy

Process Garden is local-only. It contains no telemetry, analytics, crash upload, account, cloud sync or remote monitoring code.

The collector reads only operating-system metadata required for the visualization: aggregate CPU/memory/uptime, process PID/name/parent PID/start time/resource usage/executable path, and Windows thread counts. For visual identity, the Windows Shell reads the icon resource embedded in the executable and converts it to a small in-memory PNG. It does **not** read executable code, process memory, document contents, command contents, keystrokes, browser history, packet payloads or per-process network connections.

Agent visuals are inferred from executable names and parent/child process relationships. A child process may appear as a growing "task embryo", but Process Garden never reads the prompt, response, project file or task content behind that process. Growth stages are derived only from the child process age.

Snapshots remain in an in-memory bounded history (120 samples). Extracted icons and failed-icon results are also memory-only and keyed by executable path. Preferences and validated theme manifests are stored in browser local storage. No process snapshot or extracted icon is persisted to disk or sent over a network.

Theme packages are parsed locally. They cannot execute scripts, load remote code, reference paths outside their ZIP or silently override built-in themes. v1 accepts a manifest-only archive and rejects unknown files.

Image-generation work used only the two author-provided visual references and art-direction prompts. No process names, paths, metrics or user system data were included.

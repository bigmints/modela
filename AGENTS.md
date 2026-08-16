# Modela agent instructions

- Run application logic through Docker; do not install runtime dependencies on the host.
- Preserve the last known-good catalogue if a source fetch or validation fails.
- Keep access types distinct: hosted free, free tier, local, open weights, paid, and unknown.
- Do not infer TTS or transcription from audio modality alone.
- Stage catalogue publication paths explicitly. Never broadly stage unrelated files.

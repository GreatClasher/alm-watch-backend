# Backend Tasks
- [x] Refactor `SessionController` and `DeviceController` to use a generic `@Get()` endpoint accepting `where`, `order`, and `select` query parameters.
- [x] Implement generic JSON query parser mapping to Drizzle ORM queries.
- [x] Enable fetching devices with session counts.
- [x] Add new endpoint `GET /v1/sessions/:sessionId/audio.ogg`.
- [x] Query `audio_packets` for given session ordered by sequence.
- [x] Stream Opus payload wrapped in Ogg container using a custom OggOpusWriter stream.
- [x] Provide exact API contracts to the Frontend Engineer.

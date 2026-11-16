Reparto en marcha — supplied voice recordings and music (2026-11-16)

The user supplied all 12 complete Spanish order recordings and the soundtrack.
These files replace the initial placeholder synthesized voice package unchanged.

Canonical source recordings: src/audio/orders/{placeId}.mp3
Canonical soundtrack: src/audio/Reparto en marcha (Gameplay Loop).mp3

npm run build copies these sources to public/audio/ and then dist/audio/.
Published paths: audio/orders/{placeId}.mp3 and audio/music/gameplay-loop.mp3.
To replace audio, update the canonical files in src/audio/ and rebuild.

Music loops continuously at 20% volume, including in menus, on game pause and
when leaving the tab. Any spoken order, including result-dialog replays, lowers
it fivefold to 4%; after the voice ends it returns to 20%. Only the explicit
music switch stops playback. Voice and music preferences are independent.
Playback starts only after an interaction with the page.

The game plays local MP3 files; there is no runtime speech-synthesis service.

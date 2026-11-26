# Zbace

A retro browser space shooter. Pure pixels, lasers, and high scores. Live at https://zbace.d85c.com/

It is a small exhibit on the d85c.com portfolio: a single-screen, top-down dodge-and-shoot game in TypeScript, Vite, Canvas 2D and WebAudio. No engine, no art or sound files.

Status: finished as an exhibit. Open to review, not actively developed.

## Controls

- Move: WASD or arrow keys, or drag in the bottom-left on a touch screen.
- Aim and shoot: mouse and hold left click, or tap and hold elsewhere on a touch screen.
- Pause: Esc or P (also pauses when the window loses focus).
- Mute: M or the SND button. The mute choice and your best score are saved in local storage.
- Add `?debug=1` to the URL to show the frame-rate readout.

## Build

```
cd retro-bullet-hell
npm ci
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run deploy   # publish dist/ to the gh-pages branch
```

The site is served from the `gh-pages` branch with the `zbace.d85c.com` custom domain (`public/CNAME`).

## License

MIT, see [LICENSE](LICENSE).

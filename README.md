# Certamen

A classics study app and live, moderated quiz competition built with Next.js, React, Firebase, NextAuth, and Socket.IO.

## Run locally

Use Node.js 22.13 or newer (Node 20.19+ also works). Install with `npm ci`, then run `npm run dev`. Open http://localhost:3000.

Keep your Firebase service-account, Firebase web-app, Google OAuth, and NextAuth settings in `.env.local`. The app expects the existing `FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` values. Set `NEXTAUTH_URL` to the URL you actually use. Never commit credentials.

## Run a competition

1. Sign in, open **Compete**, and choose **Create a competition**.
2. Share the four-letter room code. Other signed-in players join from their own devices.
3. The host chooses the question count, reading pace, and answer window, then starts the match. The host moderates and does not compete.
4. Questions appear word by word. Players press **Space** (outside a form control) or tap **Buzz in**. The first buzz received by the server wins and pauses the reader on every device.
5. The player types an answer and presses Enter, or answers aloud. The host sees the answer key and awards **Correct +10** or **Incorrect · resume**.
6. Incorrect answers and timeouts use that player's attempt. The question resumes for the remaining players. There are no negative points.
7. Correct answers, exhausted attempts, a no-buzz timeout, or a host pass reveal the answer. The host advances to the next question and, finally, the standings.
8. **Run it back** resets scores and returns everyone to the lobby.

The host can enable browser speech synthesis. Spoken reading stops on a buzz; the server independently controls visible text pacing. Voice availability and precise speech timing depend on the browser. Only the host plays audio, so players can listen over a shared room or call.

The included **Classics warm-up** pack contains 12 original practice toss-ups in `lib/question-pack.ts`. It is not an official tournament packet. The existing Nationals 2000 archive is empty and is not offered as playable content. This version supports free-for-all toss-ups; team bonuses and automatic answer judging are not implemented.

## Room lifecycle and hosting

Rooms, scores, and buzz state live in server memory. Reloading restores a player's score and attempts. A disconnected host has 60 seconds to return before the room closes; choosing **Close room** closes it immediately. A server restart clears rooms.

Run production with `npm run build` and `npm start` on one persistent Node.js server with WebSocket support. The Socket.IO bootstrap is `/api/socket`; the transport is `/api/socket/io`. This in-process room server cannot run as ephemeral Vercel functions. Multiple server instances need a shared room store and appropriate Socket.IO routing before scaling.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test` — game rules and real multi-client socket integration
- `npm run build`
- `npm audit`

For browser checks, first build and start the production server on port 3100 with `NEXTAUTH_URL=http://localhost:3100`, then run `npm run test:e2e`. The tests use installed Microsoft Edge in headless mode, synthetic signed test sessions, and mocked profile responses. They do not create or modify real Firebase users. They cover all pages at desktop/mobile widths and a complete multiplayer match through the actual authenticated Socket.IO endpoint.

Firebase Admin stays on the Node-20-compatible 13.x line. Its request dependencies use scoped overrides to the patched CommonJS-compatible UUID 11.x release; their UUID usage is v4-only. Tailwind remains on the maintained 3.4 line to preserve the app's existing utility configuration.

# Certamen

A classics study app and live, moderated quiz competition built with Next.js, React, Firebase, NextAuth, and Socket.IO.

## Run locally

Use Node.js 22.13 or newer (Node 20.19+ also works). Install with `npm ci`, then run `npm run dev`. Open http://localhost:3000.

Keep your Firebase service-account, Firebase web-app, Google OAuth, and NextAuth settings in `.env.local`. The app expects the existing `FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` values. Set `NEXTAUTH_URL` to the URL you actually use. Never commit credentials.

## Run a competition

1. Sign in, open **Compete**, select **Solo**, **PvP**, or **Teams**, and create a competition.
2. In PvP or Teams, share the four-letter room code with signed-in players on their own devices.
3. Choose the question count, reading pace, and answer window, then start.
4. Press **Space** outside form controls or tap **Buzz in**. The server accepts the first buzz and pauses reading.
5. Type your answer and lock it in. Correct tossups earn 10 points and each correct bonus earns 5; there are no penalties.
6. The room owner advances questions and can reset scores for another match.

**Solo:** You are both player and reviewer. The answer key stays hidden until you submit or pass. Mark your submitted answer correct or incorrect.

**PvP:** The room owner plays too; no one sees the key early. After submission, everyone sees the submitted answer and key. Every player connected at submission must approve before points are awarded. Duplicate approvals do not count. An incorrect vote ends the question without points because the answer has been exposed. If an unapproved reviewer disconnects, the question ends without points. A timeout before submission permits remaining players to buzz.

**Teams:** The room owner moderates and can see the key, judge spoken or typed answers, and optionally enable browser speech synthesis. Players are initially balanced across two teams. The moderator can add teams (up to 12) and assign players; players can move themselves in the lobby and between tossup sets, after earned bonuses. At least two teams need players to start. Each team gets one attempt per question; an incorrect tossup answer or timeout resumes reading for the remaining teams. Earned points stay with the team when a player moves. Final standings rank teams.

The included **Classics warm-up** pack contains 12 original practice toss-ups in `lib/question-pack.ts`. It is not an official tournament packet. Each tossup has two linked bonuses. Live matches use moderator or player review; automatic answer judging is available in lesson recall practice.

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


### Scoring and history practice

Tossups score 10 points. Each linked bonus scores 5 points. In Teams, the team that answers the tossup correctly receives its bonuses, with no steals. A buzz immediately locks out that entire team for the current question, whether the answer is correct, incorrect, timed out, or the answerer disconnects. Lockouts reset for each new tossup or bonus. Team membership is fixed until earned bonuses finish. In PvP, every bonus is open to all players as a 5-point tossup, even if the preceding tossup was missed or skipped. Solo practice unlocks bonuses after a correct tossup. The question-count setting counts tossup sets; the warm-up pack has two bonuses per set.

Roman history now contains 23 introductory lessons and 138 original fill-in-the-blank cards, summarized from the supplied Connor Harrison guide (version 2.3). Lessons cite PDF pages and link to `/ConnorHarrison.pdf`. They cover its chronological scope and selected supplementary material; the original guide contains additional advanced detail.

Each lesson includes practice. `/study/history/practice` reviews only cards the learner has practiced. Answers accept case, punctuation, accent differences, and declared alternatives, with an explicit equivalent-wording override. A missed answer is due after one minute; correct answers use 1, 3, 7, 14, 30, and 60-day intervals. Review state is namespaced by account in browser localStorage and does not sync across devices. Lesson completion status continues to use the existing progress API.

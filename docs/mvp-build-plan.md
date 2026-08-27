# Ambient Calendar Display MVP build plan

Build the frozen MVP in `docs/index.md` for one operator. Backend, web, and firmware land as eight stacked PRs. Rule. the backend owns calendar data, the ESP32 owns time and presentation. PR order. pr-scaffold, pr-d1, pr-events, pr-device, pr-sync, pr-web, pr-fw-platform, pr-fw-hmi.

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `pstack/skills/poteto-mode/playbooks/autopilot-stack.md`. The operator lands the Graphite stack. pr-web and pr-fw-hmi stop at merge-ready for chat review.

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on her explicit go.
- [ ] On her go, arm a `/goal` with this exact text. "Run `docs/mvp-build-plan.md` via autopilot-stack. PR order pr-scaffold, pr-d1, pr-events, pr-device, pr-sync, pr-web, pr-fw-platform, pr-fw-hmi. Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Operator lands the stack. Done when every §12 checklist box in `docs/index.md` has evidence and the stack tip is STACK-READY."
- [ ] `git init`, first commit of docs and CONTEXT, create `origin/main`, before any owner branch. Re-read them at every tick.
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `git show origin/main:pstack/skills/swarm/SKILL.md`
  - [ ] `git show origin/main:cursor-team-kit/skills/control-ui/SKILL.md`
  - [ ] `git show origin/main:pstack/skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `git show origin/main:pstack/skills/how/SKILL.md`
  - [ ] `git show origin/main:docs/index.md`
- [ ] Arm the 30-minute audit tick. In a local session, a real terminal `/loop`. In a cloud root, a cloud-sleeper wake chain. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from trunk and the armed /goal. Audit the operation against both and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a stuck lane and dispatch its replacement now. Then send the operator a status message, whether or not anything changed, with the queue table of PR, owner, state, and head SHA, the verdicts since the last tick, what merged, open operator gates, and blockers."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.
- [ ] Put Worker secrets and Access policy outside the app PRs. Follow `docs/index.md` §10. Fail live Google or Bearer lanes until secrets exist, then re-run those lanes.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names.
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or base it on the parent branch when the execution playbook stacks.
  - [ ] pr-scaffold is first from `main` after git arm.
  - [ ] pr-d1 after pr-scaffold.
  - [ ] pr-events, pr-device, and pr-sync are independent after pr-d1. Base each on the stack tip that already holds pr-d1.
  - [ ] pr-web after pr-events and pr-device.
  - [ ] pr-fw-platform after pr-device (or a checked-in schedule fixture that matches the §6 JSON).
  - [ ] pr-fw-hmi after pr-fw-platform.
- [ ] Hold the file boundaries. pr-scaffold and API PRs touch `app/`, `db/`, `wrangler.jsonc`, `package.json`, `shared/`. pr-web touches web routes and UI under `app/` only. Firmware PRs touch only `firmware/esp32-c6/`.
- [ ] Hold the review gate. pr-web and pr-fw-hmi change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Open the PR ready, never draft, with `gh pr create` and `draft: false`, or with Graphite `gt` for a stack.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on.
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `../references/bugbot-triage.md`.
- [ ] Rebase onto current trunk before babysit and again before the merge-ready report.

### Verdict and merge, for every PR

- [ ] At the merge-ready head SHA, run the swarm per `pstack/skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. One audit lane that reads the diff and the receipts and distrusts the PR body.
- [ ] Clean only when every lane is `PASS`. Findings go back to the owner. A new head gets a fresh swarm and a fresh verdict.
- [ ] Root appends the PR to the Graphite stack on a clean verdict. Compare `git patch-id` after restack per `playbooks/shipping.md`. The operator lands. No owner merges.

### Boot recipe, for every live lane

Each live lane runs on its own cloud VM at the PR head. Drive web and HTTP through `control-ui` from `cursor-team-kit`. Drive firmware lanes with photo or serial logs from the Waveshare board when a VM cannot flash it. Record that path in the lane report.

- [ ] `git fetch origin <head-branch> && git checkout <head SHA>`.
- [ ] Start `wrangler dev` (or the firmware flash) and wait for ready.
- [ ] Deliver input only through `control-ui` commands for HTTP and SPA. Use curl inside the VM only when the lane names curl. For firmware, use the board serial monitor as the read-only diagnostic.
- [ ] Save every screenshot to `/tmp/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the report.

## Scaffold Worker and health (pr-scaffold)

**Depends on.** None. Requires git arm on `main` first.

**Files.**

- [ ] Create `package.json`.
- [ ] Create `wrangler.jsonc` with `nodejs_compat`, D1 binding stub, and `triggers.crons` stub.
- [ ] Create `app/` TanStack Start SPA (`ssr: false`) with Vite and `@cloudflare/vite-plugin` before `tanstackStart()`.
- [ ] Create custom Worker entry that exports `fetch` from Start and a no-op `scheduled`.
- [ ] Create `GET /api/health` as a server route. No `createServerFn`.

**Build.**

- [ ] Land the monorepo shape in `docs/index.md` §11 with a live `wrangler dev` that serves health.

**You see.**

- [ ] `GET /api/health` returns HTTP 200 under `wrangler dev`.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add a health route smoke test. Run `npm test` (or the repo's first test command this PR introduces).

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Open `/api/health`. Save `health-200.png`. Pass when status is 200.
- [ ] Lane 2. Open the SPA shell. Save `spa-shell.png`. Pass when the document loads without SSR data calls to missing APIs.
- [ ] Lane 3. Hit the scheduled local handler. Save `scheduled-noop.png`. Pass when the handler returns without throwing.
- [ ] Lane 4. Confirm `nodejs_compat` is set in wrangler. Save `compat-flag.png`. Pass when the flag is present.
- [ ] Lane 5. Confirm custom `main` is not the default server-entry alone. Save `custom-main.png`. Pass when wrangler points at the custom entry.
- [ ] Lane 6. Fetch a missing API path. Save `missing-404.png`. Pass when the response is not an uncaught Worker crash.
- [ ] Lane 7. Restart `wrangler dev` and hit health again. Save `health-restart.png`. Pass when status is 200.
- [ ] Lane 8. Check that no `VITE_*` secret appears in client source. Save `no-vite-secrets.png`. Pass when grep of `VITE_` for Worker secrets is empty.
- [ ] Lane 9. Confirm SPA mode is on. Save `spa-mode.png`. Pass when Start config has `ssr: false` (or equivalent).
- [ ] Lane 10. Confirm server routes exist and `createServerFn` does not. Save `http-only.png`. Pass when ripgrep finds server handlers and zero `createServerFn`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Time to first 200 from `/api/health` after `wrangler dev` ready.
- [ ] Probe. Curl health ten times at trunk (or first-parent baseline) and at the head, interleaved.
- [ ] Baseline. Record the trunk median first. On the first PR, record the head median as the seed baseline.
- [ ] Rule. Head median must stay under 500 ms on the lane VM or the PR fails.

**Review gate.** None. pr-scaffold is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Add D1 Event and Settings (pr-d1)

**Depends on.** pr-scaffold.

**Files.**

- [ ] Create `db/migrations/` with Event and Settings tables matching `docs/index.md` §4.
- [ ] Create Settings seed with defaults `America/Sao_Paulo`, 30, 7, 2.
- [ ] Create `GET /api/settings` and `PUT /api/settings` server routes with Zod bounds.
- [ ] Create shared Event and Settings types under `shared/contracts/` only if both server and a future client need them in this PR.

**Build.**

- [ ] Apply Wrangler D1 migrations and serve Settings as a singleton.

**You see.**

- [ ] Fresh DB seeds Settings. `PUT` with out-of-range `reminderMinutes` returns 4xx.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add Settings Zod and seed tests. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. `GET /api/settings` on empty DB. Save `settings-seed.png`. Pass when defaults match §4.
- [ ] Lane 2. `PUT` timezone to a valid IANA value. Save `settings-put-ok.png`. Pass when GET echoes it.
- [ ] Lane 3. `PUT` reminderMinutes 0. Save `settings-reject-low.png`. Pass when status is 4xx.
- [ ] Lane 4. `PUT` reminderMinutes 181. Save `settings-reject-high.png`. Pass when status is 4xx.
- [ ] Lane 5. `PUT` lookaheadDays 30. Save `settings-lookahead.png`. Pass when GET shows 30.
- [ ] Lane 6. `PUT` showNextEvents 5. Save `settings-show-next.png`. Pass when GET shows 5.
- [ ] Lane 7. Confirm quiet hours columns are absent. Save `no-quiet-hours.png`. Pass when schema has no quiet hours fields.
- [ ] Lane 8. Re-run migrations on a second local D1. Save `migrate-idempotent.png`. Pass when seed still yields one Settings row.
- [ ] Lane 9. Insert a manual Event row via SQL for later PRs. Save `event-table.png`. Pass when the Event columns match §4.
- [ ] Lane 10. Hit `/api/health` still. Save `health-after-d1.png`. Pass when status is 200.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. `GET /api/settings` latency.
- [ ] Probe. Fifty interleaved curls at trunk and head.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Head median must not exceed trunk median by more than 50 ms.

**Review gate.** None. pr-d1 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Ship manual Event API (pr-events)

**Depends on.** pr-d1.

**Files.**

- [ ] Create `GET /api/events`, `POST /api/events`, `PUT /api/events/:id`, `DELETE /api/events/:id`.
- [ ] Edit handlers so POST/PUT/DELETE accept only `source: manual` writes.
- [ ] Edit list so Google rows are read-only in the API.

**Build.**

- [ ] CRUD Lembretes as Event rows with `source: manual`.

**You see.**

- [ ] POST creates a Lembrete. PUT and DELETE on a google-sourced id fail. GET lists both sources.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add CRUD and source-guard tests. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. POST a timed Lembrete. Save `lembrete-create.png`. Pass when GET includes it.
- [ ] Lane 2. PUT its title. Save `lembrete-update.png`. Pass when GET shows the new title.
- [ ] Lane 3. DELETE it. Save `lembrete-delete.png`. Pass when GET omits it.
- [ ] Lane 4. Insert a google-sourced row via SQL. Save `google-row.png`. Pass when GET lists it.
- [ ] Lane 5. PUT that google id. Save `google-put-reject.png`. Pass when status is 4xx.
- [ ] Lane 6. DELETE that google id. Save `google-delete-reject.png`. Pass when status is 4xx.
- [ ] Lane 7. POST an all-day Lembrete. Save `lembrete-allday.png`. Pass when `allDay` is true and start is midnight in Settings timezone.
- [ ] Lane 8. POST with missing title. Save `lembrete-invalid.png`. Pass when status is 4xx.
- [ ] Lane 9. POST timed with `endAt` null. Save `lembrete-open-end.png`. Pass when stored end is null.
- [ ] Lane 10. GET order by `startAt` ascending. Save `events-order.png`. Pass when order is ascending.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. `GET /api/events` latency with 50 seeded rows.
- [ ] Probe. Interleaved curls at trunk and head.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Head median must not exceed trunk median by more than 100 ms.

**Review gate.** None. pr-events is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Ship device schedule API (pr-device)

**Depends on.** pr-d1.

**Files.**

- [ ] Create `GET /api/device/schedule` with Bearer check on `DEVICE_API_TOKEN`.
- [ ] Edit the mapper so the JSON matches `docs/index.md` §6 (no source, externalId, lookaheadDays, or audit fields).
- [ ] Edit the filter to half-open `[now, now+lookaheadDays)` so sync and schedule agree. Document that choice in the PR body.

**Build.**

- [ ] Serve the ESP32 schedule envelope with ISO offsets in Settings timezone.

**You see.**

- [ ] Valid Bearer returns 200 with `events` sorted by `startAt`. Missing Bearer returns 401.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add Bearer and envelope mapper tests. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Call schedule without Authorization. Save `device-401.png`. Pass when status is 401.
- [ ] Lane 2. Call with wrong token. Save `device-401-bad.png`. Pass when status is 401.
- [ ] Lane 3. Call with valid token and empty DB. Save `device-empty.png`. Pass when `events` is `[]` and settings fields are present.
- [ ] Lane 4. Seed a timed Event inside the horizon. Save `device-timed.png`. Pass when the event appears with offset ISO.
- [ ] Lane 5. Seed an all-day Event. Save `device-allday.png`. Pass when `allDay` is true and time is 00:00.
- [ ] Lane 6. Confirm response omits `source` and `externalId`. Save `device-shape.png`. Pass when those keys are absent.
- [ ] Lane 7. Confirm `showNextEvents` is present and does not truncate `events`. Save `device-no-cut.png`. Pass when array length can exceed `showNextEvents`.
- [ ] Lane 8. Seed an Event past the horizon. Save `device-horizon.png`. Pass when it is absent.
- [ ] Lane 9. Force a mapper failure path. Save `device-503.png`. Pass when status is 503 with a minimal body.
- [ ] Lane 10. Confirm `serverTime` is ISO with offset. Save `device-server-time.png`. Pass when the string parses and carries an offset.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. `GET /api/device/schedule` latency with 20 events in horizon.
- [ ] Probe. Interleaved curls at trunk and head.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Head median must stay under 200 ms on the lane VM.

**Review gate.** None. pr-device is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Sync Google Calendar on Cron (pr-sync)

**Depends on.** pr-d1.

**Files.**

- [ ] Edit the Worker `scheduled` handler to refresh OAuth, list primary events, upsert, and delete stale google rows per §5.
- [ ] Edit list calls to use `singleEvents=true`, Settings timezone, and `eventTypes=default` per research.
- [ ] Edit error handling so `invalid_grant` is logged as ops, not retried as transient.

**Build.**

- [ ] Mirror Google into D1 on Cron without touching manual rows.

**You see.**

- [ ] Local scheduled trigger upserts google Events. A manual row survives a sync that omits it.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add upsert, delete-outside-horizon, and manual-preserve tests with fixtures. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Run scheduled with fixture Google payload. Save `sync-upsert.png`. Pass when D1 gains the externalIds.
- [ ] Lane 2. Re-run with one id removed. Save `sync-delete.png`. Pass when that google row is gone.
- [ ] Lane 3. Confirm a manual row remains. Save `sync-manual-keep.png`. Pass when the manual id still exists.
- [ ] Lane 4. Confirm recurring instances land expanded. Save `sync-single-events.png`. Pass when no RRULE column is required.
- [ ] Lane 5. Simulate `invalid_grant`. Save `sync-invalid-grant.png`. Pass when the job logs ops failure and exits without wiping D1.
- [ ] Lane 6. Confirm `timeMin`/`timeMax` use Settings lookahead. Save `sync-horizon.png`. Pass when the request window matches Settings.
- [ ] Lane 7. Hit `/cdn-cgi/handler/scheduled` locally. Save `sync-local-trigger.png`. Pass when the handler runs.
- [ ] Lane 8. Confirm wrangler cron is every 15 minutes UTC. Save `sync-cron-expr.png`. Pass when the expression matches the MVP default.
- [ ] Lane 9. Upsert the same externalId twice. Save `sync-idempotent.png`. Pass when one D1 row remains.
- [ ] Lane 10. After sync, `GET /api/events` shows google rows read-only. Save `sync-list.png`. Pass when GET includes them and write routes still reject.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Scheduled handler wall time for a 50-event fixture.
- [ ] Probe. Run the fixture job at trunk and head.
- [ ] Baseline. Record the trunk wall time first.
- [ ] Rule. Head must stay under 30 s CPU budget on Paid. Fail if the fixture exceeds 10 s on the lane VM.

**Review gate.** None. pr-sync is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Build web Agenda and Settings (pr-web)

**Depends on.** pr-events and pr-device.

**Files.**

- [ ] Create Agenda page that lists upcoming Events and CRUD for Lembretes.
- [ ] Create Settings page for the four §4 fields.
- [ ] Edit Query and Form wiring to call `/api/events` and `/api/settings` only via `fetch`.
- [ ] Edit Chakra theme tokens for the SPA shell.

**Build.**

- [ ] Ship the personal web UI. Not a full admin.

**You see.**

- [ ] Operator creates a Lembrete in the UI and sees it in the list. Settings save round-trips.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add component or route tests for Agenda create and Settings validation. Run `npm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Open Agenda empty. Save `web-agenda-empty.png`. Pass when the empty state is visible.
- [ ] Lane 2. Create a Lembrete. Save `web-lembrete-create.png`. Pass when it appears in the list.
- [ ] Lane 3. Edit that Lembrete. Save `web-lembrete-edit.png`. Pass when the title updates.
- [ ] Lane 4. Delete that Lembrete. Save `web-lembrete-delete.png`. Pass when it disappears.
- [ ] Lane 5. Open Settings. Save `web-settings.png`. Pass when four fields are present and quiet hours are absent.
- [ ] Lane 6. Save reminderMinutes 45. Save `web-settings-save.png`. Pass when reload shows 45.
- [ ] Lane 7. Try reminderMinutes 0 in the form. Save `web-settings-reject.png`. Pass when the UI blocks or the API 4xx is shown.
- [ ] Lane 8. Confirm a google-sourced Event is visible and not editable. Save `web-google-readonly.png`. Pass when edit controls are absent for that row.
- [ ] Lane 9. Narrow the viewport to mobile width. Save `web-mobile.png`. Pass when Agenda remains usable without horizontal clip of primary actions.
- [ ] Lane 10. Reload after create. Save `web-persist.png`. Pass when the Lembrete is still listed.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Agenda first contentful paint style timing from navigation start to list paint.
- [ ] Probe. control-ui navigation at trunk and head, three samples each.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Head median must not exceed trunk median by more than 300 ms.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2 and lane 5 screenshots into `docs/media/pr-web-review-lembrete.png` and `docs/media/pr-web-review-settings.png`.
- [ ] Record a 30 to 60 second video of the change on a lane VM. Save it as `docs/media/pr-web-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands after the review click.

## Bring up ESP32 platform (pr-fw-platform)

**Depends on.** pr-device.

**Files.**

- [ ] Create `firmware/esp32-c6/` ESP-IDF project on IDF ≥ 5.5 with Waveshare BSP init.
- [ ] Create `network/` Wi-Fi and HTTPS poll of `/api/device/schedule` with cert bundle.
- [ ] Create `storage/` NVS meta and LittleFS agenda cache.
- [ ] Create `sync/` that writes the schedule JSON to LittleFS and seeds time from `serverTime` when SNTP is late.
- [ ] Edit compile-time or flash config for Wi-Fi, API URL, and token. No captive portal.

**Build.**

- [ ] Device reaches the API, stores cache, and keeps a usable clock seed.

**You see.**

- [ ] Serial log shows HTTPS 200 and a LittleFS write. Power-cycle still shows cached events after boot when offline is forced later.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add host-side or IDF target tests for JSON parse into the cache schema. Run the firmware test command this PR documents.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Flash and boot. Save `fw-boot.png`. Pass when BSP display init logs success.
- [ ] Lane 2. Join Wi-Fi. Save `fw-wifi.png`. Pass when IP is acquired.
- [ ] Lane 3. Poll schedule with good token. Save `fw-poll-ok.png`. Pass when HTTP 200 is logged.
- [ ] Lane 4. Poll with bad token. Save `fw-poll-401.png`. Pass when 401 is logged and cache is not wiped.
- [ ] Lane 5. Write cache to LittleFS. Save `fw-littlefs.png`. Pass when readback matches.
- [ ] Lane 6. Write meta to NVS. Save `fw-nvs.png`. Pass when meta survives reboot.
- [ ] Lane 7. Seed clock from `serverTime` before SNTP. Save `fw-server-time.png`. Pass when TLS date checks can proceed.
- [ ] Lane 8. Confirm SPIFFS is unused. Save `fw-no-spiffs.png`. Pass when partition table has no SPIFFS.
- [ ] Lane 9. Measure free heap after first poll. Save `fw-heap.png`. Pass when free heap stays above the owner's documented floor.
- [ ] Lane 10. Disconnect Wi-Fi and reboot. Save `fw-cache-boot.png`. Pass when cache still loads from LittleFS.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Free HP SRAM after Wi-Fi, TLS poll, and LVGL init.
- [ ] Probe. Read heap from serial at trunk fixture and head.
- [ ] Baseline. Record the trunk (or first successful board) free heap first.
- [ ] Rule. Head free heap must stay ≥ 40 KB after first poll or the PR fails.

**Review gate.** None. pr-fw-platform is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands.

## Ship HMI states and touch (pr-fw-hmi)

**Depends on.** pr-fw-platform.

**Files.**

- [ ] Create `scheduler/` with Now, Alert, Ambient, Empty predicates from §8.
- [ ] Create `ui/` LVGL screens for the four ASCII states.
- [ ] Edit touch to open the list overlay for 15 s, then recalculate. No swipe.
- [ ] Edit offline path to render from LittleFS cache when poll fails.

**Build.**

- [ ] One state per frame. Priority Now > Alert > Ambient > Empty. Timed only for Alert and Now.

**You see.**

- [ ] Display shows Ambient with countdown, then Alert inside reminderMinutes, then Agora in the 2-minute window.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Add host-side scheduler tests for Now, Alert, Ambient, Empty, all-day exclusion, and focus ties. Run the firmware test command.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on `grok-4.6-fast-xhigh` at the PR head, per the boot recipe.

- [ ] Lane 1. Fixture with no future timed Events. Save `hmi-empty.png`. Pass when Empty ASCII state is on screen.
- [ ] Lane 2. Fixture with a future timed Event. Save `hmi-ambient.png`. Pass when Ambient shows clock, next title, countdown, and list slots.
- [ ] Lane 3. Enter Alert window. Save `hmi-alert.png`. Pass when Alert label and focus Event match §8.
- [ ] Lane 4. Enter Now window. Save `hmi-now.png`. Pass when Agora state shows.
- [ ] Lane 5. All-day only fixture. Save `hmi-allday-no-alert.png`. Pass when Alert and Now never fire.
- [ ] Lane 6. Short tap opens overlay. Save `hmi-tap.png`. Pass when list overlay appears.
- [ ] Lane 7. Wait 15 s after tap. Save `hmi-tap-timeout.png`. Pass when overlay closes and state recalculates.
- [ ] Lane 8. Confirm no swipe handlers. Save `hmi-no-swipe.png`. Pass when code and UI lack swipe gestures.
- [ ] Lane 9. Force offline with warm cache. Save `hmi-offline.png`. Pass when Ambient or Empty still renders from cache.
- [ ] Lane 10. Two overlapping Alert candidates. Save `hmi-focus-tie.png`. Pass when focus is the lesser `startAt` then `id`.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. Scheduler evaluate time per frame on device.
- [ ] Probe. Serial timing over 100 frames at trunk fixture and head.
- [ ] Baseline. Record the trunk median first.
- [ ] Rule. Head median must stay under 5 ms per evaluate or the PR fails.

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2, lane 3, and lane 4 screenshots into `docs/media/pr-fw-hmi-review-ambient.png`, `docs/media/pr-fw-hmi-review-alert.png`, and `docs/media/pr-fw-hmi-review-now.png`.
- [ ] Record a 30 to 60 second video of the change on a lane VM or board camera. Save it as `docs/media/pr-fw-hmi-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] Rebased onto current trunk after the verdict, patch-id unchanged.
- [ ] Root appends the PR to the Graphite stack. Operator lands after the review click.

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.
- [ ] Confirm Cloudflare Access covers web routes and leaves `/api/device/*` on Bearer only.
- [ ] Confirm Paid plan, secrets, and §12 checklist evidence are linked from the final status message.

## Appendix A. Prototype evidence

No throwaway prototype branch in this planning pass. Map ticket 07 already classed product fog as empty. Research files answer Worker entry, Google list shape, and board constraints.

Settled by decree for the build.

- Monorepo path stays `app/` per `docs/index.md` §11 even if `npm create cloudflare` emits `src/`. Owners relocate.
- Schedule and sync share half-open `[now, now+lookaheadDays)`.
- Google list uses `eventTypes=default`.
- OAuth scope prefers `calendar.events.readonly`.
- Device poll interval default is 60 s until a board heap probe says otherwise.

Still unproven until their PR live lanes.

- LVGL partial buffer height versus TLS heap on this board (pr-fw-platform).
- LittleFS partition size after measuring the image (pr-fw-platform).
- Cron wall under 30 s CPU with a live Google primary (pr-sync, needs secrets).
- Access bypass for `/api/device/*` without opening `/api/events` (Close the program ops).

## Appendix B. Alternatives rejected

- Autopilot-full. Rejected because the stack is coupled and the operator keeps landing authority.
- Orchestrate. Rejected for this first build. Eight PRs fit one autopilot-stack root. Promote to orchestrate only if firmware board lanes stall the root for days.
- One mega PR. Rejected. Each unit needs its own live evidence.
- `syncToken` incremental Google sync. Rejected in research. Conflicts with a bounded horizon.
- SPIFFS for agenda cache. Rejected in research and spec.
- Captive portal provisioning. Out of MVP.
- Quiet hours. Removed from Settings on purpose.
- Hosting `createServerFn` for the web. Rejected. Device and browser must share raw HTTP.

## Appendix C. Risks

- No git today. Arm must `git init` before owners. Watched in Arm.
- Firmware live lanes need a physical Waveshare board. control-ui cannot flash it. Watched in pr-fw-platform and pr-fw-hmi. Owners accept serial or photo evidence.
- Access mis-cut can 403 the device or expose web APIs. Watched in Close the program.
- OAuth apps in Testing expire refresh tokens ~7 days. Watched in pr-sync. `invalid_grant` is ops.
- Cron 15 min versus 30 s Paid CPU. Watched in pr-sync perf rule.
- 512 KB HP SRAM with TLS plus LVGL and no PSRAM. Watched in pr-fw-platform heap rule.
- Power-on loses time without 32 kHz crystal. Watched in pr-fw-platform `serverTime` lane.
- Shared SPI with TF slot if CS floats. Watched in pr-fw-platform bring-up.
- `DEVICE_API_TOKEN` rotation needs Worker secret and reflashed firmware in one window. Watched in ops notes, not a code PR.

## Appendix D. Links and reading list

- Spec. `docs/index.md`
- Glossary. `CONTEXT.md`
- Research. `docs/research/tanstack-start-workers-d1.md`, `docs/research/google-calendar-sync-model.md`, `docs/research/esp32-c6-waveshare-constraints.md`
- Wayfinder map. `.scratch/ambient-calendar-mvp-spec/map.md`
- Execution. `pstack/skills/poteto-mode/playbooks/autopilot-stack.md`
- Run `how` before editing pr-scaffold, pr-sync, and pr-fw-platform.
- Run `interrogate` before merge-ready on pr-device and pr-fw-hmi if the scheduler predicates or schedule mapper drift from §6/§8.
- Keep a local `decisions.tsv` trail per `pstack/skills/show-me-your-work/SKILL.md`. Do not commit it unless the operator asks.

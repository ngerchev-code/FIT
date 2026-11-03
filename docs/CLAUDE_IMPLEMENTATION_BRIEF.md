# FITNESS AI COACH — CLAUDE IMPLEMENTATION BRIEF
Version: 2026-11-02
Target: Android + iOS; companion watches Wear OS + watchOS; other wearables where supported.

## Your first task: inspect, do not overwrite
You are continuing an existing app. Inspect repository, branches, README, package manifests, database migrations, tests, deployment, permissions, integrations and existing UX. Produce an inventory of implemented/partial/missing features. Do not assume a stack. Preserve data, existing working functionality, authentication and brand. Propose phased changes, then implement the smallest safe vertical slice. Ask only for credentials or choices genuinely blocking progress. Never claim a feature works without testing.

## Product philosophy — binding design constraint
Fitness AI Coach / Lifestyle Intelligence is a proactive, respectful 24/7 digital coach and mentor, not a gym-equipment counter. Sport is a mindset and a sustainable way of life. The app adapts to each person's abilities, ambitions, resources, schedule, preferences, available equipment, goals and recovery. It initiates plans, measurements where possible, insights and suggestions, while the user retains agency, consent and override. Avoid guilt, pressure, constant surveillance and notification fatigue. Rest is a valid positive outcome. Privacy and safety by design. Never infer an exact measurement from an unverified sensor signal.

Onboarding copy (Bulgarian):
"Не всеки започва от едно и също място. Не всеки има еднакви възможности. И никой не трябва да следва чужда програма. Твоят ритъм. Твоите възможности. Твоят напредък. Fitness AI Coach се адаптира към теб — към силите, амбициите и ежедневието ти. Ние предлагаме пътя. Ти запазваш избора."
Slogan: "BEYOND FITNESS. BUILT AROUND YOU."
Optional genuine literary quote: "A journey of a thousand miles begins beneath one's feet" — Laozi, Dao De Jing ch. 64; translations vary; do not attribute to an athlete.
Subtle Japanese motifs: Ensō 円相 (Zen circle), Kaizen 改善 (continuous improvement), Ikigai 生き甲斐 (sense of meaning). Use accurate meanings, accessible decorative usage, not misleading cultural claims.

## Core user journey
1. Consent-based onboarding: goals, physical baseline, training history, equipment, availability, sports, constraints, dietary allergies, notification preferences, watch integrations; allow skip/unknown, privacy controls.
2. Build an individualized 6/9/12-month strategy, review monthly; daily adaptive plan with safe weekly progression and deload/rest as appropriate. These are planning horizons, not promised results.
3. Proactively suggest next best activity across strength, walking, swimming, cardio, mobility, sleep/rest, and nutrition, taking actual data and self-report into account.
4. During workout: select machine -> start set -> monitor supported signals -> end set -> confirm actual weight/reps -> rest timer -> next set or switch machine -> repeat. Persist every transition. Do not fabricate automatic rep counting or machine recognition. Support manual corrections.
5. Start with 10 configured machines, no hard-coded cap. User may add equipment by name, photo, QR (when supported), exercise type, muscle group, weights, reps, sets, rest. Remember per-machine last settings. AI may suggest extras only when warranted by goals, fatigue and actual workload, never just because session was short.
6. Missed workout: scheduled reminder, then request confirmation; push opens popup with 'Completed', 'Skipped', 'Reschedule'; ask real reason (time/work, travel, fatigue, injury/illness, motivation, weather, other/private), optional explanatory detail, choose today/tomorrow/date+time, suggest lighter alternative or rest; do not double future workload. For sensitive reasons, support private/decline detail.
7. Weather/force majeure: use grounded location-specific forecasts and warnings for outdoor activities, heat index, storm, ice, wind, AQI and disruption where reliable data exists. Notify ahead where helpful; propose indoor/home/mobility/rest/reschedule. No weather data => no invented alerts. Avoid duplicate notifications.
8. Food intelligence: nutrition per 100g and serving; EU 14 allergen groups, explicit ingredient and cross-contact distinctions; additives E codes with evidence-based context; sugars, salt, saturated fat, fiber, protein, processing classification when justified. Separate personalized allergen risk from nutritional quality and evidence uncertainty. Green/yellow/orange/red/gray semantic palette, with text/icons for accessibility. Barcode and label scan with provenance and user confirmation. Do not label all E codes harmful.
9. Wearable companion: Wear OS (Galaxy Watch compatible models) first; watchOS (Apple Watch) second; other devices only after SDK/API capability verification. Start/pause/end workout, start/finish set, weight/reps controls, rest vibration, switch exercise, HR when permissioned, offline queue and sync. Watch may be a companion to phone; do not promise complete standalone support without proof.
10. Analytics: daily guidance, weekly adherence/recovery, monthly plan review, 6/9/12 month progress; distinguish measured from estimated from self-reported; explain recommendations.

## UX requirements
Bulgarian-first, localization-ready. Mobile first, Android/iOS parity. Dark navy/charcoal + turquoise/green/energy-blue accents, large touch targets, high contrast, one-handed workout controls. Clear active/rest/complete states; no intrusive modal while exercising. Watch screen should be glanceable and one-tap for common actions. Notification settings, quiet hours, opt-out, accessibility and haptics. Popups should be context aware.

## Safety/privacy requirements
Do not diagnose, claim medical-grade monitoring or prescribe unsafe exertion. Pain, injury, illness, severe fatigue => prioritize rest and qualified care if appropriate. HR and calorie measurements may be inaccurate; display provenance and confidence. User owns data; consent, export/delete, secure storage and encrypted transport. Explicit permission for location, notifications, health data and sensors. Respect iOS background execution and Android foreground-service restrictions; 24/7 availability is not equivalent to continuous unrestricted background sensing. Plan for offline operation and eventual consistency.

## Suggested domain entities (adapt to existing stack)
UserProfile, Consent, Goal, PlanHorizon, PlanRevision, WorkoutPlan, WorkoutSession, Exercise, Equipment, WorkoutSet, RestInterval, ActivityObservation, RecoveryCheckin, FoodProduct, Ingredient, Allergen, FoodLog, WeatherRisk, NotificationRule, NotificationEvent, DeviceConnection, SyncOperation, Recommendation, RecommendationFeedback.
Every observation: source (watch/manual/import/inference), observedAt, confidence/quality where applicable. Every mutable session entity: stable UUID, version, createdAt, updatedAt, syncState.

## Core state machine
WorkoutSession: planned -> active <-> paused -> completed | cancelled.
WorkoutSet: ready -> active -> completed -> persisted; cancelled/edited paths.
On completed set: commit idempotently, record measured or confirmed reps/weight, start rest timer if configured; on machine change preserve previous set and preload new exercise defaults. Handle watch-phone disconnection, duplicate events, retries and clock skew.

## Delivery roadmap
P0 audit + working session/set/equipment model, persistence and test coverage.
P1 live workout UI + offline sync + Wear OS companion, measured HR where supported.
P2 iOS/watchOS companion + notifications, missed sessions, safe adaptive planner.
P3 weather, nutrition and label/barcode sources + personalized evidence-based alerts.
P4 refined AI coaching, monthly and 6/9/12-month insights, integrations.
Priority may change after repository audit. Deliver vertical slices with tests and migration plans.

## Acceptance scenarios
A. Start exercise, log 3 sets, change equipment, app/watch reconnect; no duplicate or missing sets.
B. Skip workout, select real reason and alternative next day; calendar updates only on confirmation.
C. Outdoor workout with verified heat/storm warning triggers one timely actionable alert; no false warning without data.
D. Product containing milk shows explicit allergen alert for user with milk allergy even if nutrition score is good.
E. User has only 20 minutes and 2 machines: individualized realistic session, no guilt.
F. Rest is suggested after fatigue; no automatic compensatory overload.
G. User changes goal at month 4; 6/9/12 month plans are revised with explanation.
H. iOS/Wear OS permissions denied: core workout logging still functions.

## Instructions to Claude
1. Summarize repository findings with exact file paths, architecture and risks.
2. Map these requirements to implemented/partial/missing with evidence.
3. Propose incremental plan and tests, no unnecessary rewrites.
4. Implement P0 first (or smallest next incomplete slice), provide actual diffs and test outputs.
5. Stop before irreversible schema changes or actions requiring credentials; request approval.
6. Keep this brief in the repo and update a CHANGELOG / implementation status after each slice.
7. Never state that Android/iOS/watch integration is complete unless built and validated on the corresponding platforms.

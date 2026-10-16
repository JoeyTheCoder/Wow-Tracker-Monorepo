# Sapphirix Party Planner

Sapphirix Party Planner is a WoW Forever group dungeon planning app. Its dark sapphire look, Sapphirix mark, and concise party-first interface are the product's initial brand direction.

## Project Summary

A simple group dungeon planner for WoW Forever friends whose work schedules and playtimes do not always line up.

The core idea is: **make it easy to decide what dungeon to do next, when the group can play, who is ready for it, and who is still catching up.**

For the initial group of five, the addon saves character snapshots locally and a small Windows companion uploads them to the backend. The web app turns those updates into shared dungeon planning, readiness, and scheduling information. Public-release research into an official WoW: Forever profile API is deferred until needed.

---

## Problem

A group of friends wants to experience WoW Forever dungeons together, but everyone has a different workday, play window, and leveling pace. Each time the group tries to get together, it needs to answer two questions:

1. **When can we all play?**
2. **What can we do together then, and who still needs to catch up?**

Today those answers are scattered across chat, memory, and informal lists. The planner should put them in one shared place, keep character levels current, and make the next step clear—without making anyone feel blamed for being behind.

---

## Core Experience

### 1. Create a group and connect characters

An organizer creates a group (for example, **Weekend Warriors**) and invites friends. Each member links their WoW Forever character. The addon and companion sync character name, level, class, and last-seen time; players should not need to type their level manually.

### 2. Keep one shared dungeon plan

The group has an ordered dungeon journey and a clearly marked **next planned dungeon**. The organizer can choose or reorder it. The app may suggest a sensible next milestone, but the group stays in control: being level-ready does not automatically mean that dungeon is the plan.

### 3. Show readiness and catch-up per player

For the selected dungeon, compare each member's current level with its target and show who is ready and how many levels others need:

```text
Next up: Shadowfang Keep — target level 18
Alice   20  Ready
Bob     19  Ready
Chris   17  1 level to go
Dave    15  3 levels to go
Group readiness: 2 of 4 ready
```

Make stale sync information visible. Focus on the gap and next milestone—not ranking or blaming anyone.

### 4. Find a time that works

Members mark a few times as available, unavailable, or maybe available. Highlight overlapping windows so the group can agree on a session and attach the dungeon they plan to run.

### 5. Record shared progress

Track dungeon completion per player, separately from level readiness. Show whether a dungeon is planned, ready, in progress, or completed by everyone. Completion can be checked off manually until automatic detection is reliable.

---

## Dungeon Progression

Each dungeon has data such as:

- Dungeon name
- Minimum/required level
- Recommended level (if useful)
- Dungeon ID
- Optional maximum/appropriate level
- Completion status per character

Example:

| Dungeon | Level Target | Plan / Readiness |
|---|---:|---|
| Wailing Caverns | 10 | Completed by group |
| Deadmines | 15 | Ready · not next |
| Shadowfang Keep | 18 | Planned · 2/4 ready |
| Scarlet Monastery | 20 | Up next |

For the selected plan, the app compares each character with the dungeon's chosen level target. Readiness, the group's planned next dungeon, and completion are separate facts: the group may plan a dungeon before everyone is ready, and meeting its level target does not mean it has been completed.

---

## Group Dungeon Status

Show clear per-player readiness and a group summary for the selected plan:

### 🔒 Catching up

At least one player is below the selected dungeon's level target. Show who is short and by how many levels so the group can decide whether to wait, adjust the plan, or play something else together.

Example:

```text
Scarlet Monastery
Required: Level 20

Alice 24 ✓
Bob   23 ✓
Chris 21 ✓
Dave  19 ✗

Dave needs 1 more level.
```

### 🟡 Planned

The group selected this dungeon as its next target. It can be planned even if one or more members are still catching up.

### 🟢 Ready

Every current group member has reached the selected level target. Readiness does not imply that the group has completed the dungeon.

```text
Deadmines
Required: Level 15

Alice 24 ✓
Bob   23 ✓
Chris 21 ✓
Dave  19 ✓

READY FOR THE GROUP
```

### ✅ Completed

Track completion per player and show a count such as **3 of 4 complete**. Only mark the group complete when every current member has completed it. Completion is independent of level readiness.

---

# Dungeon Completion Tracking

The first version should make completion easy to record per player, even if a player or organizer checks it off manually. Automatic detection is a later enhancement, once the game exposes a reliable way to identify completion of a specific dungeon. The group view can then show:

```text
Deadmines

Alice  ✓
Bob    ✓
Chris  ✓
Dave   ✗
```

Group status: **3 of 4 players have completed Deadmines.**

When everyone has completed it:

```text
Deadmines
4/4 completed

✅ GROUP COMPLETED
```

Keep **level-ready**, **planned**, and **completed** distinct. These states answer different questions and should never be inferred from one another.

---

# Group Home: Plan, Time, Progress

The home screen should answer at a glance: **What are we planning next, when can we play, and who is ready or catching up?**

Example:

```text
WEEKEND WARRIORS

NEXT SESSION
────────────────────────
Saturday · 20:00–22:00
Planned: Shadowfang Keep

NEXT DUNGEON
────────────────────────
Shadowfang Keep · target level 18
2 of 4 ready · Dave is 3 levels away

GROUP ROSTER
────────────────────────
Alice       20  Ready        synced today
Bob         19  Ready        synced today
Chris       17  1 to go       synced yesterday
Dave        15  3 to go       synced today

UP NEXT
────────────────────────
Scarlet Monastery · target level 20

COMPLETED
────────────────────────
Wailing Caverns  4/4 · Deadmines  3/4
```

---

# Dungeon Timeline

A visual progression timeline would make the group's journey easy to understand.

```text
Level 10 ─ Wailing Caverns       ✅  4/4 complete
Level 15 ─ Deadmines             ✅  3/4 complete
Level 18 ─ Shadowfang Keep       📌  planned · 2/4 ready
Level 20 ─ Scarlet Monastery     ⏭  up next
Level 24 ─ Razorfen Downs        ·   later
...
```

Keep the whole journey visible, while making the currently planned dungeon and next session prominent.

---

# Availability and Session Planning

Scheduling is a core part of this product, not a separate calendar feature. Keep it lightweight: players can mark:

- Available
- Unavailable
- Maybe

The application could then show possible group sessions.

Example:

```text
Saturday 20:00–22:00 · best overlap this week

Alice   ✓
Bob     ✓
Chris   ✓
Dave    ✓

4 of 4 available
Planned dungeon: Shadowfang Keep
Readiness: 2 of 4 at level 18; Dave needs 3 levels
```

The MVP does not need calendar integrations or complex recurring rules. A simple weekly view or a few proposed time windows is enough if it helps friends agree when to play.

---

# WoW Forever Addon and Companion

The addon reads character data in game and stores it in SavedVariables. Addon Lua does not provide a general-purpose HTTP client, so for the initial group of five a small local Windows companion relays those snapshots to the web backend.

The companion is packaged with the addon in one ZIP. On first setup, a player runs it and selects their WoW Forever client folder; it installs or updates the addon. The companion checks per-character SavedVariables and sends snapshots to the configured endpoint. WoW writes new data on `/reload` or logout, and the companion then uploads it. The current local prototype has verified this flow; it uses a same-PC development endpoint and token, not public account pairing or production hosting.

The public Battle.net profile API question is deferred until public release. If Blizzard exposes a supported WoW: Forever character endpoint, we will evaluate it as the preferred public integration and retain the companion as a fallback where useful.

Current and planned responsibilities:

1. Identify the logged-in character.
2. Read the character's level.
3. Detect level changes.
4. Save per-character snapshots for the local companion to upload.
5. Link a character to a user's account/group through a secure pairing flow (planned).
6. Detect dungeon completion only if a reliable game API is verified; manual completion entry is the initial fallback.

Potential event flow:

```text
Player logs in
      ↓
Addon identifies character
      ↓
Addon reads level
      ↓
Addon saves per-character SavedVariables
      ↓
Windows companion reads updated snapshot
      ↓
Companion sends data to backend over HTTPS
      ↓
Backend updates character
      ↓
Group progression recalculated
      ↓
Dashboard updates
```

Level-up flow:

```text
Player levels up
      ↓
Addon detects level change
      ↓
Addon updates saved snapshot
      ↓
WoW flushes SavedVariables on /reload or logout
      ↓
Companion uploads new level
      ↓
Backend updates character
      ↓
Member readiness and catch-up status recalculated
```

Dungeon completion flow:

```text
Player or organizer marks dungeon complete
      ↓
Backend records completion for that character
      ↓
Group completion count recalculated
```

---

# Suggested Architecture

```text
┌─────────────────────────────┐
│       WoW Forever           │
│          Addon              │
│                             │
│ Character + Level           │
│ SavedVariables              │
└──────────────┬──────────────┘
               │
               │ local SavedVariables file
               ▼
┌─────────────────────────────┐
│    Windows Companion App    │
│                             │
│ Watches snapshots           │
│ HTTPS upload + retry        │
└──────────────┬──────────────┘
               │
               │ HTTPS / API
               ▼
┌─────────────────────────────┐
│          Backend            │
│                             │
│ Users                       │
│ Groups                      │
│ Characters                  │
│ Dungeons                    │
│ Completions                 │
│ Planned sessions            │
│ Availability                │
│ Readiness logic             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         Web App             │
│                             │
│ Group Planner               │
│ Next Dungeon + Readiness    │
│ Catch-up Progress           │
│ Availability + Sessions     │
│ Completion Tracking         │
└─────────────────────────────┘
```

---

# Initial Data Model

## User

```text
id
email / login
created_at
```

## Group

```text
id
name
invite_code
created_by
created_at
next_planned_dungeon_id
```

## Group Member

```text
id
group_id
user_id
character_id
role
joined_at
```

## Character

```text
id
user_id
name
class
level
last_seen
updated_at
```

## Dungeon

```text
id
name
required_level
recommended_level
sort_order
group_order
```

## Dungeon Completion

```text
id
character_id
dungeon_id
completed_at
source
```

`source` can indicate whether the completion was detected automatically by the addon or entered manually.

## Availability and planned session

```text
availability: group_member_id, starts_at, ends_at, status (available / unavailable / maybe)
session: group_id, starts_at, ends_at, dungeon_id, status (proposed / planned / completed / cancelled)
```

---

# Important Product Principle

The website should help the group plan, not make the user think about the underlying tracking system.

The desired experience for the initial group is:

> **Open the group → see the next dungeon and a time that works → know who is ready and how far everyone else has to go.**

Character levels should sync automatically where possible. Availability and completion should be simple to update manually. Present catch-up as useful context for planning, never as a public ranking or a reason to shame a member.

---

# MVP

The first version should focus tightly on the core problem.

### Must have

- User accounts
- Create a group
- Join a group
- Invite code/link
- Connect WoW character
- Automatic character level tracking
- Dungeon database
- Ordered dungeon plan with a group-selected next dungeon
- Required/recommended level target per dungeon
- Per-player readiness and "levels to go" summary
- Last-sync time so stale data is obvious
- Simple availability entry and overlapping-time view
- Create a planned session tied to a dungeon
- Per-player manual completion tracking and group completion count
- Basic dungeon history

### Nice to have later

- Calendar integrations and complex recurring availability
- Automatic dungeon-completion detection (only if reliably supported)
- Discord integration
- Notifications
- Dungeon quests
- Boss tracking
- Loot tracking
- Character gear
- Talent/spec information
- Achievements
- Raids
- Multiple groups per user

---

# Product Goal

The tool should be the group's shared dungeon-planning hub:

> **We can see what we want to run next, find a time that works, and help everyone catch up so we can do it together.**

The longer-term public experience should make joining and syncing straightforward, then:

**Play the game → supported profile API or companion sync updates progression → the group planner shows the next dungeon, shared availability, and each member's readiness.**

---

# Open Technical Questions

Before implementation, investigate:

1. Exactly which WoW Forever API functions/events expose character level.
2. Exactly which API functions/events can reliably detect dungeon completion.
3. Whether dungeon completion can be uniquely identified by dungeon ID.
4. How addon-to-web authentication should work.
5. Whether Blizzard releases an official WoW: Forever character-profile endpoint by public release.
6. Companion pairing, token revocation, local token storage, and the upload API contract.
7. How to prevent spoofed character/progression data.
8. The authoritative WoW Forever dungeon list and level requirements.
9. Whether the project should support multiple characters per user.
10. Whether a character can belong to multiple groups.
11. How to handle players joining/leaving a group after progression has already been recorded.

These questions should be resolved before locking in the backend schema and addon implementation.

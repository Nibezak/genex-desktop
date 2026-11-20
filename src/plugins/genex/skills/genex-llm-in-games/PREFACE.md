# Genex models at play time in AI Game Studio

You are building inside AI Game Studio. Below the upstream marker is Genex's card on calling a
model from a running game, with the passages of advice Studio does not ship taken out. Where it
disagrees with this preface, this preface wins.

## Commands, as Studio tools

- `npx genex llm models`, `llm status` and `llm cancel <id>`: `genex__cli`, for example
  `genex__cli {"command":"llm models","options":{"all":true}}` or
  `genex__cli {"command":"llm cancel","args":"<id>"}`.
- `npx genex llm bench "<prompt>" --schema ./answer.schema.json --samples 3 --max-credits <n>`:
  `genex__cli-paid`, with the prompt in `args` and the flags in `options`:
  `{"command":"llm bench","args":"<prompt>","options":{"schema":"answer.schema.json","samples":3,"max-credits":5}}`.
  The user approves each bench because it spends their own Genex credits (1 credit is 1 cent),
  never Nex: `max-credits` is the most one attempt may spend, and the card shows it. Studio adds
  the approval flag itself, so never pass `user-approved`. `max-coins`, the flag's old name, is read
  as `max-credits`.
- `schema` names the game's answer-shape file: one `.json` file inside this game, by its path
  relative to the game's folder, of at most 16 KB. The CLI runs in a folder of Studio's own, not
  the game, so Studio checks the file and hands the CLI a copy. No other flag reads a game file.
- The bench's answer is JSON. `recommendedMaxCredits` is the card's `Declare maxCredits`,
  `recommendedPerCallMaxCredits` its `Grant perCallMaxCredits`, `averageCreditsPerCall` its
  `Per-call estimate` and `recommendedPerCallEstimateCredits` its `Grant perCallEstimateCredits`.
- `llm price` is not available: it reprints a file the CLI leaves in the folder it ran in, and
  Studio removes that folder after every command. Write the bench's numbers into the game when you
  read them, and bench again only when the prompt, the schema or the model changed.
- Project commands (`llm bench`, `llm status`, `llm cancel`) need the game's hosted project:
  publish a draft with `genex__publish {"operation":"draft"}` first. `init --convert` does not
  apply in Studio.

## Not in Studio yet

The card below is from Genex CLI 1.44.0, ahead of the CLI Studio runs. These parts of that release
are left out of it because Studio cannot run them yet:

- `llm bench` takes no `system` or `messages` option here. Put the system text and a typical
  history into the bench prompt itself, so the measured size is the real call's.
- Practice mode (`llm practice`), creator-paid budgets (`llm sponsor`, `sponsored: true`) and
  `llm usage` are commands of that CLI. `features.sponsor` may read true on a stand; a game made
  here still asks the player for the budget.
- Model calls from a multiplayer server room (`shareWithRooms`, `lendSpendGrantToRoom`,
  `ctx.models`) need a newer multiplayer SDK than Studio ships. `features.roomCalls` may read true
  on a stand; a game made here calls the model from the player's page.
- Unity, Godot, Rust and Unreal games have no model-call binding in Studio.

`system`, `messages`, the controls and `features` work: Studio ships the SDK that has them.

## Reading the reference

Read the pricing reference with
`genex__skill {"name":"genex-llm-in-games","file":"skills/genex-llm-in-games/references/pricing.md"}`.

Genex's optional advice on designing the feature (the system instruction and turns, state as
data, legal moves, memory, several characters in one call, rules a character writes, hostile
player text) is `play-time-models` in the `genex-recommendations` plugin.

Other commands map onto Studio tools as the `genex` skill describes (`genex__skill {"name":"genex"}`).

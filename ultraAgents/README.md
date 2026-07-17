# UltraPlan preset experts

This directory contains the preset experts shown by **Load template** in the custom UltraPlan expert editor.

The executable prompt source is `src/utils/ultraplanTemplates.js`. Do not hand-edit the generated `code-expert.json` or `research-expert.json` files. Edit the prompt source or `manifest.json`, then run:

```sh
npm run sync:ultraplan-presets
```

Use `npm run check:ultraplan-presets` in validation and CI. It verifies that the JSON assets and the raw-template regions in every `concepts/*/UltraPlan.md` are byte-for-byte current.

## Schema

Each generated preset contains:

- `id`: stable identifier using letters, digits, `.`, `_`, or `-`;
- `version`: forward-compatible metadata; the current loader does not expose it;
- `title`: a non-empty string or localized string map;
- `description`: an optional string or localized string map;
- `content`: one non-empty instruction string, copied verbatim from `ULTRAPLAN_VARIANTS`.

The loader reads only ordinary JSON files in this bundled directory. It ignores unknown fields, invalid extra files, directories, duplicate IDs after the first file, files over 256 KiB, and entries beyond the first 100 valid presets. Requests cannot choose another directory. A missing/unreadable bundle or a missing required Code/Research preset is a server error rather than a misleading successful empty list.

Loading a preset fills the **custom expert** editor. It does not replace the built-in Code Expert or Research Expert tabs. After loading, the user may edit the copy before saving it to preferences.

# Action buttons across Community and Enterprise

Use `OfxButton` variants by operation in both editions. The shared `front-shell` component owns their colors and focus states.

| Operation | Variant | Icon |
| --- | --- | --- |
| Create or add | `create` (green) | `new` or `add` |
| Copy or duplicate | `copy` (light green) | `copy` |
| Save or run current work | `primary` (blue) | `save` or `run` |
| Delete or remove | `danger` (red) | `delete` |
| Navigate, refresh, or edit | `secondary` (neutral) | The matching action icon |

Place page actions together in `OfxPageHeader`'s `actions` slot. Use a section card's action slot only when the action belongs to that section. Keep creation, copying, saving, and deletion above the entity selector; the selector is for choosing a record. Do not spread actions over the page width with `justify-between` or an expanding grid. Use short, explicit labels such as **New profile**, **Copy profile**, **Save profile**, and **Delete profile**. Avoid a `+` in the label when the icon already shows it.

For confirmation dialogs, use the matching `confirmTone`. A persistent deletion must have contextual confirmation. Keep cards at natural height in forms, and avoid summaries that merely repeat editable fields. Configuration dependencies can use a compact icon beside the field label, with a hover/focus explanation and a new tab destination.

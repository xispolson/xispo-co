export const PROMPT_QUALITY_TAGS = [
  { id: 'clear-prompt',     label: 'Clear Prompt' },
  { id: 'ambiguous-prompt', label: 'Ambiguous Prompt' },
  { id: 'creative-prompt',  label: 'Creative Prompt' },
  { id: 'literal-prompt',   label: 'Literal Prompt' },
]

export const ART_OUTPUT_TAGS = [
  { id: 'good-art',          label: 'Good Art' },
  { id: 'art-misfire',       label: 'Art Misfire' },
  { id: 'unexpected-result', label: 'Unexpected Result' },
  { id: 'style-consistent',  label: 'Style Consistent' },
]

export const RLHF_SIGNAL_TAGS = [
  { id: 'high-signal',  label: 'High Signal' },
  { id: 'low-signal',   label: 'Low Signal' },
  { id: 'edge-case',    label: 'Edge Case' },
  { id: 'needs-review', label: 'Needs Review' },
]

export const STYLE_VIOLATION_TAGS = [
  { id: 'wrong-style',        label: 'Wrong Style',         emoji: '❌' },
  { id: 'cropped-body',       label: 'Cropped Body',        emoji: '✂️' },
  { id: 'facing-wrong',       label: 'Facing Wrong',        emoji: '↩️' },
  { id: 'has-floor-shadow',   label: 'Has Floor Shadow',    emoji: '🫥' },
  { id: 'missing-outlines',   label: 'Missing Outlines',    emoji: '🖊️' },
  { id: 'too-realistic',      label: 'Too Realistic',       emoji: '📷' },
  { id: 'not-animorphic',     label: 'Not Animorphic',      emoji: '👁️' },
  { id: 'has-trademark',      label: 'Trademark/NSFW',      emoji: '™️' },
  { id: 'wrong-proportions',  label: 'Wrong Proportions',   emoji: '📐' },
  { id: 'bad-limb-taper',     label: 'Bad Limbs',           emoji: '💪' },
  { id: 'bad-eyes',           label: 'Bad Eyes',            emoji: '👁️' },
  { id: 'has-text',           label: 'Text',                emoji: '🅰️' },
  { id: 'has-background',     label: 'Has Background',      emoji: '🌄' },
  { id: 'human-not-standing', label: 'Human Not Standing',  emoji: '🧍' },
]

export const TAG_CATEGORIES = [
  { key: 'art',    label: 'Art Output',     tags: ART_OUTPUT_TAGS,     color: 'purple' },
  { key: 'prompt', label: 'Prompt Quality', tags: PROMPT_QUALITY_TAGS, color: 'blue' },
  { key: 'signal', label: 'RLHF Signal',    tags: RLHF_SIGNAL_TAGS,    color: 'emerald' },
]

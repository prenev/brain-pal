export const DEFAULT_TAGS = [
  'work', 'family', 'relationships', 'health', 'money', 'social',
  'sleep', 'self-worth', 'future', 'past', 'perfectionism', 'comparison',
]

export const EMOTIONS = [
  'happy', 'excited', 'grateful', 'relaxed', 'content', 'hopeful',
  'tired', 'unsure', 'bored', 'anxious', 'angry', 'stressed', 'sad', 'lonely',
  'overwhelmed', 'ashamed', 'guilty', 'afraid', 'desperate',
]


export const BOX_PATTERN = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 }

export const TRAPS = [
  { name: 'catastrophizing', blurb: 'Jumping to the worst possible outcome.', ask: 'What is the most likely outcome, not the worst one?' },
  { name: 'fortune telling', blurb: 'Predicting the future as if it were certain.', ask: 'How sure am I, really? What else could happen?' },
  { name: 'mind reading', blurb: 'Assuming you know what others are thinking.', ask: 'What evidence do I have? What else might explain it?' },
  { name: 'all-or-nothing', blurb: 'Seeing things as perfect or a total failure.', ask: 'Where is the middle ground?' },
  { name: 'overgeneralizing', blurb: 'One event becomes “always” or “never”.', ask: 'Is it really always true? Can I name one exception?' },
  { name: 'emotional reasoning', blurb: '“I feel it, so it must be true.”', ask: 'Feelings are signals, not facts. What are the facts?' },
  { name: 'should statements', blurb: 'Rigid rules about how you or others must act.', ask: 'Would I say “should” to a friend? Try “I’d prefer…”' },
  { name: 'personalizing', blurb: 'Blaming yourself for things outside your control.', ask: 'What else contributed? What part is actually mine?' },
  { name: 'labeling', blurb: 'Calling yourself a name instead of describing what happened.', ask: 'What did I actually do? Does one act define me?' },
  { name: 'discounting positives', blurb: 'Dismissing what went well.', ask: 'What went right that I’m brushing aside?' },
]

export const REFRAME_QUESTIONS = [
  'What evidence supports this thought, and what doesn’t?',
  'What would I tell a friend who had this thought?',
  'What’s the worst, best and most likely outcome?',
  'Will this matter in a week? In a year?',
  'What’s one small thing I can do about it?',
]

export const GROUNDING = [
  { n: 5, sense: 'see', prompt: 'Look around you. Name 5 things you can see.' },
  { n: 4, sense: 'feel', prompt: 'Notice 4 things you can touch or feel — your feet on the floor, the fabric on your skin.' },
  { n: 3, sense: 'hear', prompt: 'Listen. Name 3 things you can hear.' },
  { n: 2, sense: 'smell', prompt: 'Find 2 things you can smell, or recall two smells you like.' },
  { n: 1, sense: 'taste', prompt: 'Notice 1 thing you can taste — or take a slow sip of water.' },
]

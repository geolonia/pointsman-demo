// Review commands in comments on the demo issues:
//
//   /publish                 the report goes to the residents' map
//   /reject                  it does not
//   /category laneRestriction   correct an answer (any question of the profile
//   /danger no                  that is a choice or yes/no)
//
// A final action (/publish or /reject) resolves the review; corrections alone
// are sent as feedback and the issue stays open. Only members and
// collaborators of the repository can review: the repository is public.

export const FINAL_ACTIONS = ['publish', 'reject'] as const;
export type FinalAction = (typeof FINAL_ACTIONS)[number];

/** Choice options of road-restriction-check, for /category. */
export const CATEGORIES = [
  'closedWeather', 'closedConstruction', 'closedHeavyVehicle', 'closedWinter', 'laneRestriction',
  'alternatingOneWay', 'mobileRestriction', 'chainRestriction', 'chainGuidance', 'other',
];

export interface Command {
  final?: FinalAction;
  correct: Record<string, string | boolean>;
}

const REVIEWERS = ['OWNER', 'MEMBER', 'COLLABORATOR'];
export const mayReview = (authorAssociation: string | undefined) => REVIEWERS.includes(authorAssociation ?? '');

/** Reads the commands in a comment; null when there are none, a string for an error. */
export function parseCommand(text: string): Command | string | null {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('/'));
  if (lines.length === 0) return null;
  const command: Command = { correct: {} };
  for (const line of lines) {
    const [word, arg, ...rest] = line.slice(1).split(/\s+/);
    if (rest.length > 0) return `"${line}": one value only`;
    if (word === 'publish' || word === 'reject') {
      if (arg !== undefined) return `"/${word}" takes no value`;
      if (command.final && command.final !== word) return 'both /publish and /reject';
      command.final = word;
    } else if (word === 'category') {
      if (!arg || !CATEGORIES.includes(arg)) return `"/category" needs one of: ${CATEGORIES.join(', ')}`;
      command.correct.category = arg;
    } else if (word === 'danger' || word === 'status_matches') {
      if (arg !== 'yes' && arg !== 'no') return `"/${word}" needs yes or no`;
      command.correct[word] = arg === 'yes';
    } else {
      return `unknown command "/${word}" (use /publish, /reject, /category, /danger, /status_matches)`;
    }
  }
  return command;
}

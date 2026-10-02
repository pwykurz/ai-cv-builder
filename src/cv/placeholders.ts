import { createId } from '../lib/ids';
import type { Education, Job, Project } from '../types';

/** Default text for blocks added in edit mode; focused and selected on insert. */
export const NEW_ITEM = {
  paragraph: 'New summary paragraph.',
  bullet: 'New bullet point',
  skillGroup: 'Skill group',
  role: 'Role',
  project: 'Project name',
  degree: 'Degree',
} as const;

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function newJob(): Job {
  return {
    id: createId(),
    role: NEW_ITEM.role,
    company: 'Company, City',
    start: thisMonth(),
    end: null,
    bullets: [NEW_ITEM.bullet],
  };
}

export function newProject(): Project {
  return {
    id: createId(),
    name: NEW_ITEM.project,
    start: thisMonth(),
    end: null,
    bullets: [NEW_ITEM.bullet],
  };
}

export function newEducation(): Education {
  return {
    id: createId(),
    degree: NEW_ITEM.degree,
    school: 'School, City',
    start: thisMonth(),
    end: thisMonth(),
  };
}

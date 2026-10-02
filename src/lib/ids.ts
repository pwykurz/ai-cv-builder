import type { CV, Education, Job, Project, SkillGroup } from '../types';

export function createId(): string {
  return crypto.randomUUID();
}

function withId<T extends { id?: string }>(item: T): T & { id: string } {
  return item.id ? (item as T & { id: string }) : { ...item, id: createId() };
}

function ensureProject(project: Project): Project {
  return withId(project);
}

function ensureJob(job: Job): Job {
  return {
    ...withId(job),
    projects: job.projects?.map(ensureProject),
  };
}

function ensureSkillGroup(group: SkillGroup): SkillGroup {
  return withId(group);
}

function ensureEducation(entry: Education): Education {
  return withId(entry);
}

/** Assigns stable UUIDs to list items that don't have one yet (persisted on save). */
export function ensureCvIds(cv: CV): CV {
  return {
    ...cv,
    skills: cv.skills.map(ensureSkillGroup),
    experience: cv.experience.map(ensureJob),
    education: cv.education.map(ensureEducation),
  };
}

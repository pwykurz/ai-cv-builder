import type { UiStrings } from '../i18n/ui-strings';
import type { CV, Education, Job, Labels, Project, SkillGroup } from '../types';
import { ensureCvIds } from './ids';

/** What the importer returns per language: CV content without photo, locale and labels. */
export interface ImportedCv {
  profile?: Partial<Omit<CV['profile'], 'photo' | 'contact'>> & { contact?: Partial<CV['profile']['contact']> };
  skills?: SkillGroup[];
  experience?: Job[];
  education?: Education[];
  languages?: string[];
  interests?: string;
  consent?: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(text).filter((item) => item !== '') : []);
const rows = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Optional fields are left out instead of stored empty, like in the hand-written JSON files. */
const optional = <T extends object>(fields: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;

const end = (value: unknown): string | null => text(value) || null;

function project(p: Project): Project {
  return {
    name: text(p.name),
    start: text(p.start),
    end: end(p.end),
    bullets: list(p.bullets),
    ...optional({ client: text(p.client), tech: list(p.tech), links: list(p.links) }),
  };
}

function job(j: Job): Job {
  return {
    role: text(j.role),
    company: text(j.company),
    start: text(j.start),
    end: end(j.end),
    ...optional({
      blurb: text(j.blurb),
      bullets: list(j.bullets),
      tech: list(j.tech),
      projects: rows<Project>(j.projects).map(project),
    }),
  };
}

/**
 * Lays an imported CV over `current`, field by field: whatever the import has (non-empty) replaces
 * the current value - a list replaces the whole list - and whatever it lacks stays as it was.
 * Photo, locale and section labels always stay, so the result keeps its language.
 */
export function mergeCv(current: CV, imported: ImportedCv): CV {
  const profile = imported.profile ?? {};
  const contact = imported.profile?.contact ?? {};
  const pick = (next: unknown, prev: string) => text(next) || prev;
  const pickList = <T>(next: T[], prev: T[]) => (next.length > 0 ? next : prev);

  const skills = rows<SkillGroup>(imported.skills)
    .map((g) => ({ label: text(g.label), items: list(g.items) }))
    .filter((g) => g.label !== '' && g.items.length > 0);
  const education = rows<Education>(imported.education).map((e) => ({
    degree: text(e.degree),
    school: text(e.school),
    start: text(e.start),
    end: text(e.end),
  }));

  return ensureCvIds({
    ...current,
    profile: {
      ...current.profile,
      name: pick(profile.name, current.profile.name),
      headline: pick(profile.headline, current.profile.headline),
      summary: pickList(list(profile.summary), current.profile.summary),
      contact: {
        email: pick(contact.email, current.profile.contact.email),
        address: pick(contact.address, current.profile.contact.address),
        phone: pick(contact.phone, current.profile.contact.phone),
        linkedin: pick(contact.linkedin, current.profile.contact.linkedin),
        website: pick(contact.website, current.profile.contact.website),
        github: pick(contact.github, current.profile.contact.github),
      },
    },
    skills: pickList(skills, current.skills),
    experience: pickList(rows<Job>(imported.experience).map(job), current.experience),
    education: pickList(education, current.education),
    languages: pickList(list(imported.languages), current.languages),
    interests: pick(imported.interests, current.interests),
    consent: pick(imported.consent, current.consent),
  });
}

/** What was read from the file, and which of the main fields were not found - so a miss is visible. */
export function importSummary(
  imported: ImportedCv,
  labels: Labels,
  t: Pick<UiStrings, 'importDone' | 'importMissing' | 'importName'>,
): string {
  const contact = imported.profile?.contact ?? {};
  const missing = [
    ...(text(imported.profile?.name) ? [] : [t.importName]),
    ...(['email', 'phone', 'address', 'linkedin', 'github', 'website'] as const)
      .filter((field) => !text(contact[field]))
      .map((field) => labels[field]),
    ...(rows(imported.skills).length ? [] : [labels.skills]),
    ...(rows(imported.experience).length ? [] : [labels.experience]),
    ...(rows(imported.education).length ? [] : [labels.education]),
  ];
  const done = t.importDone(
    text(imported.profile?.name),
    rows(imported.experience).length,
    rows(imported.skills).length,
    rows(imported.education).length,
  );
  return missing.length ? `${done}. ${t.importMissing(missing.join(', '))}` : done;
}

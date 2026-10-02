/** Dates are "YYYY-MM" (formatted as "Jun 2021") or "YYYY" (kept as is). `null` end = still ongoing. */
export interface Project {
  name: string;
  /** Client or context, rendered after the name: "Insight Dashboard – retail analytics platform" */
  client?: string;
  start: string;
  end: string | null;
  bullets: string[];
  tech?: string[];
  /** Live links, shown under the title as clickable text (no "https://" in the visible label) */
  links?: string[];
}

export interface Job {
  role: string;
  company: string;
  start: string;
  end: string | null;
  /** One or two sentences of context under the company line */
  blurb?: string;
  bullets?: string[];
  tech?: string[];
  /** Projects delivered for/within this employer (nested = unambiguous for ATS) */
  projects?: Project[];
  /** Older roles: tighter spacing, never split across pages */
  compact?: boolean;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Education {
  degree: string;
  school: string;
  /** "YYYY-MM" format, same as Job/Project dates */
  start: string;
  end: string;
}

export interface Labels {
  skills: string;
  experience: string;
  education: string;
  languages: string;
  interests: string;
  present: string;
  techStack: string;
  technologies: string;
  keyProjects: string;
  email: string;
  address: string;
  phone: string;
  linkedin: string;
  website: string;
  github: string;
}

export interface CV {
  /** BCP-47 locale used to format months, e.g. "en-US" or "pl-PL" */
  locale: string;
  labels: Labels;
  profile: {
    name: string;
    /** Rendered ABOVE the name visually, but the name stays first in the text layer */
    headline: string;
    /** Path in /public, e.g. "/photo.jpg". null = no photo */
    photo: string | null;
    summary: string[];
    contact: {
      email: string;
      address: string;
      phone: string;
      linkedin: string;
      website: string;
      github: string;
    };
  };
  skills: SkillGroup[];
  experience: Job[];
  education: Education[];
  languages: string[];
  interests: string;
  /** GDPR / RODO clause, printed once at the very end */
  consent: string;
}

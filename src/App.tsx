import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CV, Education, Job, Labels, Project } from './types';
import { formatRange } from './lib/dates';
import {
  AddButton,
  Editable,
  EditableList,
  DateRange,
  ItemControls,
  LANGS,
  PhotoEditor,
  Toolbar,
  EditModeProvider,
  UiLangProvider,
  focusOnMount,
  loadUiLang,
  storeUiLang,
  listControls,
  type Lang,
  type UiLang,
} from './editing';

// Every JSON file is a CV variant; pick one with ?data=<file-name-without-.json> (default: cv.en).
// Names are <base>.<lang>; see parseVariant in src/editing.tsx.
// examples/ holds the fictional sample CVs that ship with the repo; data/ is your own, gitignored
// and never committed. A file in data/ wins over an example with the same name, and saving
// always writes to data/ (see vite.config.ts) - so editing an example turns it into your own copy.
const fileName = (path: string) => path.replace(/^.*\//, '').replace(/\.json$/, '');
const toVariants = (modules: Record<string, CV>) =>
  Object.fromEntries(Object.entries(modules).map(([path, cv]) => [fileName(path), cv]));
const variants: Record<string, CV> = {
  ...toVariants(import.meta.glob<CV>('../examples/*.json', { eager: true, import: 'default' })),
  ...toVariants(import.meta.glob<CV>('../data/*.json', { eager: true, import: 'default' })),
};
const variantNames = Object.keys(variants).sort();

// Headings, "Present", date locale per language, taken from the base cv.<lang> files - used when a
// variant gets its first version in another language.
const languageDefaults = Object.fromEntries(
  LANGS.map((lang) => {
    const { locale, labels } = pickCV(`cv.${lang}`);
    return [lang, { locale, labels }];
  }),
) as Record<Lang, Pick<CV, 'locale' | 'labels'>>;

const UNDO_LIMIT = 100;

type ListControls = ReturnType<typeof listControls>;

// Placeholder content for blocks added in edit mode (the CV itself is in English). The first
// field of each new block gets focused with this text selected, so it's typed over right away.
const NEW = {
  paragraph: 'New summary paragraph.',
  bullet: 'New bullet point',
  skillGroup: 'Skill group',
  role: 'Role',
  project: 'Project name',
  degree: 'Degree',
};

const thisMonth = () => new Date().toISOString().slice(0, 7);

const newJob = (): Job => ({
  role: NEW.role,
  company: 'Company, City',
  start: thisMonth(),
  end: null,
  bullets: [NEW.bullet],
});

const newProject = (): Project => ({
  name: NEW.project,
  start: thisMonth(),
  end: null,
  bullets: [NEW.bullet],
});

const newEducation = (): Education => ({
  degree: NEW.degree,
  school: 'School, City',
  start: thisMonth(),
  end: thisMonth(),
});

function getDataName(): string {
  return new URLSearchParams(window.location.search).get('data') ?? 'cv.en';
}

function pickCV(name: string): CV {
  const cv = variants[name];
  if (!cv) {
    throw new Error(`No CV "${name}" in data/ or examples/ (found: ${variantNames.join(', ')})`);
  }
  return cv;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items = [], onChange }: { items?: string[]; onChange: (items: string[]) => void }) {
  const add = () => {
    focusOnMount(NEW.bullet);
    onChange([...items, NEW.bullet]);
  };
  return (
    <>
      {items.length > 0 && (
        <ul>
          {items.map((item, i) => (
            // The flex row lives on an inner span, not the <li> itself: display:flex on a <li>
            // would drop its `display: list-item`-based bullet marker.
            <li key={i}>
              <span className="editable-row">
                <Editable value={item} onChange={(v) => onChange(items.map((it, j) => (j === i ? v : it)))} as="span" />
                <ItemControls item="bullet" {...listControls(items, i, onChange)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <AddButton item="bullet" className="add-bullet" onClick={add} />
    </>
  );
}

function Tech({
  label,
  items,
  onChange,
}: {
  label: string;
  items?: string[];
  onChange: (items: string[]) => void;
}) {
  if (!items?.length) return null;
  return (
    <p className="tech">
      <strong>{label}:</strong> <EditableList items={items} onChange={onChange} separator=", " />
    </p>
  );
}

function ProjectBlock({
  project,
  cv,
  onChange,
  controls,
}: {
  project: Project;
  cv: CV;
  onChange: (p: Project) => void;
  controls: ListControls;
}) {
  const { labels, locale } = cv;
  return (
    <section className="project">
      <ItemControls item="project" block {...controls} />
      <div className="row">
        <h4 className="project-name">
          <Editable value={project.name} onChange={(name) => onChange({ ...project, name })} as="span" />
          {project.client && (
            <span className="client">
              {' '}
              {'–'}{' '}
              <Editable
                value={project.client}
                onChange={(client) => onChange({ ...project, client: client.trim() || undefined })}
                as="span"
              />
            </span>
          )}
        </h4>
        <span className="dates-wrap">
          <span className="dates">{formatRange(project.start, project.end, locale, labels.present)}</span>
          <DateRange
            start={project.start}
            end={project.end}
            allowPresent
            onChange={({ start, end }) => onChange({ ...project, start, end })}
          />
        </span>
      </div>
      {project.links?.length ? (
        <p className="links">
          <EditableList
            items={project.links}
            onChange={(links) => onChange({ ...project, links })}
            separator=" | "
          />
        </p>
      ) : null}
      <Bullets items={project.bullets} onChange={(bullets) => onChange({ ...project, bullets })} />
      <Tech label={labels.techStack} items={project.tech} onChange={(tech) => onChange({ ...project, tech })} />
    </section>
  );
}

function JobBlock({
  job,
  cv,
  onChange,
  controls,
}: {
  job: Job;
  cv: CV;
  onChange: (j: Job) => void;
  controls: ListControls;
}) {
  const { labels, locale } = cv;
  const addProject = () => {
    focusOnMount(NEW.project);
    onChange({ ...job, projects: [newProject(), ...(job.projects ?? [])] });
  };
  return (
    <article className={job.compact ? 'job compact' : 'job'}>
      <ItemControls item="job" block {...controls} />
      <div className="row">
        <Editable value={job.role} onChange={(role) => onChange({ ...job, role })} as="h3" className="role" />
        <span className="dates-wrap">
          <span className="dates">{formatRange(job.start, job.end, locale, labels.present)}</span>
          <DateRange
            start={job.start}
            end={job.end}
            allowPresent
            onChange={({ start, end }) => onChange({ ...job, start, end })}
          />
        </span>
      </div>
      <Editable value={job.company} onChange={(company) => onChange({ ...job, company })} as="p" className="company" />
      {job.blurb && (
        <Editable
          value={job.blurb}
          onChange={(blurb) => onChange({ ...job, blurb: blurb.trim() || undefined })}
          as="p"
          className="blurb"
        />
      )}
      <Bullets items={job.bullets} onChange={(bullets) => onChange({ ...job, bullets })} />
      {job.projects?.length ? (
        <div className="projects">
          <p className="projects-label">{labels.keyProjects}</p>
          {/* Newest first, like the data - so a new project goes on top. */}
          <AddButton item="project" onClick={addProject} />
          {job.projects.map((project, i) => (
            <ProjectBlock
              key={i}
              project={project}
              cv={cv}
              onChange={(p) => onChange({ ...job, projects: job.projects!.map((pr, j) => (j === i ? p : pr)) })}
              controls={listControls(job.projects!, i, (projects) => onChange({ ...job, projects }))}
            />
          ))}
        </div>
      ) : (
        <AddButton item="project" suffix={labels.keyProjects} onClick={addProject} />
      )}
      <Tech label={labels.technologies} items={job.tech} onChange={(tech) => onChange({ ...job, tech })} />
    </article>
  );
}

function contactRows(labels: Labels): [string, keyof CV['profile']['contact'], ((v: string) => string) | undefined][] {
  return [
    [labels.email, 'email', (v) => `mailto:${v}`],
    [labels.address, 'address', undefined],
    [labels.phone, 'phone', (v) => `tel:${v.replace(/\s/g, '')}`],
    [labels.linkedin, 'linkedin', (v) => `https://${v}`],
    [labels.website, 'website', (v) => `https://${v}`],
    [labels.github, 'github', (v) => `https://${v}`],
  ];
}

export default function App() {
  const dataName = getDataName();
  const [loaded] = useState<CV>(() => pickCV(dataName));
  const [cv, setCvState] = useState<CV>(loaded);
  // Every edit is an immutable update, so "unsaved" is just "not the object we last saved" -
  // undoing all the way back to it makes the page clean again on its own.
  const [saved, setSaved] = useState<CV>(loaded);
  const [history, setHistory] = useState<CV[]>([]);
  const [editMode, setEditMode] = useState(false);
  // Language of the toolbar/editing controls only - independent of the CV's own language.
  const [uiLang, setUiLangState] = useState<UiLang>(loadUiLang);
  const setUiLang = (next: UiLang) => {
    setUiLangState(next);
    storeUiLang(next);
  };
  const dirty = cv !== saved;
  const { profile, labels } = cv;

  // Read through a ref so two updates landing before a re-render still each record their own
  // previous state (React updater functions must stay pure, so no setHistory inside them).
  const cvRef = useRef(cv);
  cvRef.current = cv;

  const setCv = (updater: (prev: CV) => CV) => {
    const prev = cvRef.current;
    const next = updater(prev);
    if (next === prev) return;
    cvRef.current = next;
    setHistory((h) => [...h.slice(-(UNDO_LIMIT - 1)), prev]);
    setCvState(next);
  };

  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    cvRef.current = prev;
    setHistory(history.slice(0, -1));
    setCvState(prev);
  };

  // Ctrl/Cmd+Z undoes the last committed change (edit or removal). While the cursor is inside a
  // field that's being typed in, the browser's own undo for that text takes precedence.
  useEffect(() => {
    if (!editMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z') return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      undo();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    document.title = `${profile.name} – CV`;
  }, [profile.name]);

  const updateContact = (key: keyof CV['profile']['contact'], value: string) =>
    setCv((prev) => ({ ...prev, profile: { ...prev.profile, contact: { ...prev.profile.contact, [key]: value } } }));

  const updateEducation = (i: number, next: Education) =>
    setCv((prev) => ({ ...prev, education: prev.education.map((e, j) => (j === i ? next : e)) }));

  return (
    <UiLangProvider value={uiLang}>
    <EditModeProvider value={editMode}>
    <main className="page">
      <Toolbar
        cv={cv}
        dataName={dataName}
        dirty={dirty}
        editMode={editMode}
        onEditModeChange={setEditMode}
        onSaved={setSaved}
        canUndo={history.length > 0}
        onUndo={undo}
        variantNames={variantNames}
        languageDefaults={languageDefaults}
        uiLang={uiLang}
        onUiLangChange={setUiLang}
      />
      {/*
        DOM order = reading order for parsers: name first, then headline, then summary.
        Grid areas (see styles.css) place the headline above the name and the photo
        beside name+summary, which changes the look but not the order of the text in the PDF.
      */}
      <header className="head">
        <Editable value={profile.name} onChange={(name) => setCv((p) => ({ ...p, profile: { ...p.profile, name } }))} as="h1" />
        <Editable
          value={profile.headline}
          onChange={(headline) => setCv((p) => ({ ...p, profile: { ...p.profile, headline } }))}
          as="p"
          className="headline"
        />
        <div className="summary">
          {profile.summary.map((paragraph, i) => (
            <p key={i} className="editable-row">
              <Editable
                value={paragraph}
                onChange={(v) =>
                  setCv((p) => ({ ...p, profile: { ...p.profile, summary: p.profile.summary.map((s, j) => (j === i ? v : s)) } }))
                }
                as="span"
              />
              <ItemControls
                item="paragraph"
                {...listControls(profile.summary, i, (summary) => setCv((p) => ({ ...p, profile: { ...p.profile, summary } })))}
              />
            </p>
          ))}
          <AddButton
            item="paragraph"
            onClick={() => {
              focusOnMount(NEW.paragraph);
              setCv((p) => ({ ...p, profile: { ...p.profile, summary: [...p.profile.summary, NEW.paragraph] } }));
            }}
          />
        </div>
        <PhotoEditor src={profile.photo} onChange={(photo) => setCv((p) => ({ ...p, profile: { ...p.profile, photo } }))} />
      </header>

      <dl className="contact">
        {contactRows(labels).map(([label, key, toHref]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              {toHref ? (
                <a href={toHref(profile.contact[key])} onClick={(e) => e.preventDefault()}>
                  <Editable value={profile.contact[key]} onChange={(v) => updateContact(key, v)} as="span" />
                </a>
              ) : (
                <Editable value={profile.contact[key]} onChange={(v) => updateContact(key, v)} as="span" />
              )}
            </dd>
          </div>
        ))}
      </dl>

      <Section title={labels.skills}>
        <dl className="skills">
          {cv.skills.map((group, i) => (
            <Fragment key={i}>
              <dt>
                <Editable
                  value={group.label}
                  onChange={(label) => setCv((p) => ({ ...p, skills: p.skills.map((g, j) => (j === i ? { ...g, label } : g)) }))}
                  as="span"
                />
              </dt>
              <dd>
                <EditableList
                  items={group.items}
                  onChange={(items) => setCv((p) => ({ ...p, skills: p.skills.map((g, j) => (j === i ? { ...g, items } : g)) }))}
                  separator=", "
                />
                {/* At the end of the wide column, not in the narrow label column, so it doesn't wrap. */}
                <ItemControls item="skillGroup" {...listControls(cv.skills, i, (skills) => setCv((p) => ({ ...p, skills })))} />
              </dd>
            </Fragment>
          ))}
        </dl>
        <AddButton
          item="skillGroup"
          onClick={() => {
            focusOnMount(NEW.skillGroup);
            setCv((p) => ({ ...p, skills: [...p.skills, { label: NEW.skillGroup, items: ['Skill'] }] }));
          }}
        />
      </Section>

      <Section title={labels.experience}>
        {/* Reverse-chronological, so a new position goes on top. */}
        <AddButton
          item="job"
          onClick={() => {
            focusOnMount(NEW.role);
            setCv((p) => ({ ...p, experience: [newJob(), ...p.experience] }));
          }}
        />
        <div className="timeline">
          {cv.experience.map((job, i) => (
            <JobBlock
              key={i}
              job={job}
              cv={cv}
              onChange={(j) => setCv((p) => ({ ...p, experience: p.experience.map((jb, idx) => (idx === i ? j : jb)) }))}
              controls={listControls(cv.experience, i, (experience) => setCv((p) => ({ ...p, experience })))}
            />
          ))}
        </div>
      </Section>

      <Section title={labels.education}>
        <AddButton
          item="education"
          onClick={() => {
            focusOnMount(NEW.degree);
            setCv((p) => ({ ...p, education: [newEducation(), ...p.education] }));
          }}
        />
        {cv.education.map((item, i) => (
          <div className="row edu" key={i}>
            <p>
              <Editable value={item.degree} onChange={(degree) => updateEducation(i, { ...item, degree })} as="strong" />
              {', '}
              <Editable value={item.school} onChange={(school) => updateEducation(i, { ...item, school })} as="span" />
            </p>
            <span className="dates-wrap">
              <span className="dates">{formatRange(item.start, item.end, cv.locale, labels.present)}</span>
              <DateRange
                start={item.start}
                end={item.end}
                onChange={({ start, end }) => updateEducation(i, { ...item, start, end: end ?? item.end })}
              />
            </span>
            <ItemControls item="education" {...listControls(cv.education, i, (education) => setCv((p) => ({ ...p, education })))} />
          </div>
        ))}
      </Section>

      <Section title={labels.languages}>
        <p className="meta">
          <EditableList items={cv.languages} onChange={(languages) => setCv((p) => ({ ...p, languages }))} separator=", " />
        </p>
      </Section>

      <Section title={labels.interests}>
        <Editable value={cv.interests} onChange={(interests) => setCv((p) => ({ ...p, interests }))} as="p" className="meta" />
      </Section>

      {/* Printed exactly once, at the end, so it never lands inside a job description. */}
      <Editable value={cv.consent} onChange={(consent) => setCv((p) => ({ ...p, consent }))} as="p" className="consent" />
    </main>
    </EditModeProvider>
    </UiLangProvider>
  );
}

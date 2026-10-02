import { Fragment } from 'react';
import {
  AddButton,
  DateRange,
  Editable,
  EditableList,
  ItemControls,
  PhotoEditor,
  focusOnMount,
  listControls,
} from '../editing';
import { createId } from '../lib/ids';
import { formatRange } from '../lib/dates';
import type { CV, Education } from '../types';
import type { CvUpdater } from '../hooks/useCvHistory';
import { JobBlock } from './JobBlock';
import { Section } from './Section';
import { contactRows } from './contact';
import { NEW_ITEM, newEducation, newJob } from './placeholders';

export function CvPage({ cv, onChange }: { cv: CV; onChange: (updater: CvUpdater) => void }) {
  const { profile, labels } = cv;

  const updateContact = (key: keyof CV['profile']['contact'], value: string) =>
    onChange((prev) => ({
      ...prev,
      profile: { ...prev.profile, contact: { ...prev.profile.contact, [key]: value } },
    }));

  const updateEducation = (i: number, next: Education) =>
    onChange((prev) => ({ ...prev, education: prev.education.map((e, j) => (j === i ? next : e)) }));

  return (
    <>
      {/*
        DOM order = reading order for parsers: name first, then headline, then summary.
        Grid areas (see styles.css) place the headline above the name and the photo
        beside name+summary, which changes the look but not the order of the text in the PDF.
      */}
      <header className="head">
        <Editable
          value={profile.name}
          onChange={(name) => onChange((p) => ({ ...p, profile: { ...p.profile, name } }))}
          as="h1"
        />
        <Editable
          value={profile.headline}
          onChange={(headline) => onChange((p) => ({ ...p, profile: { ...p.profile, headline } }))}
          as="p"
          className="headline"
        />
        <div className="summary">
          {profile.summary.map((paragraph, i) => (
            <p key={i} className="editable-row">
              <Editable
                value={paragraph}
                onChange={(v) =>
                  onChange((p) => ({
                    ...p,
                    profile: { ...p.profile, summary: p.profile.summary.map((s, j) => (j === i ? v : s)) },
                  }))
                }
                as="span"
              />
              <ItemControls
                item="paragraph"
                {...listControls(profile.summary, i, (summary) =>
                  onChange((p) => ({ ...p, profile: { ...p.profile, summary } })),
                )}
              />
            </p>
          ))}
          <AddButton
            item="paragraph"
            onClick={() => {
              focusOnMount(NEW_ITEM.paragraph);
              onChange((p) => ({
                ...p,
                profile: { ...p.profile, summary: [...p.profile.summary, NEW_ITEM.paragraph] },
              }));
            }}
          />
        </div>
        <PhotoEditor
          src={profile.photo}
          onChange={(photo) => onChange((p) => ({ ...p, profile: { ...p.profile, photo } }))}
        />
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
            <Fragment key={group.id}>
              <dt>
                <Editable
                  value={group.label}
                  onChange={(label) =>
                    onChange((p) => ({ ...p, skills: p.skills.map((g, j) => (j === i ? { ...g, label } : g)) }))
                  }
                  as="span"
                />
              </dt>
              <dd>
                <EditableList
                  items={group.items}
                  onChange={(items) =>
                    onChange((p) => ({ ...p, skills: p.skills.map((g, j) => (j === i ? { ...g, items } : g)) }))
                  }
                  separator=", "
                />
                <ItemControls
                  item="skillGroup"
                  {...listControls(cv.skills, i, (skills) => onChange((p) => ({ ...p, skills })))}
                />
              </dd>
            </Fragment>
          ))}
        </dl>
        <AddButton
          item="skillGroup"
          onClick={() => {
            focusOnMount(NEW_ITEM.skillGroup);
            onChange((p) => ({
              ...p,
              skills: [...p.skills, { id: createId(), label: NEW_ITEM.skillGroup, items: ['Skill'] }],
            }));
          }}
        />
      </Section>

      <Section title={labels.experience}>
        <AddButton
          item="job"
          onClick={() => {
            focusOnMount(NEW_ITEM.role);
            onChange((p) => ({ ...p, experience: [newJob(), ...p.experience] }));
          }}
        />
        <div className="timeline">
          {cv.experience.map((job, i) => (
            <JobBlock
              key={job.id}
              job={job}
              cv={cv}
              onChange={(j) =>
                onChange((p) => ({ ...p, experience: p.experience.map((jb, idx) => (idx === i ? j : jb)) }))
              }
              controls={listControls(cv.experience, i, (experience) => onChange((p) => ({ ...p, experience })))}
            />
          ))}
        </div>
      </Section>

      <Section title={labels.education}>
        <AddButton
          item="education"
          onClick={() => {
            focusOnMount(NEW_ITEM.degree);
            onChange((p) => ({ ...p, education: [newEducation(), ...p.education] }));
          }}
        />
        {cv.education.map((item, i) => (
          <div className="row edu" key={item.id}>
            <p>
              <Editable
                value={item.degree}
                onChange={(degree) => updateEducation(i, { ...item, degree })}
                as="strong"
              />
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
            <ItemControls
              item="education"
              {...listControls(cv.education, i, (education) => onChange((p) => ({ ...p, education })))}
            />
          </div>
        ))}
      </Section>

      <Section title={labels.languages}>
        <p className="meta">
          <EditableList
            items={cv.languages}
            onChange={(languages) => onChange((p) => ({ ...p, languages }))}
            separator=", "
          />
        </p>
      </Section>

      <Section title={labels.interests}>
        <Editable
          value={cv.interests}
          onChange={(interests) => onChange((p) => ({ ...p, interests }))}
          as="p"
          className="meta"
        />
      </Section>

      <Editable
        value={cv.consent}
        onChange={(consent) => onChange((p) => ({ ...p, consent }))}
        as="p"
        className="consent"
      />
    </>
  );
}

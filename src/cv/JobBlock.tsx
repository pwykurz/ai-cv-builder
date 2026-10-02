import { AddButton, DateRange, Editable, ItemControls, focusOnMount, listControls } from '../editing';
import { formatRange } from '../lib/dates';
import type { CV, Job } from '../types';
import { ProjectBlock } from './ProjectBlock';
import { Bullets } from './Bullets';
import { Tech } from './Tech';
import { NEW_ITEM, newProject } from './placeholders';

type ListControls = ReturnType<typeof listControls>;

export function JobBlock({
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
    focusOnMount(NEW_ITEM.project);
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
      <Bullets listKey={job.id!} items={job.bullets} onChange={(bullets) => onChange({ ...job, bullets })} />
      {job.projects?.length ? (
        <div className="projects">
          <p className="projects-label">{labels.keyProjects}</p>
          <AddButton item="project" onClick={addProject} />
          {job.projects.map((project, i) => (
            <ProjectBlock
              key={project.id}
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

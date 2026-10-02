import { DateRange, Editable, EditableList, ItemControls, listControls } from '../editing';
import { formatRange } from '../lib/dates';
import type { CV, Project } from '../types';
import { Bullets } from './Bullets';
import { Tech } from './Tech';

type ListControls = ReturnType<typeof listControls>;

export function ProjectBlock({
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
          <EditableList items={project.links} onChange={(links) => onChange({ ...project, links })} separator=" | " />
        </p>
      ) : null}
      <Bullets
        listKey={project.id!}
        items={project.bullets}
        onChange={(bullets) => onChange({ ...project, bullets })}
      />
      <Tech label={labels.techStack} items={project.tech} onChange={(tech) => onChange({ ...project, tech })} />
    </section>
  );
}

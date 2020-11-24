import {
  createDirectRelationship,
  createIntegrationEntity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { entities, relationships } from '../constants';
import { getTeamKey } from './teams';

export function getProjectKey(id: number): string {
  return `checkmarx_project:${id}`;
}

export async function fetchProjects({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await apiClient.iterateProjects(async (project) => {
    const jobs: Promise<any>[] = [];

    const { links, ...projectWithoutLinks } = project;
    const projectEntity = createIntegrationEntity({
      entityData: {
        source: projectWithoutLinks,
        assign: {
          _key: getProjectKey(project.id),
          _type: entities.PROJECT._type,
          _class: entities.PROJECT._class,
          id: `${project.id}`,
          name: project.name,
          isPublic: project.isPublic,
          webLink: `https://${instance.config.instanceHostname}.checkmarx.net/CxWebClient/projectscans.aspx?id=${project.id}`,
        },
      },
    });

    jobs.push(jobState.addEntity(projectEntity));

    const teamEntity = await jobState.findEntity(getTeamKey(project.teamId));
    if (teamEntity) {
      jobs.push(
        jobState.addRelationship(
          createDirectRelationship({
            _class: RelationshipClass.HAS,
            from: teamEntity,
            to: projectEntity,
          }),
        ),
      );
    }

    await Promise.all(jobs);
  });
}

export const projectSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-projects',
    name: 'Fetch Projects',
    entities: [entities.PROJECT],
    relationships: [relationships.TEAM_HAS_PROJECT],
    dependsOn: ['fetch-teams'],
    executionHandler: fetchProjects,
  },
];

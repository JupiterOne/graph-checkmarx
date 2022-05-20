import {
  createDirectRelationship,
  createIntegrationEntity,
  createMappedRelationship,
  Entity,
  IntegrationLogger,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
  RelationshipDirection,
} from '@jupiterone/integration-sdk-core';

import { APIClient, createAPIClient } from '../client';
import { CheckmarxProject, IntegrationConfig } from '../types';
import { entities, mappedRelationships, relationships } from '../constants';
import { getTeamKey } from './teams';
import gitUrlParse from 'git-url-parse';

export function getProjectKey(id: number): string {
  return `checkmarx_project:${id}`;
}

async function getProjectRemoteSettings(
  logger: IntegrationLogger,
  apiClient: APIClient,
  project: CheckmarxProject,
) {
  const sourceSettingsLinkUri = project.sourceSettingsLink?.uri;

  try {
    return sourceSettingsLinkUri
      ? await apiClient.getProjectRemoteSettings(sourceSettingsLinkUri)
      : undefined;
  } catch (err) {
    logger.info(
      {
        err,
        projectId: project.id,
        sourceSettingsLinkUri,
      },
      'Failed to fetch project remote settings',
    );
    return undefined;
  }
}

function buildProjectRepoMappedRelationship(projectEntity: Entity) {
  const remoteSettingsLinkType = projectEntity.remoteSettingsLinkType;
  const remoteSettingsUrl = projectEntity.remoteSettingsUrl as
    | string
    | undefined;

  // Currently only `git` is supported.
  if (remoteSettingsLinkType !== 'git' || !remoteSettingsUrl) return;

  // We need to handle the case of HTTP vs. SSH git URLs. Consider the two
  // following examples:
  //
  // `https://github.com/OWASP/NodeGoat.git`
  // `git@github.com:OWASP/NodeGoat.git`
  const parsedGitUrl = gitUrlParse(remoteSettingsUrl);
  if (!parsedGitUrl.owner || !parsedGitUrl.name) return undefined;

  return createMappedRelationship({
    _class: RelationshipClass.USES,
    _type: relationships.PROJECT_REPO._type,
    _mapping: {
      relationshipDirection: RelationshipDirection.FORWARD,
      sourceEntityKey: projectEntity._key,
      targetFilterKeys: [['_class', 'name', 'owner']],
      targetEntity: {
        _class: 'CodeRepo',
        name: parsedGitUrl.name.toLowerCase(),
        owner: parsedGitUrl.owner.toLowerCase(),
      },
      skipTargetCreation: true,
    },
  });
}

export async function fetchProjects({
  instance,
  jobState,
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await apiClient.iterateProjects(async (project) => {
    const jobs: Promise<any>[] = [];

    const projectRemoteSettings = await getProjectRemoteSettings(
      logger,
      apiClient,
      project,
    );

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
          public: project.isPublic === true,
          remoteSettingsLinkType: project.sourceSettingsLink?.type, // e.g. `git`
          remoteSettingsUrl: projectRemoteSettings?.url,
          remoteSettingsBranch: projectRemoteSettings?.branch,
          remoteSettingsUseSsh: projectRemoteSettings?.useSsh,
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

    const projectRepoMappedRelationship = buildProjectRepoMappedRelationship(
      projectEntity,
    );

    if (projectRepoMappedRelationship) {
      await jobState.addRelationship(projectRepoMappedRelationship);
    }
  });
}

export const projectSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-projects',
    name: 'Fetch Projects',
    entities: [entities.PROJECT],
    relationships: [relationships.TEAM_HAS_PROJECT],
    mappedRelationships: [mappedRelationships.PROJECT_REPO],
    dependsOn: ['fetch-teams'],
    executionHandler: fetchProjects,
  },
];

import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { ACCOUNT_ENTITY_DATA_KEY, entities, relationships } from '../constants';

export function getTeamKey(id: number): string {
  return `checkmarx_team:${id}`;
}

export async function fetchTeams({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  await apiClient.iterateTeams(async (team) => {
    const teamEntity = createIntegrationEntity({
      entityData: {
        source: team,
        assign: {
          _key: getTeamKey(team.id),
          _type: entities.TEAM._type,
          _class: entities.TEAM._class,
          id: `${team.id}`,
          name: team.name,
        },
      },
    });

    await Promise.all([
      jobState.addEntity(teamEntity),
      jobState.addRelationship(
        createDirectRelationship({
          _class: RelationshipClass.HAS,
          from: accountEntity,
          to: teamEntity,
        }),
      ),
    ]);
  });
}

export const teamSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-teams',
    name: 'Fetch Teams',
    entities: [entities.TEAM],
    relationships: [relationships.ACCOUNT_HAS_TEAM],
    dependsOn: ['fetch-account'],
    executionHandler: fetchTeams,
  },
];

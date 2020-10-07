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
import { entities, relationships, SERVICE_ENTITY_DATA_KEY } from '../constants';

export function getScanKey(id: number): string {
  return `checkmarx_scan:${id}`;
}

export async function fetchProjectScans({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const serviceEntity = (await jobState.getData(
    SERVICE_ENTITY_DATA_KEY,
  )) as Entity;

  await jobState.iterateEntities(
    { _type: entities.PROJECT._type },
    async (projectEntity) => {
      await apiClient.iterateProjectScans(
        projectEntity.id as string,
        async (scan) => {
          const scanEntity = createIntegrationEntity({
            entityData: {
              source: scan,
              assign: {
                _key: getScanKey(scan.id),
                _type: entities.ASSESSMENT._type,
                _class: entities.ASSESSMENT._class,
                id: `${scan.id}`,
                name: `${scan.id}`,
                category: 'Vulnerability Scan',
                summary: scan.scanType.value,
                internal: !scan.isPublic,
                status: scan.status.name,
                isPublic: scan.isPublic,
                isLocked: scan.isLocked,
                scanRisk: scan.scanRisk,
                scanRiskSeverity: scan.scanRiskSeverity,
              },
            },
          });

          await Promise.all([
            jobState.addEntity(scanEntity),
            jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.HAS,
                from: projectEntity,
                to: scanEntity,
              }),
            ),
            jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.PERFORMED,
                from: serviceEntity,
                to: scanEntity,
              }),
            ),
          ]);
        },
      );
    },
  );
}

export const projectScanSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-project-scans',
    name: 'Fetch Project Scans',
    entities: [entities.ASSESSMENT],
    relationships: [
      relationships.PROJECT_HAS_ASSESSMENT,
      relationships.SERVICE_PERFORMED_ASSESSMENT,
    ],
    dependsOn: ['fetch-projects'],
    executionHandler: fetchProjectScans,
  },
];

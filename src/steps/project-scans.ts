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
  logger,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const serviceEntity = (await jobState.getData(
    SERVICE_ENTITY_DATA_KEY,
  )) as Entity;

  await jobState.iterateEntities(
    { _type: entities.PROJECT._type },
    async (projectEntity) => {
      const lastScan = await apiClient.fetchProjectLastScan(
        projectEntity.id as string,
      );

      if (lastScan) {
        logger.info(
          { lastScan },
          `The last scan for project ${projectEntity.name} - ${projectEntity.id}`,
        );

        if (
          lastScan.status.name !== 'Finished' ||
          lastScan.scanType.value !== 'Regular'
        ) {
          return;
        }

        const scanEntity = createIntegrationEntity({
          entityData: {
            source: lastScan,
            assign: {
              _key: getScanKey(lastScan.id),
              _type: entities.ASSESSMENT._type,
              _class: entities.ASSESSMENT._class,
              id: `${lastScan.id}`,
              name: `${lastScan.id}`,
              category: 'Vulnerability Scan',
              project: lastScan.project.name,
              summary: lastScan.scanType.value,
              internal: !lastScan.isPublic,
              status: lastScan.status.name,
              isPublic: lastScan.isPublic,
              isLocked: lastScan.isLocked,
              scanRisk: lastScan.scanRisk,
              scanRiskSeverity: lastScan.scanRiskSeverity,
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
      }
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

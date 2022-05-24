import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  JobState,
  parseTimePropertyValue,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { APIClient, createAPIClient } from '../client';
import { CheckmarxScan, IntegrationConfig } from '../types';
import { entities, relationships, SERVICE_ENTITY_DATA_KEY } from '../constants';

export function getScanKey(id: number): string {
  return `checkmarx_scan:${id}`;
}

function shouldFetchLastSuccessfulScan(latestScan: CheckmarxScan) {
  return (
    latestScan.status?.name === 'Failed' ||
    latestScan.status?.name === 'Canceled'
  );
}

type GetLatestScanData = {
  latestScan: CheckmarxScan | undefined;
  latestSuccessfulScan?: CheckmarxScan | undefined;
};

/**
 * Returns the last successful scan and the last failed scan if the last scan
 * failed
 */
async function getScanDataForProject(
  projectId: string,
  apiClient: APIClient,
): Promise<GetLatestScanData> {
  const latestScan = await apiClient.fetchProjectLastScan(projectId);

  if (!latestScan || !shouldFetchLastSuccessfulScan(latestScan)) {
    return {
      latestScan,
      latestSuccessfulScan: undefined,
    };
  }

  const latestSuccessfulScan = await apiClient.fetchLastSuccessfulScan(
    projectId,
  );

  return {
    latestScan,
    latestSuccessfulScan,
  };
}

function calculateScanDuration({
  scanStartedOn,
  scanFinishedOn,
}: {
  scanStartedOn?: number;
  scanFinishedOn?: number;
}): number | undefined {
  if (
    typeof scanStartedOn === 'undefined' ||
    typeof scanFinishedOn === 'undefined'
  ) {
    return undefined;
  }

  return scanFinishedOn - scanStartedOn;
}

async function createScanGraphData({
  jobState,
  scan,
  projectEntity,
  serviceEntity,
}: {
  jobState: JobState;
  scan: CheckmarxScan;
  projectEntity: Entity;
  serviceEntity: Entity;
}) {
  const scanStartedOn = parseTimePropertyValue(scan.dateAndTime?.startedOn);
  const scanFinishedOn = parseTimePropertyValue(scan.dateAndTime?.finishedOn);

  const scanEntity = await jobState.addEntity(
    createIntegrationEntity({
      entityData: {
        source: scan,
        assign: {
          _key: getScanKey(scan.id),
          _type: entities.ASSESSMENT._type,
          _class: entities.ASSESSMENT._class,
          id: `${scan.id}`,
          name: `${scan.id}`,
          category: 'Vulnerability Scan',
          project: scan.project.name,
          summary: scan.scanType.value,
          internal: !scan.isPublic,
          status: scan.status.name,
          isPublic: scan.isPublic,
          isLocked: scan.isLocked,
          scanRisk: scan.scanRisk,
          scanRiskSeverity: scan.scanRiskSeverity,
          startedOn: scanStartedOn,
          completedOn: scanFinishedOn,
          scanDuration: calculateScanDuration({
            scanStartedOn,
            scanFinishedOn,
          }),
          createdOn: scanStartedOn,
        },
      },
    }),
  );

  await jobState.addRelationship(
    createDirectRelationship({
      _class: RelationshipClass.HAS,
      from: projectEntity,
      to: scanEntity,
    }),
  );

  await jobState.addRelationship(
    createDirectRelationship({
      _class: RelationshipClass.PERFORMED,
      from: serviceEntity,
      to: scanEntity,
    }),
  );
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
      const { latestScan, latestSuccessfulScan } = await getScanDataForProject(
        projectEntity.id as string,
        apiClient,
      );

      if (latestSuccessfulScan) {
        logger.info(
          {
            projectId: projectEntity.id,
            latestScan: latestScan?.id,
            latestSuccessfulScan: latestSuccessfulScan.id,
          },
          'Found an old successful scan',
        );
      }

      for (const scan of [latestScan, latestSuccessfulScan]) {
        if (!scan) continue;

        logger.debug(
          {
            scan,
            projectName: projectEntity.name,
            projectId: projectEntity.id,
          },
          `The last project scan`,
        );

        await createScanGraphData({
          jobState,
          projectEntity,
          serviceEntity,
          scan,
        });
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

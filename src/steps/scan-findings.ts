import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationError,
  IntegrationStep,
  IntegrationStepExecutionContext,
  parseTimePropertyValue,
  RelationshipClass,
  UNEXPECTED_ERROR_CODE,
} from '@jupiterone/integration-sdk-core';
import querystring from 'querystring';
import { createAPIClient } from '../client';
import { IntegrationConfig } from '../types';
import { entities, relationships } from '../constants';
import PQueue from 'p-queue';

export function getFindingKey(link: string): string {
  return `checkmarx_finding:${link}`;
}

const SEVERITY_MAPPINGS = {
  none: 0,
  informational: 1,
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

function getNumericSeverity(severity: string): number {
  const normalizedSeverity = severity.toLowerCase();

  return (
    SEVERITY_MAPPINGS[normalizedSeverity] || SEVERITY_MAPPINGS['informational']
  );
}

function verifyAndSortIdComponents(link: string) {
  const dividedLink = link.split('?');
  const params = dividedLink[1];
  const parsedParams = querystring.parse(params);

  const wantedKeys = ['scanid', 'projectid', 'pathid'];
  const presentKeys = Object.keys(parsedParams);
  const missingKeys = wantedKeys.filter((item) => !presentKeys.includes(item));

  // Case: some param is missing
  if (missingKeys.length > 0) {
    throw new IntegrationError({
      message: `Finding with values missing found. Integration wasn't able to create findingKey because the following keys were missing: ${missingKeys.join(
        ', ',
      )}.`,
      code: UNEXPECTED_ERROR_CODE,
    });
  }

  return `projectid=${parsedParams['projectid']}&scanid=${parsedParams['scanid']}&pathid=${parsedParams['pathid']}`;
}

export async function fetchScanFindings({
  logger,
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  const reportProcessingQueue = new PQueue({
    concurrency: 3,
  });

  const fetchAndProcessFindings = async (scanEntity: Entity) => {
    const scanFindings = await apiClient.fetchScanReport(
      scanEntity.id as string,
      {
        onCsvParseError(scanId, reportId, err) {
          logger.warn(
            { err, scanId, reportId },
            'Failed to parse scan report CSV',
          );
        },
        onObtainReportError(scanId, totalWaitSeconds) {
          logger.warn(
            { scanId },
            'Failed to obtain scan report within %i seconds',
            totalWaitSeconds,
          );
        },
      },
    );

    if (scanFindings) {
      for (const finding of scanFindings) {
        const findingEntity = createIntegrationEntity({
          entityData: {
            source: finding,
            assign: {
              _key: getFindingKey(verifyAndSortIdComponents(finding.Link)),
              _type: entities.FINDING._type,
              _class: entities.FINDING._class,
              id: `${finding.Link}`,
              name: `${finding.Query}`,
              category: 'sast-scan',
              severity: finding['Result Severity'],
              resultState: finding['Result State'],
              resultStatus: finding['Result Status'],
              numericSeverity: getNumericSeverity(finding['Result Severity']),
              open: true,
              webLink: finding.Link,
              createdOn: parseTimePropertyValue(finding['Detection Date']),
              targets: [`${scanEntity.project}`],
            },
          },
        });

        await Promise.all([
          jobState.addEntity(findingEntity),
          jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.IDENTIFIED,
              from: scanEntity,
              to: findingEntity,
            }),
          ),
        ]);
      }
    }
  };

  await jobState.iterateEntities(
    { _type: entities.ASSESSMENT._type },
    (scanEntity) => {
      /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
      reportProcessingQueue.add(async () => {
        await fetchAndProcessFindings(scanEntity);
      });
    },
  );

  await reportProcessingQueue.onIdle();
}

export const scanFindingsSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-scan-findings',
    name: 'Fetch Scan Findings',
    entities: [entities.FINDING],
    relationships: [relationships.ASSESSMENT_IDENTIFIED_FINDING],
    dependsOn: ['fetch-project-scans'],
    executionHandler: fetchScanFindings,
  },
];

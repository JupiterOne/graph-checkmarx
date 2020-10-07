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

export function getFindingKey(link: string): string {
  return `checkmarx_finding:${link}`;
}

function getNumericSeverity(severity: string): number {
  switch (severity.toLowerCase()) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
  }
  return 0;
}

export async function fetchScanFindings({
  instance,
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const apiClient = createAPIClient(instance.config);

  await jobState.iterateEntities(
    { _type: entities.ASSESSMENT._type },
    async (scanEntity) => {
      if (scanEntity.status !== 'Failed') {
        const scanFindings = await apiClient.fetchScanReport(
          scanEntity.id as string,
        );

        if (scanFindings) {
          for (const finding of scanFindings) {
            const findingEntity = createIntegrationEntity({
              entityData: {
                source: finding,
                assign: {
                  _key: getFindingKey(finding.Link),
                  _type: entities.FINDING._type,
                  _class: entities.FINDING._class,
                  id: `${finding.Link}`,
                  name: `${finding.Query}`,
                  category: 'software',
                  severity: finding['Result Severity'],
                  numericSeverity: getNumericSeverity(
                    finding['Result Severity'],
                  ),
                  open: true,
                  webLink: finding.Link,
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
      }
    },
  );
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

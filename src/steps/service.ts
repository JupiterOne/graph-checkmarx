import {
  createDirectRelationship,
  createIntegrationEntity,
  Entity,
  IntegrationStep,
  IntegrationStepExecutionContext,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';

import { IntegrationConfig } from '../types';
import {
  entities,
  ACCOUNT_ENTITY_DATA_KEY,
  SERVICE_ENTITY_DATA_KEY,
  relationships,
} from '../constants';

export function getServicetKey(name: string): string {
  return `checkmarx_dast_scanner:${name}`;
}

export async function fetchServiceDetails({
  jobState,
}: IntegrationStepExecutionContext<IntegrationConfig>) {
  const accountEntity = (await jobState.getData(
    ACCOUNT_ENTITY_DATA_KEY,
  )) as Entity;

  const service = {
    name: 'Checkmarx DAST',
  };

  const serviceEntity = createIntegrationEntity({
    entityData: {
      source: service,
      assign: {
        _key: getServicetKey(service.name),
        _type: entities.SERVICE._type,
        _class: entities.SERVICE._class,
        name: service.name,
        displayName: service.name,
        category: ['software', 'other'],
        function: 'DAST',
      },
    },
  });

  await Promise.all([
    jobState.addEntity(serviceEntity),
    jobState.setData(SERVICE_ENTITY_DATA_KEY, serviceEntity),
    jobState.addRelationship(
      createDirectRelationship({
        _class: RelationshipClass.HAS,
        from: accountEntity,
        to: serviceEntity,
      }),
    ),
  ]);
}

export const serviceSteps: IntegrationStep<IntegrationConfig>[] = [
  {
    id: 'fetch-service',
    name: 'Fetch Service Details',
    entities: [entities.SERVICE],
    relationships: [relationships.ACCOUNT_HAS_SERVICE],
    dependsOn: ['fetch-account'],
    executionHandler: fetchServiceDetails,
  },
];

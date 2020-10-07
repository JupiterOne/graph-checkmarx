import {
  RelationshipClass,
  StepEntityMetadata,
  StepRelationshipMetadata,
} from '@jupiterone/integration-sdk-core';

export const ACCOUNT_ENTITY_DATA_KEY = 'entity:account';
export const SERVICE_ENTITY_DATA_KEY = 'entity:service';

type EntityConstantKeys =
  | 'ACCOUNT'
  | 'SERVICE'
  | 'TEAM'
  | 'PROJECT'
  | 'ASSESSMENT'
  | 'FINDING';

export const entities: Record<EntityConstantKeys, StepEntityMetadata> = {
  ACCOUNT: {
    resourceName: 'Account',
    _type: 'checkmarx_account',
    _class: 'Account',
  },
  SERVICE: {
    resourceName: 'Service',
    _type: 'checkmarx_dast_scanner',
    _class: 'Service',
  },
  TEAM: {
    resourceName: 'Team',
    _type: 'checkmarx_team',
    _class: 'Team',
  },
  PROJECT: {
    resourceName: 'Project',
    _type: 'checkmarx_project',
    _class: 'Project',
  },
  ASSESSMENT: {
    resourceName: 'Assessment',
    _type: 'checkmarx_scan',
    _class: 'Assessment',
  },
  FINDING: {
    resourceName: 'Finding',
    _type: 'checkmarx_finding',
    _class: 'Finding',
  },
};

type RelationshipConstantKeys =
  | 'ACCOUNT_HAS_SERVICE'
  | 'ACCOUNT_HAS_TEAM'
  | 'TEAM_HAS_PROJECT'
  | 'SERVICE_PERFORMED_ASSESSMENT'
  | 'PROJECT_HAS_ASSESSMENT'
  | 'ASSESSMENT_IDENTIFIED_FINDING';

export const relationships: Record<
  RelationshipConstantKeys,
  StepRelationshipMetadata
> = {
  ACCOUNT_HAS_SERVICE: {
    _type: 'checkmarx_account_has_dast_scanner',
    _class: RelationshipClass.HAS,
    sourceType: entities.ACCOUNT._type,
    targetType: entities.SERVICE._type,
  },
  ACCOUNT_HAS_TEAM: {
    _type: 'checkmarx_account_has_team',
    _class: RelationshipClass.HAS,
    sourceType: entities.ACCOUNT._type,
    targetType: entities.TEAM._type,
  },
  TEAM_HAS_PROJECT: {
    _type: 'checkmarx_team_has_project',
    _class: RelationshipClass.HAS,
    sourceType: entities.TEAM._type,
    targetType: entities.PROJECT._type,
  },
  SERVICE_PERFORMED_ASSESSMENT: {
    _type: 'checkmarx_dast_scanner_performed_scan',
    _class: RelationshipClass.PERFORMED,
    sourceType: entities.SERVICE._type,
    targetType: entities.ASSESSMENT._type,
  },
  PROJECT_HAS_ASSESSMENT: {
    _type: 'checkmarx_project_has_scan',
    _class: RelationshipClass.HAS,
    sourceType: entities.PROJECT._type,
    targetType: entities.ASSESSMENT._type,
  },
  ASSESSMENT_IDENTIFIED_FINDING: {
    _type: 'checkmarx_scan_identified_finding',
    _class: RelationshipClass.IDENTIFIED,
    sourceType: entities.ASSESSMENT._type,
    targetType: entities.FINDING._type,
  },
};

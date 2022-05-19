import { IntegrationInstanceConfig } from '@jupiterone/integration-sdk-core';

/**
 * Properties provided by the `IntegrationInstance.config`. This reflects the
 * same properties defined by `instanceConfigFields`.
 */
export interface IntegrationConfig extends IntegrationInstanceConfig {
  /**
   * The hostname of the Checkmarx instance.
   */
  instanceHostname: string;

  /**
   * The administrator account username for authentication.
   */
  clientUsername: string;

  /**
   * The administrator account password for authentication.
   */
  clientPassword: string;
}

export type CheckmarxTeam = {
  id: number;
  parentId: number;
  name: string;
  fullName: string;
};

export type CheckmarxProject = {
  id: number;
  teamId: number;
  name: string;
  isPublic: boolean;
  sourceSettingsLink: {
    type: string;
    rel: string;
    uri?: string | null;
  };
  links: any[];
};

export type CheckmarxScan = {
  id: number;
  project: {
    id: number;
    name: string;
    link?: string;
  };
  status: {
    id: number;
    name: string;
    details: {
      stage: string;
      step: string;
    };
  };
  scanType: {
    id: number;
    value: string;
  };
  comment: string;
  dateAndTime: {
    startedOn: string;
    finishedOn: string;
    engineStartedOn: string;
    engineFinishedOn: string;
  };
  resultsStatistics: {
    link?: string;
  };
  scanState: {
    path: string;
    sourceId: string;
    filesCount: number;
    linesOfCode: number;
    failedLinesOfCode: number;
    cxVersion: string;
    languageStateCollection: [
      {
        languageID: number;
        languageName: string;
        languageHash: string;
        stateCreationDate: string;
      },
    ];
  };
  owner: string;
  origin: string;
  initiatorName: string;
  owningTeamId: number;
  isPublic: boolean;
  isLocked: boolean;
  isIncremental: boolean;
  scanRisk: number;
  scanRiskSeverity: number;
  engineServer: {
    id: number;
    name: string;
    link?: string;
  };
  finishedScanStatus: {
    id: number;
    value: string;
  };
  partialScanReasons?: string;
};

export type CheckmarxGeneratedReport = {
  reportId: number;
};

export type CheckmarxReportStatus = {
  status: {
    id: number;
    value: string;
  };
};

export type CheckmarxReportItem = {
  Query: string;
  QueryPath: string;
  Custom: any;
  SrcFileName: string;
  Line: string;
  Column: string;
  NodeId: string;
  Name: string;
  DestFileName: string;
  DestLine: string;
  DestColumn: string;
  DestNodeId: string;
  DestName: string;
  'Result State': string;
  'Result Severity': string;
  'Assigned To': string;
  Comment: string;
  Link: string;
  'Result Status': string;
};

export type CheckmarxReport = CheckmarxReportItem[];

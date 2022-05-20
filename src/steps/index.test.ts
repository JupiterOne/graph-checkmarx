import {
  createMockStepExecutionContext,
  Recording,
} from '@jupiterone/integration-sdk-testing';

import { IntegrationConfig } from '../types';
import { fetchAccountDetails } from './account';
import { fetchServiceDetails } from './service';
import { fetchTeams } from './teams';
import { fetchProjects } from './projects';
import { fetchProjectScans } from './project-scans';
import { fetchScanFindings } from './scan-findings';
import { setupCheckmarxRecording } from '../../test/recording';

const DEFAULT_INSTANCE_HOSTNAME = 'partners9x';
const DEFAULT_CLIENT_USERNAME = 'INVALID';
const DEFAULT_CLIENT_PASSWORD = 'INVALID';

const integrationConfig: IntegrationConfig = {
  instanceHostname: process.env.INSTANCE_HOSTNAME || DEFAULT_INSTANCE_HOSTNAME,
  clientUsername: process.env.CLIENT_USERNAME || DEFAULT_CLIENT_USERNAME,
  clientPassword: process.env.CLIENT_PASSWORD || DEFAULT_CLIENT_PASSWORD,
};

jest.setTimeout(60 * 1000);

describe('Checkmarx', () => {
  let recording: Recording;

  beforeEach(() => {
    recording = setupCheckmarxRecording({
      directory: __dirname,
      name: 'checkmarx_recordings',
      options: {
        recordFailedRequests: true,
      },
    });
  });

  afterEach(async () => {
    await recording.stop();
  });

  test('should collect data', async () => {
    const context = createMockStepExecutionContext<IntegrationConfig>({
      instanceConfig: integrationConfig,
    });

    // Simulates dependency graph execution.
    // See https://github.com/JupiterOne/sdk/issues/262.
    await fetchAccountDetails(context);
    await fetchServiceDetails(context);
    await fetchTeams(context);
    await fetchProjects(context);
    await fetchProjectScans(context);
    await fetchScanFindings(context);

    // Review snapshot, failure is a regression
    expect({
      numCollectedEntities: context.jobState.collectedEntities.length,
      numCollectedRelationships: context.jobState.collectedRelationships.length,
      collectedEntities: context.jobState.collectedEntities.map((e) => ({
        ...e,
        // HACK (austinkelleher): It looks like the formatting that Checkmarkx
        // uses does not include the timezone and it's causing issues with tests
        //
        // See a failing SDK test here: https://github.com/JupiterOne/sdk/commit/d88453dbf87e04802b6e81a398123b10e1a344f0#diff-eb9509d3689a5d1dde0aaf6a4f037d78ee0c178b48400ccc3249d8b84f726328R155
        createdOn: 123456789,
      })),
      collectedRelationships: context.jobState.collectedRelationships,
      encounteredTypes: context.jobState.encounteredTypes,
    }).toMatchSnapshot();

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Account'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Account'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_account' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          displayName: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Service'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Service'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_dast_scanner' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          name: {
            type: 'string',
          },
          displayName: {
            type: 'string',
          },
          category: {
            type: 'array',
          },
          function: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Team'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Team'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_team' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Project'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Project'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_project' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          isPublic: {
            type: 'boolean',
          },
          public: {
            type: 'boolean',
          },
          remoteSettingsLinkType: { type: 'string' },
          remoteSettingsUrl: { type: 'string' },
          remoteSettingsBranch: { type: 'string' },
          remoteSettingsUseSsh: { type: 'boolean' },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Assessment'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Assessment'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_scan' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          project: {
            type: 'string',
          },
          summary: {
            type: 'string',
          },
          internal: {
            type: 'boolean',
          },
          status: {
            type: 'string',
          },
          isPublic: {
            type: 'boolean',
          },
          isLocked: {
            type: 'boolean',
          },
          scanRisk: {
            type: 'number',
          },
          scanRiskSeverity: {
            type: 'number',
          },
        },
      },
    });

    expect(
      context.jobState.collectedEntities.filter((e) =>
        e._class.includes('Finding'),
      ),
    ).toMatchGraphObjectSchema({
      _class: ['Finding'],
      schema: {
        additionalProperties: true,
        properties: {
          _type: { const: 'checkmarx_finding' },
          _rawData: {
            type: 'array',
            items: { type: 'object' },
          },
          id: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          category: {
            type: 'string',
          },
          severity: {
            type: 'string',
          },
          numericSeverity: {
            type: 'number',
          },
          open: {
            type: 'boolean',
          },
          webLink: {
            type: 'string',
          },
        },
      },
    });
  });
});

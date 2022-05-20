import fetch, { Response } from 'node-fetch';
import * as qs from 'querystring';
import { IntegrationProviderAuthenticationError } from '@jupiterone/integration-sdk-core';
import parse from 'csv-parse';
import util from 'util';

const parseAsync = util.promisify((data, options, cb) =>
  parse(data, options, (err, result) => cb(err, result)),
);

import {
  CheckmarxProject,
  CheckmarxScan,
  CheckmarxTeam,
  IntegrationConfig,
  CheckmarxGeneratedReport,
  CheckmarxReportStatus,
  CheckmarxReport,
} from './types';

export type ResourceIteratee<T> = (each: T) => Promise<void> | void;

export class APIClient {
  private readonly instanceHostname: string;
  private readonly clientUsername: string;
  private readonly clientPassword: string;
  /*
    Explanation: the reason this accessToken variable is static class variable
    is that we don't want each step function's run to request the same (new) token
    every time. This way, once accessToken value is fetched, it's shared between
    all the step functions.
  */
  private static accessToken: string;

  constructor(readonly config: IntegrationConfig) {
    this.instanceHostname = config.instanceHostname;
    this.clientUsername = config.clientUsername;
    this.clientPassword = config.clientPassword;
  }

  private withBaseUri(path: string): string {
    return `https://${this.instanceHostname}.checkmarx.net/cxrestapi/${path}`;
  }

  private async request(
    uri: string,
    method: 'GET' | 'POST' | 'HEAD' = 'GET',
    body?: any,
  ): Promise<Response> {
    if (!APIClient.accessToken) {
      await this.getAuthenticationToken();
    }

    return await fetch(uri, {
      method,
      headers: {
        Accept: 'application/json;v=1.0',
        Authorization: `Bearer ${APIClient.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body || null,
    });
  }

  private async getAuthenticationToken() {
    const getAuthTokenEndpoint = this.withBaseUri(
      'auth/identity/connect/token',
    );
    const response = await fetch(getAuthTokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: qs.stringify({
        username: this.clientUsername,
        password: this.clientPassword,
        grant_type: 'password',
        scope: 'sast_rest_api',
        client_id: 'resource_owner_client',
        // The secret is given by Checkmarx's API
        // https://checkmarx.atlassian.net/wiki/spaces/KC/pages/1187774721/Using+the+CxSAST+REST+API+v8.6.0+and+up
        client_secret: '014DF517-39D1-4453-B7B3-9930C563627C',
      }),
    });

    try {
      const body = await response.json();
      APIClient.accessToken = body.access_token;
    } catch (e) {
      throw new IntegrationProviderAuthenticationError({
        cause: new Error('Provider authentication failed'),
        endpoint: getAuthTokenEndpoint,
        status: response.status,
        statusText: response.statusText,
      });
    }
  }

  public async verifyAuthentication(): Promise<void> {
    if (!APIClient.accessToken) {
      await this.getAuthenticationToken();
    }

    const projectsApiRoute = this.withBaseUri('projects');
    const response = await this.request(projectsApiRoute);

    if (!response.ok) {
      throw new IntegrationProviderAuthenticationError({
        cause: new Error('Provider authentication failed'),
        endpoint: projectsApiRoute,
        status: response.status,
        statusText: response.statusText,
      });
    }
  }

  /**
   * Iterates each project resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateProjects(
    iteratee: ResourceIteratee<CheckmarxProject>,
  ): Promise<void> {
    const response = await this.request(this.withBaseUri('projects'));
    const projects: CheckmarxProject[] = await response.json();

    for (const project of projects) {
      await iteratee(project);
    }
  }

  async getProjectRemoteSettings(
    /**
     * Pulled from the project raw data at path `project.sourceSettingsLink.uri`
     *
     * Ex: `/projects/466/sourceCode/remoteSettings/git`
     */
    sourceSettingsLinkUri: string,
  ): Promise<any> {
    const response = await this.request(
      this.withBaseUri(sourceSettingsLinkUri),
    );

    if (response.status === 404) return undefined;
    const settings = await response.json();
    return settings;
  }

  /**
   * Iterates each team resource in the provider.
   *
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateTeams(
    iteratee: ResourceIteratee<CheckmarxTeam>,
  ): Promise<void> {
    const response = await this.request(this.withBaseUri('auth/teams'));
    const teams: CheckmarxTeam[] = await response.json();

    for (const team of teams) {
      await iteratee(team);
    }
  }

  /**
   * Fetches last scan for a given project.
   *
   * @param projectId the ID of the project
   */
  public async fetchProjectLastScan(
    projectId: string,
  ): Promise<CheckmarxScan | null> {
    const response = await this.request(
      this.withBaseUri(`sast/scans?projectId=${projectId}&last=1`),
    );

    const scans: CheckmarxScan[] = await response.json();
    if (scans.length <= 0) {
      return null;
    }

    const scan: CheckmarxScan = scans[0];

    return scan;
  }

  /**
   * Fetches and returns scan report for a given scan ID.
   *
   * @param projectId the ID of the project
   * @param options (optional) error handling callbacks
   */
  public async fetchScanReport(
    scanId: string,
    options?: {
      onCsvParseError?: (scanId: string, reportId: string, err: Error) => void;
      onObtainReportError?: (scanId: string, totalWaitSeconds: number) => void;
    },
  ): Promise<CheckmarxReport | null> {
    const response = await this.request(
      this.withBaseUri(`reports/sastScan`),
      'POST',
      JSON.stringify({
        reportType: 'CSV',
        scanId: parseInt(scanId, 10),
      }),
    );

    const { reportId }: CheckmarxGeneratedReport = await response.json();

    const waitTime = 1500;
    const maxLoops = 5;
    let loop = 0;

    while (loop++ < maxLoops) {
      const statusResponse = await this.request(
        this.withBaseUri(`reports/sastScan/${reportId}/status`),
      );

      if (statusResponse.ok) {
        const { status }: CheckmarxReportStatus = await statusResponse.json();

        if (status.value === 'Created') {
          const reportResponse = await this.request(
            this.withBaseUri(`reports/sastScan/${reportId}`),
          );

          const reportBody: string = await reportResponse.text();

          try {
            const csvObject = (await parseAsync(reportBody.trim(), {
              columns: true,
            })) as CheckmarxReport;
            return csvObject;
          } catch (err) {
            options?.onCsvParseError?.(scanId, `${reportId}`, err);
            return null;
          }
        } else if (status.value === 'Failed') {
          return null;
        }
      }

      await sleep(waitTime);
    }

    const totalWaitSeconds = (loop * waitTime) / 1000;
    options?.onObtainReportError?.(scanId, totalWaitSeconds);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}

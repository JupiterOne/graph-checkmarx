import fetch, { Response } from 'node-fetch';
import * as qs from 'qs';
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
   * Iterates each scan resource for a given project.
   *
   * @param projectId the ID of the project
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async iterateProjectScans(
    projectId: string,
    iteratee: ResourceIteratee<CheckmarxScan>,
  ): Promise<void> {
    const response = await this.request(
      this.withBaseUri(`sast/scans?projectId=${projectId}`),
    );
    const scans: CheckmarxScan[] = await response.json();

    for (const scan of scans) {
      await iteratee(scan);
    }
  }

  /**
   * Iterates each scan resource for a given project.
   *
   * @param projectId the ID of the project
   * @param iteratee receives each resource to produce entities/relationships
   */
  public async fetchScanReport(
    scanId: string,
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

    const maxLoops = 5;
    let loop = 0;
    while (loop++ < maxLoops) {
      const statusResponse = await this.request(
        this.withBaseUri(`/reports/sastScan/${reportId}/status`),
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
            console.warn('unable to parse scan report csv', err);
            return null;
          }
        } else if (status.value === 'Failed') {
          return null;
        }
      }

      await sleep(1500);
    }

    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAPIClient(config: IntegrationConfig): APIClient {
  return new APIClient(config);
}

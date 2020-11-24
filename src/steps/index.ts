import { accountSteps } from './account';
import { serviceSteps } from './service';
import { projectSteps } from './projects';
import { teamSteps } from './teams';
import { projectScanSteps } from './project-scans';
import { scanFindingsSteps } from './scan-findings';

const integrationSteps = [
  ...accountSteps,
  ...serviceSteps,
  ...teamSteps,
  ...projectSteps,
  ...projectScanSteps,
  ...scanFindingsSteps,
];

export { integrationSteps };

import { IntegrationInstanceConfigFieldMap } from '@jupiterone/integration-sdk-core';

const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  instanceHostname: {
    type: 'string',
  },
  clientUsername: {
    type: 'string',
  },
  clientPassword: {
    type: 'string',
    mask: true,
  },
};

export default instanceConfigFields;

# Development

This integration focuses on [Checkmarx](https://www.checkmarx.com/) and is using
[Checkmarx API](https://cxprivatecloud.checkmarx.net/cxrestapi/help/swagger/ui/index)
for interacting with the Checkmarx platform.

## Provider account setup

Please contact whomever currently has access to your organization's Checkmarx
account to get credentials.

## Authentication

1. Create a .env file at the root of this project and set the CLIENT_USERNAME
   variable to the admin username that you've set up during the development.

```bash
CLIENT_USERNAME="account username here"
```

2. Set the .env's CLIENT_PASSWORD variable to the admin password that you've set
   up during the development.

```bash
CLIENT_USERNAME="account username here"
CLIENT_PASSWORD="account password here"
```

3. Finally, you also need to set .env's INSTANCE_HOSTNAME variable to your
   workspace name. (https://{workspace-name}.checkmarx.net/).

```bash
INSTANCE_HOSTNAME="workspace name"
INSIGHT_CLIENT_USERNAME="account username here"
INSIGHT_CLIENT_PASSWORD="account password here"
```

After following the above steps, you should now be able to start contributing to
this integration. The integration will pull in the `INSIGHT_CLIENT_USERNAME`,
`INSIGHT_CLIENT_PASSWORD` and `INSTANCE_HOSTNAME` variables from the `.env` file
and use them when making requests.

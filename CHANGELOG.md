# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## 1.5.2 - 2023-08-01

- Pacakge for Collectors

## 1.5.0 - 2022-05-24

- New properties added to entities:

  | Entity           | Properties     |
  | ---------------- | -------------- |
  | `checkmarx_scan` | `startedOn`    |
  | `checkmarx_scan` | `completedOn`  |
  | `checkmarx_scan` | `scanDuration` |
  | `checkmarx_scan` | `createdOn`    |

## 1.4.0 - 2022-05-24

- Always ingest the last successful Checkmarx scan when the latest scan for the
  Checkmarx project was marked as "Failed"

## 1.3.1 - 2022-05-21

- Switch `checkmarx_project` **USES** `CodeRepo` to `SCANS` relationship
  `_class`

## 1.3.0 - 2022-05-20

### Added

- New properties added to entities:

  | Entity              | Properties               |
  | ------------------- | ------------------------ |
  | `checkmarx_project` | `public`                 |
  | `checkmarx_project` | `remoteSettingsLinkType` |
  | `checkmarx_project` | `remoteSettingsUrl`      |
  | `checkmarx_project` | `remoteSettingsBranch`   |
  | `checkmarx_project` | `remoteSettingsUseSsh`   |

- Added support for ingesting the following **new** mapped relationships:

  | Source              | class    | Target     |
  | ------------------- | -------- | ---------- |
  | `checkmarx_project` | **USES** | `CodeRepo` |

## 1.2.0 - 2022-05-13

### Added

- New properties added to entities:

  | Entity              | Properties     |
  | ------------------- | -------------- |
  | `checkmarx_finding` | `resultStatus` |

## 1.1.0 - 2022-05-12

### Added

- New properties added to entities:

  | Entity              | Properties    |
  | ------------------- | ------------- |
  | `checkmarx_finding` | `createdOn`   |
  | `checkmarx_finding` | `resultState` |

## 1.0.1 - 2022-05-05

### Added

- Logging to get more information about a project's scans

## 1.0.0 - 2021-02-15

### Added

- Initial integration

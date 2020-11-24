import {
  Recording,
  RecordingEntry,
  setupRecording,
  SetupRecordingInput,
} from '@jupiterone/integration-sdk-testing';
import isJson from '../../src/utils/isJson';

export function setupCheckmarxRecording(
  input: Omit<SetupRecordingInput, 'mutateEntry'>,
): Recording {
  return setupRecording({
    ...input,
    mutateEntry: mutateRecordingEntry,
  });
}

export function mutateRecordingEntry(entry: RecordingEntry): void {
  const responseText = entry.response.content.text;
  if (!responseText) {
    return;
  }

  // Handle the username & password being visible in
  // postData.text for /auth/identity/connect/token endpoint
  if (
    entry.request.url.includes('/auth/identity/connect/token') &&
    entry.request.postData
  ) {
    entry.request.postData.text = '[REDACTED]';

    if (isJson(responseText)) {
      const responseJson = JSON.parse(responseText);
      entry.response.content.text = JSON.stringify(
        {
          ...responseJson,
          access_token: '[REDACTED]',
        },
        null,
        0,
      );
    }
  }
}

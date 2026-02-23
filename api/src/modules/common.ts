import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import logger from './logger';

type AnyObj = Record<string, any>;

export function checkBody(body: AnyObj, keys: string[]): boolean {
  let isValid = true;

  for (const field of keys) {
    if (!body[field] || body[field] === '') {
      isValid = false;
    }
  }

  return isValid;
}

export function checkBodyReturnMissing(body: AnyObj, keys: string[]) {
  let isValid = true;
  const missingKeys: string[] = [];

  for (const field of keys) {
    if (!body[field] || body[field] === '') {
      isValid = false;
      missingKeys.push(field);
    }
  }

  return { isValid, missingKeys };
}

export function writeRequestArgs(requestBody: AnyObj, fileNameSuffix: string): void {
  const testDir = process.env.PATH_TEST_REQUEST_ARGS;
  if (testDir) {
    try {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .split('T')[1]
        .split('Z')[0];
      const filePath = path.join(testDir, `request_${timestamp}_${fileNameSuffix}.json`);

      fs.writeFileSync(filePath, JSON.stringify(requestBody, null, 2), 'utf8');
      logger.info(`✅ Request arguments saved to: ${filePath}`);
    } catch (err) {
      logger.error('❌ Error writing request arguments file:', err);
    }
  } else {
    logger.warn('⚠️ PATH_TEST_REQUEST_ARGS is not set, skipping request logging.');
  }
}

export function writeResponseDataFromNewsAggregator(
  NewsArticleAggregatorSourceId: number,
  newsApiRequest: AnyObj,
  requestResponseData: AnyObj,
  prefix = false
): void {
  const formattedDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const responseDir = process.env.PATH_TO_API_RESPONSE_JSON_FILES;
  if (!responseDir) {
    logger.warn('⚠️ PATH_TO_API_RESPONSE_JSON_FILES is not set, skipping response write.');
    return;
  }

  const datedDir = path.join(responseDir, formattedDate);

  if (!fs.existsSync(datedDir)) {
    fs.mkdirSync(datedDir, { recursive: true });
  }

  const responseFilename = prefix
    ? `failedToSave_requestId${newsApiRequest.id}_apiId${NewsArticleAggregatorSourceId}.json`
    : `requestId${newsApiRequest.id}_apiId${NewsArticleAggregatorSourceId}.json`;

  const responseFilePath = path.join(datedDir, responseFilename);

  const jsonToStore = { ...requestResponseData };
  if (newsApiRequest.url) {
    jsonToStore.requestUrl = newsApiRequest.url;
  }

  fs.writeFileSync(responseFilePath, JSON.stringify(jsonToStore, null, 2), 'utf-8');
}

export function convertDbUtcDateOrStringToEasternString(input: string | Date): string {
  let dt;

  if (typeof input === 'string') {
    const sanitized = input.trim().replace(' ', 'T').replace(' +', '+');
    dt = DateTime.fromISO(sanitized, { zone: 'utc' });
  } else if (input instanceof Date) {
    dt = DateTime.fromJSDate(input, { zone: 'utc' });
  } else {
    return 'Invalid';
  }

  return dt.setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm');
}

export function getMostRecentEasternFriday(): Date {
  const now = DateTime.now().setZone('America/New_York');
  const daysSinceFriday = (now.weekday + 1) % 7;
  return now.minus({ days: daysSinceFriday }).startOf('day').toJSDate();
}

export function getLastThursdayAt20hInNyTimeZone(): Date {
  const now = DateTime.now().setZone('America/New_York');
  const daysToSubtract = now.weekday >= 5 ? now.weekday - 4 : now.weekday + 3;

  let target = now.minus({ days: daysToSubtract }).set({
    hour: 20,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  if (now.weekday === 4 && now < target) {
    target = target.minus({ days: 7 });
  }

  return target.toJSDate();
}

export function convertJavaScriptDateToTimezoneString(javascriptDate: Date, tzString: string): AnyObj {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: tzString,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(javascriptDate);
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  dateParts.dateString = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;

  return dateParts;
}

export function createJavaScriptExcelDateObjectEastCoasUs(now = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(now);
  const tzName = parts.find((part) => part.type === 'timeZoneName')?.value;
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

  if (tzName === 'EDT') {
    return fourHoursAgo;
  }
  return threeHoursAgo;
}

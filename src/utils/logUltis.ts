import axios from 'axios';
import moment from 'moment';
import { Platform } from 'react-native';
import configs from '../abase/constant/config';

const defaultTimeout = 20000;
const syncRequestLog = axios.create({
  baseURL: configs.logBaseUrl,
  timeout: defaultTimeout,
});

syncRequestLog.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  config.headers['deviceos'] = Platform.OS;
  // config.headers['X-Api-Token'] = generateApiToken(configs.apiAuth);
  config.headers['X-Api-Token'] = configs.apiToken;
  config.headers['Authorization'] = configs.logAuth;

  return config;
});

syncRequestLog.interceptors.response.use(
  response => {
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      console.log(
        `[PERF] ${response.config.url} took ${Date.now() - startTime}ms`,
      );
    }
    return response;
  },
  error => {
    return Promise.reject(error);
  },
);

export type LogRequest = {
  path?: string;
  request?: string;
  header?: string;
  response?: string;
  'user-id'?: number;
  env?: string;
  os?: string;
};

const logQueue: Array<{
  type: 'success' | 'error';
  data: any;
}> = [];
let isProcessing = false;

export const addLogApi = (log: { type: 'success' | 'error'; data: any }) => {
  console.log('addLogApi', {
    type: log.type,
    path: log.data?.config?.url,
  });
  logQueue.push(log);
  processLogQueue().catch(e => console.error(e));
};

const excludeApis = [
  'api/auth/',
  'api/meal-plan',
  'api/walking-workouts',
  'api/household',
  'api/households',
  'Schedule/GetMetroTimetableByStationAndDate',
  'Station/GetAll',
  'Line/GetAll',
  'DanhMuc/GetAllPassengerCategory',
  'Notification/UpdateFCMToken',
  'Tool/GetImages',
  'Notification/GetUnReadNotifications',
  'Tool/GetLongLocalTime',
];

async function processLogQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (logQueue.length > 0) {
    const logEntry = logQueue.shift();
    try {
      let apiLogR: LogRequest = {
        'user-id': 0,
        env: '',
        path: '',
        request: '',
        header: '',
        response: '',
        os: Platform.OS,
      };

      if (logEntry?.type === 'success') {
        if (logEntry.data?.config) {
          apiLogR.path = logEntry.data.config.url || '';
          if (excludeApis.some(p => apiLogR.path?.includes(p))) {
            continue;
          }

          if (apiLogR.path?.includes('Order/CheckOrderStatus')) {
            if (logEntry.data?.data?.data?.orderStatus === 1) {
            } else {
              continue;
            }
          }

          if (logEntry.data.config.headers) {
            const headers = logEntry.data.config.headers || {};
            apiLogR.header = JSON.stringify({
              ...headers,
              Authorization: headers.Authorization
                ? `***${headers.Authorization.slice(-10)}`
                : '',
            });
            apiLogR.env = logEntry.data.config.headers.env;
            apiLogR['user-id'] = logEntry.data.config.headers.passengerId;
          }
          if (logEntry.data.config.data) {
            if (typeof logEntry.data.config.data === 'object') {
              let requestInput = { ...logEntry.data.config.data };
              if (
                apiLogR.path &&
                apiLogR.path.includes('PartnerVneID/NhanThongTinChiaSe')
              ) {
                if (requestInput._parts && Array.isArray(requestInput._parts)) {
                  let requestInput1 = requestInput._parts.filter(
                    (s: any) =>
                      s && Array.isArray(s) && !s.some(k => k === 'FaceImage'),
                  );
                  if (requestInput._parts.length !== requestInput1.length) {
                    requestInput1.push(['FaceImage', '--data--']);
                  }
                  requestInput = requestInput1;
                }
              } else if (
                apiLogR.path &&
                (apiLogR.path.includes('auth-user/login') ||
                  apiLogR.path.includes('auth-user/verify-auth-requet') ||
                  apiLogR.path.includes('ProxyTicketPurchase/verify-on-behalf'))
              ) {
                requestInput.passengerAccountLoginInfo = {
                  ...requestInput.passengerAccountLoginInfo,
                  cccdData: requestInput.passengerAccountLoginInfo?.cccdData
                    ? '--data--'
                    : undefined,
                };
              }
              apiLogR.request = JSON.stringify(requestInput);
            } else if (typeof logEntry.data.config.data === 'string') {
              let jsonParse: any = {};
              try {
                jsonParse = JSON.parse(logEntry.data.config.data);
                if (
                  apiLogR.path &&
                  apiLogR.path.includes('PartnerVneID/NhanThongTinChiaSe')
                ) {
                  if (jsonParse._parts && Array.isArray(jsonParse._parts)) {
                    let requestInput = jsonParse._parts.filter(
                      (s: any) =>
                        s &&
                        Array.isArray(s) &&
                        !s.some(k => k === 'FaceImage'),
                    );
                    if (jsonParse._parts.length !== requestInput.length) {
                      requestInput.push(['FaceImage', '--data--']);
                    }
                    jsonParse = requestInput;
                  }
                } else if (
                  apiLogR.path &&
                  (apiLogR.path.includes('auth-user/login') ||
                    apiLogR.path.includes('auth-user/verify-auth-requet') ||
                    apiLogR.path.includes(
                      'ProxyTicketPurchase/verify-on-behalf',
                    ))
                ) {
                  jsonParse.passengerAccountLoginInfo = {
                    ...jsonParse.passengerAccountLoginInfo,
                    cccdData: jsonParse.passengerAccountLoginInfo?.cccdData
                      ? '--data--'
                      : undefined,
                  };
                }
                apiLogR.request = JSON.stringify(jsonParse);
              } catch (err) {
                console.error(err);
                apiLogR.request = logEntry.data.config.data;
              }
            } else {
              apiLogR.request = `${logEntry.data.config.data}`;
            }
          }
        }
        if (logEntry.data?.data) {
          if (typeof logEntry.data.data === 'object') {
            apiLogR.response = JSON.stringify(logEntry.data.data);
          } else if (typeof logEntry.data.data === 'string') {
            apiLogR.response = logEntry.data.data;
          } else {
            apiLogR.response = `${logEntry.data.data}`;
          }
        }
      } else {
        if (logEntry?.data) {
          if (logEntry.data?.config) {
            apiLogR.path = logEntry.data.config.url || '';
            if (excludeApis.some(p => apiLogR.path?.includes(p))) {
              continue;
            }
            if (apiLogR.path?.includes('Order/CheckOrderStatus')) {
              continue;
            }

            if (logEntry.data.config.headers) {
              const headers = logEntry.data.config.headers || {};
              apiLogR.header = JSON.stringify({
                ...headers,
                Authorization: headers.Authorization
                  ? `***${headers.Authorization.slice(-10)}`
                  : '',
              });
              apiLogR.env = logEntry.data.config.headers.env;
              apiLogR['user-id'] = logEntry.data.config.headers.passengerId;
            }
            if (logEntry.data.config.data) {
              if (typeof logEntry.data.config.data === 'object') {
                let requestInput = { ...logEntry.data.config.data };
                if (
                  apiLogR.path &&
                  apiLogR.path.includes('PartnerVneID/NhanThongTinChiaSe')
                ) {
                  if (
                    requestInput._parts &&
                    Array.isArray(requestInput._parts)
                  ) {
                    let requestInput1 = requestInput._parts.filter(
                      (s: any) =>
                        s &&
                        Array.isArray(s) &&
                        !s.some(k => k === 'FaceImage'),
                    );
                    if (requestInput._parts.length !== requestInput1.length) {
                      requestInput1.push(['FaceImage', '--data--']);
                    }
                    requestInput = requestInput1;
                  }
                } else if (
                  apiLogR.path &&
                  (apiLogR.path.includes('auth-user/login') ||
                    apiLogR.path.includes('auth-user/verify-auth-requet') ||
                    apiLogR.path.includes(
                      'ProxyTicketPurchase/verify-on-behalf',
                    ))
                ) {
                  requestInput.passengerAccountLoginInfo = {
                    ...requestInput.passengerAccountLoginInfo,
                    cccdData: requestInput.passengerAccountLoginInfo?.cccdData
                      ? '--data--'
                      : undefined,
                  };
                }
                apiLogR.request = JSON.stringify(requestInput);
              } else if (typeof logEntry.data.config.data === 'string') {
                let jsonParse: any = {};
                try {
                  jsonParse = JSON.parse(logEntry.data.config.data);
                  if (
                    apiLogR.path &&
                    apiLogR.path.includes('PartnerVneID/NhanThongTinChiaSe')
                  ) {
                    if (jsonParse._parts && Array.isArray(jsonParse._parts)) {
                      let requestInput1 = jsonParse._parts.filter(
                        (s: any) =>
                          s &&
                          Array.isArray(s) &&
                          !s.some(k => k === 'FaceImage'),
                      );
                      if (jsonParse._parts.length !== requestInput1.length) {
                        requestInput1.push(['FaceImage', '--data--']);
                      }
                      jsonParse = requestInput1;
                    }
                  } else if (
                    apiLogR.path &&
                    (apiLogR.path.includes('auth-user/login') ||
                      apiLogR.path.includes('auth-user/verify-auth-requet') ||
                      apiLogR.path.includes(
                        'ProxyTicketPurchase/verify-on-behalf',
                      ))
                  ) {
                    jsonParse.passengerAccountLoginInfo = {
                      ...jsonParse.passengerAccountLoginInfo,
                      cccdData: jsonParse.passengerAccountLoginInfo?.cccdData
                        ? '--data--'
                        : undefined,
                    };
                  }
                  apiLogR.request = JSON.stringify(jsonParse);
                } catch (err) {
                  console.error(err);
                  apiLogR.request = logEntry.data.config.data;
                }
              } else {
                apiLogR.request = `${logEntry.data.config.data}`;
              }
            }
          }
          if (typeof logEntry.data === 'string') {
            apiLogR.response = logEntry.data;
          } else {
            apiLogR.response = `${logEntry.data.name || ''} ${
              logEntry.data.code || ''
            }  ${logEntry.data.message || ''}`;
            try {
              apiLogR.response = `${apiLogR.response} ${
                typeof logEntry.data.stack === 'string'
                  ? logEntry.data.stack
                  : JSON.stringify(logEntry.data.stack)
              }`;
            } catch (err) {
              console.error(err);
            }
          }
        } else {
          continue;
        }
      }
      sendLogRequest(apiLogR);
      // console.log("apiLogR", apiLogR);
    } catch (err) {
      console.error(err);
    }
  }
  isProcessing = false;
}

export const sendLogRequest = async (input: LogRequest) => {
  try {
    if (!input.path) input.path = '';
    if (!input.request) input.request = '';

    if (!input.header) input.header = '';
    if (!input.response) input.response = '';
    if (!input['user-id']) input['user-id'] = 0;
    if (!input.env) input.env = '';
    if (!input.os) input.os = '';
  } catch (err) {
    console.error(err);
  }
};

// const eventEmitter = new NativeEventEmitter(NativeModules.NativeCode);
// export const subScribeLogEvent = () => {
//     try {
//         if (Platform.OS === "ios") {
//             return null;
//         }
//         const eventListener = eventEmitter.addListener("sendLogEvent", data => {
//             try {
//                 if (data) {
//                     sendLogRequest({
//                         path: (data as any).keyE || "sendLogEvent",
//                         request: "",
//                         header: "",
//                         response: JSON.stringify(data),
//                         "user-id": 0,
//                         env: configs.env,
//                         os: Platform.OS
//                     });
//                 }
//             } catch (err) {
//                 console.error(err);
//             }
//         });
//         return eventListener;
//     } catch (err) {
//         console.error(err);
//     }
//     return null;
// }

/**
 * Chuyển đổi đối tượng lỗi (error) thành một chuỗi log đầy đủ.
 * Ưu tiên lấy stack trace để có thông tin chi tiết nhất.
 * @param {any} error Đối tượng lỗi nhận được từ khối catch.
 * @returns {string} Chuỗi mô tả lỗi, bao gồm stack trace nếu có.
 */
const getFullErrorLog = (error: any) => {
  if (error instanceof Error) {
    // Lấy stack trace, nếu không có (ví dụ: lỗi mạng đơn giản), fallback sang message.
    return error.stack || error.message;
  }

  // Xử lý lỗi là chuỗi (string)
  if (typeof error === 'string') {
    return error;
  }

  // Xử lý các đối tượng khác (ví dụ: { code: 404, msg: 'Not Found' })
  try {
    return JSON.stringify(error, null, 2);
  } catch (e) {
    // Trường hợp đối tượng không thể chuyển đổi thành JSON string
    return `[Unknown Error Object] Type: ${typeof error}`;
  }
};

export const sendCatchError = (keyError: string, err: any) => {
  try {
    const logError = getFullErrorLog(err);
    sendLogRequest({
      path: keyError,
      request: logError,
      header: '',
      response: '',
      'user-id': 0,
      env: configs.env,
      os: Platform.OS,
    });
  } catch (err) {
    console.error(err);
  }
};

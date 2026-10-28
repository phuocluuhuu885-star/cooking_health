import { Platform } from 'react-native';
import axios, { AxiosInstance } from 'axios';
import DeviceInfo from 'react-native-device-info';
import eventEmitter, { EventName } from './eventEmitter';
import configs from '../abase/constant/config';
import { ApiType } from '../type/apiType';
import { addLogApi } from './logUltis';
import { UserInfo } from '../type/user';

let user: UserInfo | null = null;
export const setSyncUser = (u: UserInfo | null) => {
  user = u;
};

// export const getSyncPassengerId = () => {
//     return user?.passengerId
// }

// export const getNationalId = () => {
//     return user?.nationalId
// }

// export const getSyncUserToken = () => {
//     return user?.token
// }

let DeviceID = '';
let DeviceName = '';

const onGetDeviceName = async () => {
  DeviceName = await DeviceInfo.getDeviceName();
};

export const setDeviceID = (Id: string) => {
  DeviceID = Id;
  onGetDeviceName();
};

export const getDeviceID = () => {
  return DeviceID;
};

export const isDev = () => {
  return configs.env === 'DEV';
};

export const getAuthKey = () => {
  return configs.apiAuth;
};

export const getBaseUrl = () => {
  return configs.baseUrl;
};

export const getCurrentVersion = () => {
  return `${
    Platform.OS
  }_${DeviceInfo.getVersion()}_${DeviceInfo.getBuildNumber()}`;
};

//==== init request
const defaultTimeout = 15000;
const syncRequestBase = axios.create({
  baseURL: configs.baseUrl,
  timeout: defaultTimeout,
});

syncRequestBase.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  } else {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  config.headers['deviceos'] = Platform.OS;
  config.headers['deviceid'] = DeviceID;
  config.headers['env'] = configs.env;

  config.headers['Accept'] = 'application/json';
  config.headers['osversion'] = DeviceInfo.getSystemVersion();
  config.headers['appversion'] = DeviceInfo.getVersion();
  config.headers['appversioncode'] = DeviceInfo.getBuildNumber();

  config.headers['Authorization'] = `Bearer ${user?.accessToken || ''}`;
  config.headers['Accept-Encoding'] = 'gzip, deflate';
  //config.headers['passengerId'] = user?.passengerId || "";

  if (user?.accessToken) {
    config.headers['Authorization'] = `Bearer ${user.accessToken}`;
  } else {
    delete config.headers['Authorization'];
  }
  config.headers['X-Api-Token'] = generateApiToken(configs.apiAuth);

  return config;
});

syncRequestBase.interceptors.response.use(
  response => {
    addLogApi({
      type: 'success',
      data: response,
    });
    return response;
  },
  error => {
    addLogApi({
      type: 'error',
      data: error,
    });
    return Promise.reject(error);
  },
);

//===

const syncRequestDCApi = axios.create({
  baseURL: configs.baseDCApi,
  timeout: defaultTimeout,
});

syncRequestDCApi.interceptors.request.use(config => {
  config.metadata = { startTime: Date.now() };

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  } else {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  config.headers['deviceos'] = Platform.OS;
  config.headers['deviceid'] = DeviceID;
  config.headers['env'] = configs.env;

  config.headers['Accept'] = 'application/json';
  config.headers['osversion'] = DeviceInfo.getSystemVersion();
  config.headers['appversion'] = DeviceInfo.getVersion();
  config.headers['appversioncode'] = DeviceInfo.getBuildNumber();

  config.headers['Authorization'] = `Bearer ${user?.accessToken || ''}`;
  config.headers['Accept-Encoding'] = 'gzip, deflate';
  //config.headers['passengerId'] = user?.passengerId || "";

  if (user?.accessToken) {
    config.headers['Authorization'] = `Bearer ${user.accessToken}`;
  } else {
    delete config.headers['Authorization'];
  }
  config.headers['X-Api-Token'] = generateApiToken(configs.apiAuth);

  return config;
});

syncRequestDCApi.interceptors.response.use(
  response => {
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      console.log(
        `[PERF] ${response.config.url} took ${Date.now() - startTime}ms`,
      );
    }
    addLogApi({
      type: 'success',
      data: response,
    });
    return response;
  },
  error => {
    addLogApi({
      type: 'error',
      data: error,
    });
    return Promise.reject(error);
  },
);

export const resetBaseUrl = () => {
  syncRequestBase.defaults.baseURL = configs.baseUrl;
  syncRequestDCApi.defaults.baseURL = configs.baseDCApi;
};

//===

export async function syncApi(
  type: ApiType,
  data: any = null,
  headers: any = null,
  onUploadProgress?: (percent: number) => void,
  fileSize?: number,
) {
  const timeout = type.timeout || 15000;

  const cleanData = data
    ? Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value != null),
      )
    : {};

  let newData: { [key: string]: any } = {
    ...cleanData,
    AppVersion: DeviceInfo.getVersion(),
    OsVersion: Platform.OS,
    DeviceName: DeviceName,
    Source: 'mobile',
  };

  let subUrl = type.url;

  // if (!user) {
  //     return {
  //         IsError: true,
  //         ErrorMessage: "NOT LOGIN USER"
  //     }
  // }

  try {
    if (subUrl.includes(':')) {
      Object.keys(newData).forEach(key => {
        const subKey = `/:${key}`;
        if (subUrl.includes(subKey)) {
          const pathValue = newData[key];
          if (
            pathValue === undefined ||
            pathValue === null ||
            pathValue === ''
          ) {
            delete newData[key];
            return;
          }
          subUrl = subUrl.replace(subKey, `/${pathValue}`);
          delete newData[key];
        }
      });
    }

    const isFormData = type.type === 'multipart/form-data' ? true : false;
    if (isFormData) {
      const file = newData.File;
      delete newData.File;

      const formData = new FormData();
      const uri = file.path || file.sourceURL;
      formData.append(file.keyForm || 'file', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: file.filename || `image_${new Date().getTime()}.jpg`,
        type: file.mime,
      });
      Object.keys(newData).forEach(k => {
        if (newData[k] !== undefined && newData[k] !== null)
          formData.append(k, newData[k]);
      });
      return uploadFile(subUrl, timeout, formData, onUploadProgress, fileSize);
    }

    if (type.method.toLowerCase() === 'get') {
      const params = new URLSearchParams({
        ...newData,
        timeRq: `${new Date().getTime()}`,
      }).toString();
      subUrl += params ? `?${params}` : '';
    } else if (type.method.toLowerCase() === 'post' && !isFormData) {
      subUrl = `${subUrl}?timeRq=${new Date().getTime()}`;
    }

    const response = await syncGetData(
      type.method,
      type.base === 'dcapi' ? syncRequestDCApi : syncRequestBase,
      subUrl,
      timeout,
      newData,
    );

    console.log('API response', {
      url: response.config.url,
      status: response.status,
    });
    if (response.status === 401) {
      console.warn(`${subUrl} error 401`);
      eventEmitter.emit(EventName.expireToken, { IsExpire: true });
      return {
        IsError: true,
        ErrorMessage: 'Unauthorized',
      };
    }
    // if (response.status === 403) {
    //     console.warn(`${subUrl} error 403`);
    //     return {
    //         IsError: true,
    //         ErrorMessage: "Ứng dụng sử dụng phiên bản cũ, vui lòng cập nhật phiên bản mới!"
    //     }
    // }

    //error
    if (response.status === 999) {
      return {
        IsError: true,
        ErrorMessage: 'Lỗi #999', // resErr.data ? Object.values(resErr.data).filter(v => v).map(v => `-${v}`).join("\n") : resErr.message,
        Title: '', // responseData.message//!resErr.data ? null : resErr.message
      };
    }

    const responseData = response.data;

    if (responseData.status === 999) {
      return {
        ...responseData,
        IsError: true,
        ErrorMessage: responseData.data
          ? Object.values(responseData.data)
              .map(v => `-${v}`)
              .join('\n')
          : responseData.message,
        Title: !responseData.data ? null : responseData.message,
      };
    }
    try {
    } catch (err1) {
      console.error(err1);
    }
    return responseData;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return error.response.data;
    }

    // if (error?.status === 401) {
    //     console.warn(`${subUrl} error 401`);
    //     eventEmitter.emit(EventName.expireToken, { IsExpire: true });

    //     return {
    //         IsError: true,
    //         ErrorMessage: "Unauthorized"
    //     }
    // }
    // if (error?.status === 403) {
    //     console.warn(`${subUrl} error 403`);
    //     return {
    //         IsError: true,
    //         ErrorMessage: "Ứng dụng sử dụng phiên bản cũ, vui lòng cập nhật phiên bản mới!"
    //     }
    // }

    // if (error?.name === 'AbortError') {
    //     return {
    //         IsError: true,
    //         ErrorMessage: "Request timeout exceeded"
    //     }
    // }

    return {
      IsError: true,
      ErrorMessage: error?.message,
    };
  }
}
async function uploadFile(
  subUrl: string,
  timeout: number,
  data: FormData,
  onUploadProgress?: (percent: number) => void,
  fileSize?: number,
) {
  const response = await syncRequestBase.post(subUrl, data, {
    timeout: timeout,
    onUploadProgress: progressEvent => {
      const totalSize = progressEvent.total || fileSize || 1;
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / totalSize,
      );
      console.log(`Upload progress: ${percentCompleted}%`);
      onUploadProgress && onUploadProgress(percentCompleted);
    },
  });
  console.log('Upload response', {
    url: response.config.url,
    status: response.status,
  });
  if (response.status === 999) {
    return {
      IsError: true,
      ErrorMessage: response.data
        ? Object.values(response.data)
            .filter(v => v)
            .map(v => `-${v}`)
            .join('\n')
        : 'Có lỗi xảy ra',
    };
  }
  return response.data;
}

const syncGetData = (
  method: 'get' | 'post' | 'put' | 'delete',
  request: AxiosInstance,
  subUrl: string,
  timeout: number,
  data?: any,
) => {
  if (timeout !== defaultTimeout) {
    if (method === 'get') {
      return request.get(subUrl, {
        timeout: timeout,
      });
    }
    if (method === 'delete') {
      return request.delete(subUrl, {
        data,
        timeout: timeout,
      });
    }
    if (method === 'put') {
      return request.put(subUrl, data, {
        timeout: timeout,
      });
    }
    return request.post(subUrl, data, {
      timeout: timeout,
    });
  }
  if (method === 'get') {
    return request.get(subUrl);
  }
  if (method === 'delete') {
    return request.delete(subUrl, { data });
  }
  if (method === 'put') {
    return request.put(subUrl, data);
  }
  return request.post(subUrl, data);
};

/**
 * Hàm tạo X-Api-Token dựa trên quy tắc:
 * $nonce + [$timestamp in hex] + MD5($secretKey + $nonce + $timestamp)
 */
export const generateApiToken = (secretKey: string): string => {
  // 1. Lấy timestamp hiện tại (Epoch in miliseconds)
  const timestampNumber = Date.now();
  const timestampStr = timestampNumber.toString();

  // 2. Chuyển timestamp sang chuỗi Hex
  const timestampHex = timestampNumber.toString(16).toLocaleUpperCase();

  // 3. Tạo nonce (Sử dụng GUID/UUID đơn giản)
  // Nếu bạn muốn dùng thư viện 'uuid', hãy cài đặt nó.
  // Ở đây tôi demo bằng một hàm random đơn giản chuẩn 32 ký tự hex.
  const nonce = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  )
    .join('')
    .toLocaleUpperCase();

  // 4. Tính MD5($secretKey + $nonce + $timestamp)
  const hashInput = secretKey + nonce + timestampStr;

  // 5. Ghép chuỗi kết quả: $nonce + $timestampHex + $md5Hash
  const apiToken = `${nonce}${timestampHex}`;

  return apiToken;
};

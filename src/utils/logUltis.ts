import axios from "axios";
import moment from "moment";
import { AppState, AppStateStatus, NativeEventEmitter, NativeModules, Platform } from "react-native";
import { createMMKV } from "react-native-mmkv";
import configs from "../abase/constant/config";

const defaultTimeout = 20000;
const syncRequestLog = axios.create({
    baseURL: configs.logBaseUrl,
    timeout: defaultTimeout
});

syncRequestLog.interceptors.request.use((config) => {
    config.metadata = { startTime: Date.now() };

    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    config.headers['deviceos'] = Platform.OS;
    // config.headers['X-Api-Token'] = generateApiToken(configs.apiAuth);
    config.headers["X-Api-Token"] = configs.apiToken;
    config.headers["Authorization"] = configs.logAuth;

    return config;
});

syncRequestLog.interceptors.response.use(
    (response) => {
        const startTime = response.config.metadata?.startTime;
        if (startTime) {
            console.log(`[PERF] ${response.config.url} took ${Date.now() - startTime}ms`);
        }
        return response;
    },
    (error) => {
        return Promise.reject(error)
    }
);

export type LogRequest = {
    path?: string,
    request?: string,
    header?: string,
    response?: string,
    "user-id"?: number,
    env?: string,
    os?: string
};

const logQueue: Array<{
    type: "success" | "error",
    data: any
}> = [];
let isProcessing = false;

export const addLogApi = (log: {
    type: "success" | "error",
    data: any
}) => {
    console.log("addLogApi", log);
    logQueue.push(log);
    processLogQueue().catch(e => console.error(e));
}

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
                "user-id": 0,
                env: "",
                path: "",
                request: "",
                header: "",
                response: "",
                os: Platform.OS
            };

            if (logEntry?.type === "success") {
                if (logEntry.data?.config) {
                    apiLogR.path = logEntry.data.config.url || "";
                    if (excludeApis.some(p => apiLogR.path?.includes(p))) {
                        continue
                    }

                    if (apiLogR.path?.includes("Order/CheckOrderStatus")) {
                        if (logEntry.data?.data?.data?.orderStatus === 1) {
                        } else {
                            continue
                        }
                    }

                    if (logEntry.data.config.headers) {
                        const headers = logEntry.data.config.headers || {};
                        apiLogR.header = JSON.stringify({
                            ...headers,
                            Authorization: headers.Authorization ? `***${headers.Authorization.slice(-10)}` : ""
                        });
                        apiLogR.env = logEntry.data.config.headers.env;
                        apiLogR["user-id"] = logEntry.data.config.headers.passengerId;
                    }
                    if (logEntry.data.config.data) {
                        if (typeof logEntry.data.config.data === "object") {
                            let requestInput = { ...logEntry.data.config.data };
                            if (apiLogR.path && apiLogR.path.includes("PartnerVneID/NhanThongTinChiaSe")) {
                                if (requestInput._parts && Array.isArray(requestInput._parts)) {
                                    let requestInput1 = requestInput._parts.filter((s: any) => s && Array.isArray(s) && !s.some(k => k === "FaceImage"));
                                    if (requestInput._parts.length !== requestInput1.length) {
                                        requestInput1.push([
                                            "FaceImage",
                                            "--data--"
                                        ]);
                                    }
                                    requestInput = requestInput1;
                                }
                            } else if (apiLogR.path && (apiLogR.path.includes("auth-user/login")
                                || apiLogR.path.includes("auth-user/verify-auth-requet")
                                || apiLogR.path.includes("ProxyTicketPurchase/verify-on-behalf"))) {
                                requestInput.passengerAccountLoginInfo = {
                                    ...requestInput.passengerAccountLoginInfo,
                                    cccdData: requestInput.passengerAccountLoginInfo?.cccdData ? "--data--" : undefined
                                }
                            }
                            apiLogR.request = JSON.stringify(requestInput);
                        } else if (typeof logEntry.data.config.data === "string") {
                            let jsonParse: any = {};
                            try {
                                jsonParse = JSON.parse(logEntry.data.config.data);
                                if (apiLogR.path && apiLogR.path.includes("PartnerVneID/NhanThongTinChiaSe")) {
                                    if (jsonParse._parts && Array.isArray(jsonParse._parts)) {
                                        let requestInput = jsonParse._parts.filter((s: any) => s && Array.isArray(s) && !s.some(k => k === "FaceImage"));
                                        if (jsonParse._parts.length !== requestInput.length) {
                                            requestInput.push([
                                                "FaceImage",
                                                "--data--"
                                            ]);
                                        }
                                        jsonParse = requestInput;
                                    }
                                } else if (apiLogR.path && (apiLogR.path.includes("auth-user/login")
                                    || apiLogR.path.includes("auth-user/verify-auth-requet")
                                    || apiLogR.path.includes("ProxyTicketPurchase/verify-on-behalf"))) {
                                    jsonParse.passengerAccountLoginInfo = {
                                        ...jsonParse.passengerAccountLoginInfo,
                                        cccdData: jsonParse.passengerAccountLoginInfo?.cccdData ? "--data--" : undefined
                                    }
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
                    if (typeof logEntry.data.data === "object") {
                        apiLogR.response = JSON.stringify(logEntry.data.data);
                    } else if (typeof logEntry.data.data === "string") {
                        apiLogR.response = logEntry.data.data;
                    } else {
                        apiLogR.response = `${logEntry.data.data}`;
                    }
                }
            } else {
                if (logEntry?.data) {
                    if (logEntry.data?.config) {
                        apiLogR.path = logEntry.data.config.url || "";
                        if (excludeApis.some(p => apiLogR.path?.includes(p))) {
                            continue
                        }
                        if (apiLogR.path?.includes("Order/CheckOrderStatus")) {
                            continue
                        }

                        if (logEntry.data.config.headers) {
                            const headers = logEntry.data.config.headers || {};
                            apiLogR.header = JSON.stringify({
                                ...headers,
                                Authorization: headers.Authorization ? `***${headers.Authorization.slice(-10)}` : ""
                            });
                            apiLogR.env = logEntry.data.config.headers.env;
                            apiLogR["user-id"] = logEntry.data.config.headers.passengerId;
                        }
                        if (logEntry.data.config.data) {
                            if (typeof logEntry.data.config.data === "object") {
                                let requestInput = { ...logEntry.data.config.data };
                                if (apiLogR.path && apiLogR.path.includes("PartnerVneID/NhanThongTinChiaSe")) {
                                    if (requestInput._parts && Array.isArray(requestInput._parts)) {
                                        let requestInput1 = requestInput._parts.filter((s: any) => s && Array.isArray(s) && !s.some(k => k === "FaceImage"));
                                        if (requestInput._parts.length !== requestInput1.length) {
                                            requestInput1.push([
                                                "FaceImage",
                                                "--data--"
                                            ]);
                                        }
                                        requestInput = requestInput1;
                                    }
                                } else if (apiLogR.path && (apiLogR.path.includes("auth-user/login")
                                    || apiLogR.path.includes("auth-user/verify-auth-requet")
                                    || apiLogR.path.includes("ProxyTicketPurchase/verify-on-behalf"))) {
                                    requestInput.passengerAccountLoginInfo = {
                                        ...requestInput.passengerAccountLoginInfo,
                                        cccdData: requestInput.passengerAccountLoginInfo?.cccdData ? "--data--" : undefined
                                    }
                                }
                                apiLogR.request = JSON.stringify(requestInput);
                            } else if (typeof logEntry.data.config.data === "string") {
                                let jsonParse: any = {};
                                try {
                                    jsonParse = JSON.parse(logEntry.data.config.data);
                                    if (apiLogR.path && apiLogR.path.includes("PartnerVneID/NhanThongTinChiaSe")) {
                                        if (jsonParse._parts && Array.isArray(jsonParse._parts)) {
                                            let requestInput1 = jsonParse._parts.filter((s: any) => s && Array.isArray(s) && !s.some(k => k === "FaceImage"));
                                            if (jsonParse._parts.length !== requestInput1.length) {
                                                requestInput1.push([
                                                    "FaceImage",
                                                    "--data--"
                                                ]);
                                            }
                                            jsonParse = requestInput1;
                                        }
                                    } else if (apiLogR.path && (apiLogR.path.includes("auth-user/login")
                                        || apiLogR.path.includes("auth-user/verify-auth-requet")
                                        || apiLogR.path.includes("ProxyTicketPurchase/verify-on-behalf"))) {
                                        jsonParse.passengerAccountLoginInfo = {
                                            ...jsonParse.passengerAccountLoginInfo,
                                            cccdData: jsonParse.passengerAccountLoginInfo?.cccdData ? "--data--" : undefined
                                        }
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
                    if (typeof logEntry.data === "string") {
                        apiLogR.response = logEntry.data;
                    } else {
                        apiLogR.response = `${logEntry.data.name || ""} ${logEntry.data.code || ""}  ${logEntry.data.message || ""}`;
                        try {
                            apiLogR.response = `${apiLogR.response} ${typeof logEntry.data.stack === "string" ? logEntry.data.stack : JSON.stringify(logEntry.data.stack)}`;
                        } catch (err) {
                            console.error(err);
                        }
                    }
                } else {
                    continue
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

const LOG_MAX_RETRIES = 3;
const LOG_RETRY_BASE_DELAY_MS = 1000; // 1s, 2s, 4s

// Store MMKV riêng biệt hoàn toàn cho hàng đợi log lỗi - khác id, khác encryptionKey với
// store "redux" (reduxs/store.ts) và "metrohn-local-storage" (utils/storage.ts), để không
// bao giờ ảnh hưởng/xung đột với dữ liệu redux-persist hay các key khác của app.
const logQueueStorage = createMMKV({
    id: 'metrohn-log-queue',
    encryptionKey: 'metrohn_logq_7hT2nWv9pQeXsRkD4jL',
});
const LOG_QUEUE_KEY = 'pending_logs';
const LOG_QUEUE_MAX_ITEMS = 100; // giới hạn hàng đợi - tránh phình vô hạn khi mất mạng kéo dài
let didWarnAboutLogEndpoint = false;

type PendingLog = {
    id: string,
    input: LogRequest,
    createdAt: number
};

const readPendingLogs = (): Array<PendingLog> => {
    try {
        const raw = logQueueStorage.getString(LOG_QUEUE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error(err);
        return [];
    }
}

const writePendingLogs = (queue: Array<PendingLog>) => {
    try {
        logQueueStorage.set(LOG_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
        console.error(err);
    }
}

const enqueuePendingLog = (input: LogRequest) => {
    try {
        const queue = readPendingLogs();
        queue.push({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            input,
            createdAt: Date.now()
        });
        // Ring buffer: vượt ngưỡng thì bỏ entry cũ nhất, giữ chi phí ghi/đọc luôn nhỏ và ổn định
        const bounded = queue.length > LOG_QUEUE_MAX_ITEMS
            ? queue.slice(queue.length - LOG_QUEUE_MAX_ITEMS)
            : queue;
        writePendingLogs(bounded);
    } catch (err) {
        console.error(err);
    }
}

// Gửi 1 lần, không retry, không đụng tới hàng đợi persist - dùng chung cho cả đường gửi
// trực tiếp (sendLogRequest) lẫn đường xả hàng đợi (flushPendingLogs).
const postLogOnce = async (input: LogRequest): Promise<boolean> => {
    try {
        const logBaseUrl = configs.logBaseUrl.replace(/\/+$/, "");
        const apiBaseUrl = configs.baseUrl.replace(/\/+$/, "");
        if (!logBaseUrl || logBaseUrl === apiBaseUrl) {
            if (!didWarnAboutLogEndpoint) {
                console.warn("API logging is disabled because logBaseUrl must point to a dedicated Loki endpoint.");
                didWarnAboutLogEndpoint = true;
            }
            return true;
        }

        if (!input.path) input.path = "";
        if (!input.request) input.request = "";
        if (!input.header) input.header = "";
        if (!input.response) input.response = "";
        if (!input['user-id']) input['user-id'] = 0;
        if (!input.env) input.env = "";
        if (!input.os) input.os = "";

        const timeNano = moment().toDate().getTime() * 1000000;
        const userID = input['user-id'];
        const request = {
            streams: [{
                stream: {
                    service_name: Platform.OS === "android" ? "Android" : "iOS"
                },
                values: [
                    [
                        `${timeNano}`,
                        `${input.header} <======> ${input.request} <======> ${input.response}`,
                        {
                            userId: `${userID}`,
                            path: input.path,
                            env: input.env
                        }
                    ],
                ]
            }]
        };
        await syncRequestLog.post("loki/api/v1/push", request);
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

export const sendLogRequest = async (input: LogRequest, retryCount: number = 0) => {
    const ok = await postLogOnce(input);
    if (ok) return;

    // Log gửi lên server bị mất hoàn toàn nếu request lỗi (mất mạng, server down...).
    // Retry với backoff tăng dần trong bộ nhớ trước; hết số lần mới lưu tạm xuống store
    // riêng để xả lại khi app quay lại foreground (initLogQueueFlush).
    if (retryCount < LOG_MAX_RETRIES) {
        const delayMs = LOG_RETRY_BASE_DELAY_MS * Math.pow(2, retryCount);
        setTimeout(() => {
            sendLogRequest(input, retryCount + 1).catch(e => console.error(e));
        }, delayMs);
    } else {
        enqueuePendingLog(input);
    }
}

// Xả hàng đợi log lỗi đã lưu xuống MMKV riêng - gửi tuần tự (không song song) để không dồn
// request khi vừa có mạng lại; entry nào vẫn lỗi thì giữ lại cho lần xả kế tiếp.
export const flushPendingLogs = async () => {
    const queue = readPendingLogs();
    if (queue.length === 0) return;

    const stillFailed: Array<PendingLog> = [];
    for (const item of queue) {
        const ok = await postLogOnce(item.input);
        if (!ok) {
            stillFailed.push(item);
        }
    }
    writePendingLogs(stillFailed);
}

// Gọi 1 lần từ App root (screens/index.tsx): xả ngay lúc khởi động (phòng phiên trước bị
// kill khi còn log tồn đọng) và xả lại mỗi khi app quay lại foreground.
export const initLogQueueFlush = () => {
    flushPendingLogs().catch(err => console.error(err));

    const onAppStateChange = (status: AppStateStatus) => {
        if (status === "active") {
            flushPendingLogs().catch(err => console.error(err));
        }
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
        subscription.remove();
    };
}

// Log riêng cho các lần xoá vé cục bộ (removeTicket/removeTickets) để sau này đối chiếu
// khi người dùng báo mất vé - biết chính xác vé nào bị xoá, lúc nào, do nhánh logic nào.
export const sendTicketRemovalLog = (reason: string, ticketIds: number | Array<number>) => {
    try {
        const ids = Array.isArray(ticketIds) ? ticketIds : [ticketIds];
        sendLogRequest({
            path: "Ticket/LocalRemove",
            request: reason,
            header: "",
            response: JSON.stringify({ ticketIds: ids }),
            "user-id": 0,
            env: configs.env,
            os: Platform.OS
        });
    } catch (err) {
        console.error(err);
    }
}

export const subScribeLogEvent = () => {
    try {
        if (Platform.OS === "ios") {
            return null;
        }
        const nativeCodeModule = NativeModules.NativeCode;
        if (!nativeCodeModule) {
            return null;
        }
        const eventEmitter = new NativeEventEmitter(nativeCodeModule);
        const eventListener = eventEmitter.addListener("sendLogEvent", (data: any) => {
            try {
                if (data) {
                    sendLogRequest({
                        path: data.keyE || "sendLogEvent",
                        request: "",
                        header: "",
                        response: JSON.stringify(data),
                        "user-id": 0,
                        env: configs.env,
                        os: Platform.OS
                    });
                }
            } catch (err) {
                console.error(err);
            }
        });
        return eventListener;
    } catch (err) {
        console.error(err);
    }
    return null;
}

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
            path: `CatchError_${keyError}`,
            request: logError,
            header: "",
            response: "",
            "user-id": 0,
            env: configs.env,
            os: Platform.OS
        });
    } catch (err) {
        console.error(err);
    }
}
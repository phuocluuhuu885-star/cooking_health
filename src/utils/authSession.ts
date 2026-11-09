import type { AxiosError, AxiosRequestConfig } from 'axios';
import eventEmitter, { EventName } from './eventEmitter';

type AuthResponseData = {
  code?: unknown;
  error?: unknown;
  errorCode?: unknown;
  ErrorCode?: unknown;
  message?: unknown;
  Message?: unknown;
  ErrorMessage?: unknown;
  IsExpire?: unknown;
  isExpired?: unknown;
  status?: unknown;
  statusCode?: unknown;
  StatusCode?: unknown;
  data?: unknown;
  [key: string]: unknown;
};

type AuthRequestMetadata = {
  hasAuthToken?: boolean;
};

type RequestWithAuthMetadata = AxiosRequestConfig & {
  metadata?: AuthRequestMetadata;
};

let activeAccessToken: string | null = null;

const tokenContextPattern = /(token|jwt|credential)/i;
const tokenFailurePattern =
  /(expired|expire|invalid|unauthori[sz]ed|not valid|revoked|missing)/i;
const unauthorizedMessagePattern =
  /^(unauthori[sz]ed|not authenticated|authentication required)$/i;

export const isAuthenticatedRequest = (config?: RequestWithAuthMetadata) => {
  if (config?.metadata?.hasAuthToken !== undefined) {
    return config.metadata.hasAuthToken;
  }

  const headers = config?.headers as
    | (Record<string, unknown> & {
        get?: (name: string) => unknown;
      })
    | undefined;
  const authorization =
    headers?.get?.('Authorization') ??
    headers?.Authorization ??
    headers?.authorization;

  return typeof authorization === 'string' && authorization.length > 0;
};

export const setActiveAuthToken = (token: string | null) => {
  activeAccessToken = token;
};

const getRequestAccessToken = (config?: RequestWithAuthMetadata) => {
  const headers = config?.headers as
    | (Record<string, unknown> & {
        get?: (name: string) => unknown;
      })
    | undefined;
  const authorization =
    headers?.get?.('Authorization') ??
    headers?.Authorization ??
    headers?.authorization;

  if (typeof authorization !== 'string') return null;
  return authorization.replace(/^Bearer\s+/i, '');
};

export const isCurrentAuthenticatedRequest = (
  config?: RequestWithAuthMetadata,
) => {
  if (!isAuthenticatedRequest(config)) return false;
  if (!activeAccessToken) return true;

  const requestToken = getRequestAccessToken(config);
  return requestToken === null || requestToken === activeAccessToken;
};

export const isTokenAuthenticationFailure = (
  status: number | undefined,
  responseData: unknown,
) => {
  const data =
    responseData && typeof responseData === 'object'
      ? (responseData as AuthResponseData)
      : undefined;
  const nestedData =
    data?.data && typeof data.data === 'object'
      ? (data.data as AuthResponseData)
      : undefined;

  if (
    status === 401 ||
    data?.status === 401 ||
    data?.statusCode === 401 ||
    data?.StatusCode === 401 ||
    nestedData?.status === 401 ||
    nestedData?.statusCode === 401 ||
    nestedData?.StatusCode === 401
  ) {
    return true;
  }
  if (
    data?.IsExpire === true ||
    data?.isExpired === true ||
    nestedData?.IsExpire === true ||
    nestedData?.isExpired === true
  ) {
    return true;
  }

  const identifiers = [
    data?.code,
    data?.error,
    data?.errorCode,
    data?.ErrorCode,
    data?.message,
    data?.Message,
    data?.ErrorMessage,
    nestedData?.code,
    nestedData?.error,
    nestedData?.errorCode,
    nestedData?.ErrorCode,
    nestedData?.message,
    nestedData?.Message,
    nestedData?.ErrorMessage,
  ];

  return identifiers.some(value => {
    if (typeof value !== 'string') return false;
    const normalized = value.replace(/[_-]+/g, ' ').trim();
    return (
      unauthorizedMessagePattern.test(normalized) ||
      (tokenFailurePattern.test(normalized) &&
        tokenContextPattern.test(normalized))
    );
  });
};

export const notifyTokenAuthenticationFailure = () => {
  eventEmitter.emit(EventName.expireToken, { IsExpire: true });
};

export const notifyIfTokenAuthenticationFailure = (
  responseData: unknown,
  requestToken?: string,
) => {
  if (
    requestToken &&
    activeAccessToken &&
    requestToken !== activeAccessToken
  ) {
    return false;
  }
  if (!isTokenAuthenticationFailure(undefined, responseData)) return false;
  notifyTokenAuthenticationFailure();
  return true;
};

export const isTokenAuthenticationError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'isTokenAuthenticationError' in error &&
      error.isTokenAuthenticationError === true,
  );

export const markTokenAuthenticationError = (error: AxiosError) => {
  Object.assign(error, { isTokenAuthenticationError: true });
  error.message = '';
  if (error.response) {
    error.response.data = { IsAuthError: true, message: '' };
  }
};

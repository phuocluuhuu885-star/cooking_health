import {
  isAuthenticatedRequest,
  isCurrentAuthenticatedRequest,
  setActiveAuthToken,
  isTokenAuthenticationFailure,
} from './authSession';

describe('token authentication failure detection', () => {
  it('recognizes unauthorized responses for authenticated requests', () => {
    expect(isTokenAuthenticationFailure(401, null)).toBe(true);
  });

  it('recognizes explicit token failure payloads', () => {
    expect(
      isTokenAuthenticationFailure(403, {
        code: 'TOKEN_EXPIRED',
      }),
    ).toBe(true);
    expect(
      isTokenAuthenticationFailure(200, {
        message: 'Access token is not valid',
      }),
    ).toBe(true);
    expect(
      isTokenAuthenticationFailure(undefined, {
        message: 'Unauthorized',
      }),
    ).toBe(true);
    expect(
      isTokenAuthenticationFailure(undefined, {
        message: 'Authentication failed',
        data: { code: 'TOKEN_EXPIRED' },
      }),
    ).toBe(true);
  });

  it('does not treat unrelated forbidden responses as expired sessions', () => {
    expect(
      isTokenAuthenticationFailure(403, {
        message: 'Bạn không có quyền thực hiện thao tác này.',
      }),
    ).toBe(false);
  });

  it('checks bearer authorization on direct Axios requests', () => {
    expect(
      isAuthenticatedRequest({
        headers: { Authorization: 'Bearer access-token' },
      }),
    ).toBe(true);
    expect(isAuthenticatedRequest({ headers: {} })).toBe(false);
  });

  it('ignores authorization failures from a replaced session token', () => {
    setActiveAuthToken('current-token');
    expect(
      isCurrentAuthenticatedRequest({
        headers: { Authorization: 'Bearer old-token' },
      }),
    ).toBe(false);
    expect(
      isCurrentAuthenticatedRequest({
        headers: { Authorization: 'Bearer current-token' },
      }),
    ).toBe(true);
    setActiveAuthToken(null);
  });
});

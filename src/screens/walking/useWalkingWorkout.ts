import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { setSyncUser } from '../../utils/syncUtils';
import {
  finishWalkingWorkout as finishWalkingWorkoutRequest,
  getActiveWalkingWorkout,
  pauseWalkingWorkout as pauseWalkingWorkoutRequest,
  resumeWalkingWorkout as resumeWalkingWorkoutRequest,
  startWalkingWorkout as startWalkingWorkoutRequest,
  updateWalkingWorkout,
} from '../../utils/walkingApi';
import {
  clearNativeWalkingSession,
  getNativeWalkingTrackingSnapshot,
  requestWalkingPermissions,
  startNativeWalkingTracking,
  stopNativeWalkingTracking,
  subscribeWalkingLocationUpdates,
  subscribeWalkingStepUpdates,
  subscribeWalkingTrackingStatus,
} from '../../utils/walkingTrackingNative';
import {
  createWalkingClientSessionId,
  filterWalkingLocationPoint,
  stopWalkingTrackingSubscriptions,
} from '../../utils/walkingTrackingUtils';
import type {
  WalkingLocationPoint,
  WalkingWorkout,
} from '../../utils/types/walking';
import { createStateSetter } from '../../utils/stateUtils';

type GpsStatus = 'checking' | 'available' | 'denied' | 'unavailable';
type SensorStatus = 'checking' | 'available' | 'denied' | 'unavailable';

const useWalkingWorkout = () => {
  const user = useSelector(selectUserInfo);
  const [state, setState] = useState<{
    workout: WalkingWorkout | null;
    steps: number;
    distanceMeters: number;
    clock: number;
    loading: boolean;
    busy: boolean;
    error: string;
    gpsStatus: GpsStatus;
    sensorStatus: SensorStatus;
  }>({
    workout: null,
    steps: 0,
    distanceMeters: 0,
    clock: Date.now(),
    loading: true,
    busy: false,
    error: '',
    gpsStatus: 'checking',
    sensorStatus: 'checking',
  });
  const {
    workout,
    steps,
    distanceMeters,
    clock,
    loading,
    busy,
    error,
    gpsStatus,
    sensorStatus,
  } = state;
  const setWorkout = useMemo(
    () => createStateSetter(setState, 'workout'),
    [setState],
  );
  const setSteps = useMemo(() => createStateSetter(setState, 'steps'), [setState]);
  const setDistanceMeters = useMemo(
    () => createStateSetter(setState, 'distanceMeters'),
    [setState],
  );
  const setClock = useMemo(() => createStateSetter(setState, 'clock'), [setState]);
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setBusy = useMemo(() => createStateSetter(setState, 'busy'), [setState]);
  const setError = useMemo(() => createStateSetter(setState, 'error'), [setState]);
  const setGpsStatus = useMemo(
    () => createStateSetter(setState, 'gpsStatus'),
    [setState],
  );
  const setSensorStatus = useMemo(
    () => createStateSetter(setState, 'sensorStatus'),
    [setState],
  );
  const refs = useRef<{
    lastLocation: WalkingLocationPoint | null;
    subscriptions: EmitterSubscription[];
    workout: WalkingWorkout | null;
    busy: boolean;
    latestMetrics: { steps: number; distanceMeters: number };
  }>({
    lastLocation: null,
    subscriptions: [],
    workout: null,
    busy: false,
    latestMetrics: { steps: 0, distanceMeters: 0 },
  });

  useEffect(() => {
    setSyncUser(user ?? null);
  }, [user]);

  useEffect(() => {
    refs.current.workout = workout;
  }, [workout]);

  useEffect(() => {
    refs.current.latestMetrics = { steps, distanceMeters };
  }, [steps, distanceMeters]);

  const attachSensors = useCallback(
    async (
      session: WalkingWorkout,
      grantedPermissions?: Awaited<ReturnType<typeof requestWalkingPermissions>>,
    ) => {
      stopWalkingTrackingSubscriptions(refs.current.subscriptions);
      refs.current.lastLocation = null;
      const permissions =
        grantedPermissions ?? (await requestWalkingPermissions());
      if (!permissions.enableSteps) {
        setSensorStatus('denied');
      } else {
        setSensorStatus('checking');
      }
      if (!permissions.enableGps) {
        setGpsStatus('denied');
      } else {
        setGpsStatus('checking');
      }

      refs.current.subscriptions.push(
        subscribeWalkingStepUpdates(event => {
          if (Number.isSafeInteger(event.steps) && event.steps >= 0) {
            setSteps(previous => Math.max(previous, event.steps));
          }
        }),
        subscribeWalkingLocationUpdates(event => {
          const filtered = filterWalkingLocationPoint(
            refs.current.lastLocation,
            event,
          );
          if (!filtered) return;
          refs.current.lastLocation = filtered.point;
          if (filtered.addedDistanceMeters > 0) {
            setDistanceMeters(previous => previous + filtered.addedDistanceMeters);
          }
        }),
        subscribeWalkingTrackingStatus(event => {
          if (event.kind === 'gpsPermission') {
            setGpsStatus(event.status === 'granted' ? 'available' : 'denied');
          } else if (event.kind === 'gps') {
            setGpsStatus(
              event.status === 'available' ? 'available' : 'unavailable',
            );
          } else {
            setSensorStatus(
              event.status === 'available' ? 'available' : 'unavailable',
            );
          }
        }),
      );

      const result = await startNativeWalkingTracking(
        session.clientSessionId,
        session.steps,
        session.distanceMeters,
        permissions.enableSteps,
      );
      setSteps(previous => Math.max(previous, session.steps));
      setDistanceMeters(previous =>
        Math.max(previous, session.distanceMeters),
      );
      setSensorStatus(result.stepsAvailable ? 'available' : 'unavailable');
      setGpsStatus(
        !permissions.enableGps
          ? 'denied'
          : result.gpsAvailable
            ? 'available'
            : 'unavailable',
      );
    },
    [setDistanceMeters, setGpsStatus, setSensorStatus, setSteps],
  );

  const syncNativeSnapshot = useCallback(
    async (session: WalkingWorkout) => {
      const snapshot = await getNativeWalkingTrackingSnapshot();
      if (snapshot.sessionId !== session.clientSessionId) return session;

      const nextSteps = Math.max(session.steps, snapshot.steps);
      const nextDistance = Math.max(
        session.distanceMeters,
        snapshot.distanceMeters,
      );
      setSteps(nextSteps);
      setDistanceMeters(nextDistance);
      refs.current.latestMetrics = {
        steps: nextSteps,
        distanceMeters: nextDistance,
      };

      if (
        session.status === 'IN_PROGRESS' &&
        (nextSteps > session.steps || nextDistance > session.distanceMeters)
      ) {
        const updated = await updateWalkingWorkout(
          session.id,
          nextSteps,
          nextDistance,
        );
        setWorkout(updated);
        refs.current.workout = updated;
        return updated;
      }
      return session;
    },
    [setDistanceMeters, setSteps, setWorkout],
  );

  const pauseCurrentWorkout = useCallback(async () => {
    const activeWorkout = refs.current.workout;
    if (
      !activeWorkout ||
      activeWorkout.status !== 'IN_PROGRESS' ||
      refs.current.busy
    ) {
      return;
    }

    refs.current.busy = true;
    setBusy(true);
    stopWalkingTrackingSubscriptions(refs.current.subscriptions);
    try {
      await stopNativeWalkingTracking();
      const snapshot = await getNativeWalkingTrackingSnapshot();
      const finalSteps =
        snapshot.sessionId === activeWorkout.clientSessionId
          ? Math.max(refs.current.latestMetrics.steps, snapshot.steps)
          : refs.current.latestMetrics.steps;
      const finalDistanceMeters =
        snapshot.sessionId === activeWorkout.clientSessionId
          ? Math.max(
              refs.current.latestMetrics.distanceMeters,
              snapshot.distanceMeters,
            )
          : refs.current.latestMetrics.distanceMeters;
      refs.current.latestMetrics = {
        steps: finalSteps,
        distanceMeters: finalDistanceMeters,
      };
      setSteps(finalSteps);
      setDistanceMeters(finalDistanceMeters);
      await updateWalkingWorkout(
        activeWorkout.id,
        finalSteps,
        finalDistanceMeters,
      );
      const paused = await pauseWalkingWorkoutRequest(activeWorkout.id);
      setWorkout(paused);
      refs.current.workout = paused;
    } catch (pauseError) {
      setError(
        pauseError instanceof Error
          ? pauseError.message
          : 'Không thể tạm dừng buổi đi bộ.',
      );
    } finally {
      refs.current.busy = false;
      setBusy(false);
    }
  }, [
    setBusy,
    setDistanceMeters,
    setError,
    setSteps,
    setWorkout,
  ]);

  const loadActiveWorkout = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const activeWorkout = await getActiveWalkingWorkout();
      if (!activeWorkout) {
        const snapshot = await getNativeWalkingTrackingSnapshot();
        if (snapshot.sessionId) {
          await stopNativeWalkingTracking();
          await clearNativeWalkingSession(snapshot.sessionId);
        }
        setWorkout(null);
        refs.current.workout = null;
        setSteps(0);
        setDistanceMeters(0);
        setGpsStatus('checking');
        setSensorStatus('checking');
        return;
      }

      setWorkout(activeWorkout);
      refs.current.workout = activeWorkout;
      setSteps(activeWorkout.steps);
      setDistanceMeters(activeWorkout.distanceMeters);
      if (activeWorkout.status === 'IN_PROGRESS') {
        const permissions = await requestWalkingPermissions();
        if (Platform.OS === 'android' && !permissions.enableGps) {
          const paused = await pauseWalkingWorkoutRequest(activeWorkout.id);
          setWorkout(paused);
          refs.current.workout = paused;
          throw new Error(
            'Buổi đi bộ đã tạm dừng vì quyền vị trí bị tắt. Hãy cấp lại quyền để tiếp tục theo dõi nền.',
          );
        }
        const snapshot = await getNativeWalkingTrackingSnapshot();
        if (
          snapshot.sessionId === activeWorkout.clientSessionId &&
          snapshot.running &&
          Date.now() - snapshot.lastUpdateAt <= 45_000
        ) {
          const current = await syncNativeSnapshot(activeWorkout);
          await attachSensors(current);
        } else if (
          Date.now() - new Date(activeWorkout.lastActiveAt).getTime() > 45_000
        ) {
          await stopNativeWalkingTracking();
          const paused = await pauseWalkingWorkoutRequest(activeWorkout.id);
          setWorkout(paused);
          refs.current.workout = paused;
        } else {
          await attachSensors(activeWorkout, permissions);
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải buổi đi bộ hiện tại.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    attachSensors,
    setDistanceMeters,
    setError,
    setGpsStatus,
    setLoading,
    setSensorStatus,
    setSteps,
    setWorkout,
    syncNativeSnapshot,
  ]);

  const startWorkout = useCallback(async (weightKg?: number) => {
    if (refs.current.busy) return;
    refs.current.busy = true;
    setBusy(true);
    setError('');
    let startedSession: WalkingWorkout | null = null;
    try {
      const permissions = await requestWalkingPermissions();
      if (Platform.OS === 'android' && !permissions.enableGps) {
        throw new Error(
          'Để theo dõi khi khóa màn hình trên Android, hãy cấp quyền vị trí rồi thử lại.',
        );
      }
      startedSession = await startWalkingWorkoutRequest(
        createWalkingClientSessionId(),
        weightKg,
      );
      setWorkout(startedSession);
      refs.current.workout = startedSession;
      setSteps(startedSession.steps);
      setDistanceMeters(startedSession.distanceMeters);
      await attachSensors(startedSession, permissions);
    } catch (startError) {
      stopWalkingTrackingSubscriptions(refs.current.subscriptions);
      let cleanupError = '';
      try {
        await stopNativeWalkingTracking();
      } catch (stopError) {
        cleanupError =
          stopError instanceof Error
            ? stopError.message
            : 'Không thể dừng cảm biến.';
      }
      if (startedSession) {
        try {
          await finishWalkingWorkoutRequest(startedSession.id);
        } catch (finishError) {
          cleanupError = [
            cleanupError,
            finishError instanceof Error
              ? `Không thể hủy buổi tập chưa khởi động: ${finishError.message}`
              : 'Không thể hủy buổi tập chưa khởi động.',
          ]
            .filter(Boolean)
            .join(' ');
        }
        try {
          await clearNativeWalkingSession(startedSession.clientSessionId);
        } catch (clearError) {
          cleanupError = [
            cleanupError,
            clearError instanceof Error
              ? `Không thể xóa phiên theo dõi: ${clearError.message}`
              : 'Không thể xóa phiên theo dõi.',
          ]
            .filter(Boolean)
            .join(' ');
        }
      }
      setWorkout(null);
      refs.current.workout = null;
      refs.current.latestMetrics = { steps: 0, distanceMeters: 0 };
      setSteps(0);
      setDistanceMeters(0);
      setError(
        [
          startError instanceof Error
            ? startError.message
            : 'Không thể bắt đầu buổi đi bộ.',
          cleanupError,
        ]
          .filter(Boolean)
          .join(' '),
      );
    } finally {
      refs.current.busy = false;
      setBusy(false);
    }
  }, [
    attachSensors,
    setBusy,
    setError,
    setWorkout,
    setSteps,
    setDistanceMeters,
  ]);

  const pauseWorkout = useCallback(async () => {
    await pauseCurrentWorkout();
  }, [pauseCurrentWorkout]);

  const resumeWorkout = useCallback(async () => {
    const current = refs.current.workout;
    if (!current || current.status !== 'PAUSED' || refs.current.busy) return;
    refs.current.busy = true;
    setBusy(true);
    setError('');
    try {
      const permissions = await requestWalkingPermissions();
      if (Platform.OS === 'android' && !permissions.enableGps) {
        throw new Error(
          'Để tiếp tục theo dõi nền trên Android, hãy cấp quyền vị trí.',
        );
      }
      const resumed = await resumeWalkingWorkoutRequest(current.id);
      setWorkout(resumed);
      refs.current.workout = resumed;
      await attachSensors(resumed, permissions);
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : 'Không thể tiếp tục buổi đi bộ.',
      );
    } finally {
      refs.current.busy = false;
      setBusy(false);
    }
  }, [attachSensors, setBusy, setError, setWorkout]);

  const finishWorkout = useCallback(async () => {
    const current = refs.current.workout;
    if (
      !current ||
      current.status === 'FINISHED' ||
      refs.current.busy
    ) {
      return null;
    }
    refs.current.busy = true;
    setBusy(true);
    setError('');
    stopWalkingTrackingSubscriptions(refs.current.subscriptions);
    try {
      await stopNativeWalkingTracking();
      const snapshot = await getNativeWalkingTrackingSnapshot();
      const finalSteps =
        snapshot.sessionId === current.clientSessionId
          ? Math.max(refs.current.latestMetrics.steps, snapshot.steps)
          : refs.current.latestMetrics.steps;
      const finalDistanceMeters =
        snapshot.sessionId === current.clientSessionId
          ? Math.max(
              refs.current.latestMetrics.distanceMeters,
              snapshot.distanceMeters,
            )
          : refs.current.latestMetrics.distanceMeters;
      refs.current.latestMetrics = {
        steps: finalSteps,
        distanceMeters: finalDistanceMeters,
      };
      setSteps(finalSteps);
      setDistanceMeters(finalDistanceMeters);
      if (current.status === 'IN_PROGRESS') {
        await updateWalkingWorkout(
          current.id,
          finalSteps,
          finalDistanceMeters,
        );
      }
      const finished = await finishWalkingWorkoutRequest(current.id);
      setWorkout(finished);
      refs.current.workout = finished;
      await clearNativeWalkingSession(current.clientSessionId);
      return finished;
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : 'Không thể kết thúc buổi đi bộ.',
      );
      return null;
    } finally {
      refs.current.busy = false;
      setBusy(false);
    }
  }, [setBusy, setDistanceMeters, setError, setSteps, setWorkout]);

  useFocusEffect(
    useCallback(() => {
      loadActiveWorkout();
    }, [loadActiveWorkout]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      const current = refs.current.workout;
      if (
        nextState === 'active' &&
        current?.status === 'IN_PROGRESS' &&
        !refs.current.busy
      ) {
        syncNativeSnapshot(current).catch(syncError => {
          setError(
            syncError instanceof Error
              ? syncError.message
              : 'Không thể đồng bộ dữ liệu đi bộ chạy nền.',
          );
        });
      }
    });
    return () => subscription.remove();
  }, [setError, syncNativeSnapshot]);

  useEffect(() => {
    if (workout?.status !== 'IN_PROGRESS') return undefined;
    const clockInterval = setInterval(() => setClock(Date.now()), 1000);
    const progressInterval = setInterval(() => {
      const current = refs.current.workout;
      if (
        !current ||
        current.status !== 'IN_PROGRESS' ||
        refs.current.busy
      ) {
        return;
      }
      updateWalkingWorkout(
        current.id,
        refs.current.latestMetrics.steps,
        refs.current.latestMetrics.distanceMeters,
      )
        .then(updated => {
          setWorkout(updated);
          refs.current.workout = updated;
        })
        .catch(progressError => {
          setError(
            progressError instanceof Error
              ? progressError.message
              : 'Không thể đồng bộ tiến trình đi bộ.',
          );
        });
    }, 20_000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(progressInterval);
    };
  }, [
    setClock,
    setError,
    setWorkout,
    workout?.id,
    workout?.status,
  ]);

  useEffect(
    () => () => {
      stopWalkingTrackingSubscriptions(refs.current.subscriptions);
    },
    [],
  );

  const durationSeconds = workout
    ? Math.max(
        0,
        Math.floor(
          ((workout.status === 'PAUSED' && workout.pausedAt
            ? new Date(workout.pausedAt).getTime()
            : workout.status === 'FINISHED' && workout.endedAt
              ? new Date(workout.endedAt).getTime()
              : clock) -
            new Date(workout.startedAt).getTime() -
            workout.pausedDurationSeconds * 1000) /
            1000,
        ),
      )
    : 0;

  return {
    workout,
    steps,
    distanceMeters,
    durationSeconds,
    loading,
    busy,
    error,
    gpsStatus,
    sensorStatus,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    finishWorkout,
    refresh: loadActiveWorkout,
  };
};

export default useWalkingWorkout;

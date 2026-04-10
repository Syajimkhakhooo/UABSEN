const LOGIN_THROTTLE_STORAGE_KEY = 'uabsen.login-throttle';
export const LOGIN_FAILURE_LIMIT = 3;
export const LOGIN_LOCK_DURATION_MS = 5 * 60 * 1000;

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function formatRemainingTime(remainingMs) {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readThrottleStore() {
  try {
    const raw = localStorage.getItem(LOGIN_THROTTLE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeThrottleStore(store) {
  try {
    localStorage.setItem(LOGIN_THROTTLE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* localStorage tidak tersedia */
  }
}

function cleanupStore(store) {
  const now = Date.now();
  const nextStore = { ...store };

  Object.entries(nextStore).forEach(([email, value]) => {
    const lockedUntil = Number(value?.lockedUntil ?? 0);
    const failures = Number(value?.failures ?? 0);

    if ((!lockedUntil || lockedUntil <= now) && failures <= 0) {
      delete nextStore[email];
    }
  });

  return nextStore;
}

function getEntry(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { email: '', failures: 0, lockedUntil: 0 };
  }

  const store = cleanupStore(readThrottleStore());
  writeThrottleStore(store);

  return {
    email: normalizedEmail,
    failures: Number(store[normalizedEmail]?.failures ?? 0),
    lockedUntil: Number(store[normalizedEmail]?.lockedUntil ?? 0),
  };
}

export function getLoginLockState(email) {
  const entry = getEntry(email);
  const now = Date.now();
  const remainingMs = Math.max(0, entry.lockedUntil - now);
  const locked = remainingMs > 0;

  return {
    email: entry.email,
    failures: entry.failures,
    lockedUntil: locked ? entry.lockedUntil : 0,
    remainingMs,
    remainingText: locked ? formatRemainingTime(remainingMs) : '',
    message: locked
      ? `Terlalu banyak percobaan login. Coba lagi dalam ${formatRemainingTime(remainingMs)}.`
      : '',
  };
}

export function registerFailedLoginAttempt(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return getLoginLockState(email);
  }

  const store = cleanupStore(readThrottleStore());
  const current = store[normalizedEmail] ?? { failures: 0, lockedUntil: 0 };
  const nextFailures = Number(current.failures ?? 0) + 1;

  store[normalizedEmail] = {
    failures: nextFailures,
    lockedUntil: 0,
  };

  writeThrottleStore(store);
  return getLoginLockState(normalizedEmail);
}

export function activateLoginLockIfNeeded(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return getLoginLockState(email);
  }

  const store = cleanupStore(readThrottleStore());
  const current = store[normalizedEmail] ?? { failures: 0, lockedUntil: 0 };
  const lockedUntil = Number(current.lockedUntil ?? 0);

  if (lockedUntil > Date.now()) {
    writeThrottleStore(store);
    return getLoginLockState(normalizedEmail);
  }

  if (Number(current.failures ?? 0) < LOGIN_FAILURE_LIMIT) {
    writeThrottleStore(store);
    return getLoginLockState(normalizedEmail);
  }

  store[normalizedEmail] = {
    failures: 0,
    lockedUntil: Date.now() + LOGIN_LOCK_DURATION_MS,
  };

  writeThrottleStore(store);
  return getLoginLockState(normalizedEmail);
}

export function clearFailedLoginAttempts(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const store = cleanupStore(readThrottleStore());
  delete store[normalizedEmail];
  writeThrottleStore(store);
}

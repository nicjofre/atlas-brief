// The email check every signup surface shares, browser and server. Loose on
// the local part (real addresses are odd), strict on the domain: every label
// must be non-empty, so "name@gmail.com." (a trailing-dot typo that slipped
// through on 2026-11-02 and created a duplicate subscriber), "name@gmail..com"
// and "name@.com" are all rejected.
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

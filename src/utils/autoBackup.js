/**
 * Automatic Daily Backups — saves all overrides to localStorage daily
 */

const BACKUP_KEY = 'apex-daily-backup-v1';
const BACKUP_DATE_KEY = 'apex-backup-date-v1';

export function shouldBackup() {
  try {
    const lastBackup = localStorage.getItem(BACKUP_DATE_KEY);
    if (!lastBackup) return true;
    const lastDate = new Date(lastBackup);
    const now = new Date();
    return now.toDateString() !== lastDate.toDateString();
  } catch { return true; }
}

export function createBackup(data) {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data));
    localStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
    console.log('[APEX] Daily backup created');
  } catch { /* ignore */ }
}

export function loadBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getBackupDate() {
  try {
    return localStorage.getItem(BACKUP_DATE_KEY) || null;
  } catch { return null; }
}

// Auto-backup if needed
export function autoBackupIfNeeded(dataProvider) {
  if (shouldBackup() && dataProvider) {
    const data = dataProvider();
    if (data) createBackup(data);
  }
}

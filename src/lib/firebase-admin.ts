import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let adminAuthInstance: any = null;

try {
  if (!getApps().length) {
    let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      try {
        const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(raw);
          projectId = config.projectId;
        }
      } catch {
        // config file might not exist in some environments
      }
    }

    if (projectId) {
      initializeApp({ projectId });
    }
  }

  if (getApps().length > 0) {
    adminAuthInstance = getAuth();
  }
} catch (err) {
  console.warn('Firebase admin initialization notice:', err);
}

export const adminAuth = adminAuthInstance;


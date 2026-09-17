import { createExpressApp } from '../src/serverApp.ts';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  return app(req, res);
}


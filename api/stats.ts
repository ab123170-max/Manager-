/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleGetStats } from "./analyticsHandlers";

export default async function handler(req: any, res: any) {
  return handleGetStats(req, res);
}

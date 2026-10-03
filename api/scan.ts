/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleScan } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  return handleScan(req, res);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleHealth } from "./_shared";

export default async function handler(req: any, res: any) {
  return handleHealth(req, res);
}

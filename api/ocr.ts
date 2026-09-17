/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleOcr } from "./_shared";

export default async function handler(req: any, res: any) {
  return handleOcr(req, res);
}

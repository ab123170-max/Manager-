/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleProductLookup } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  return handleProductLookup(req, res);
}

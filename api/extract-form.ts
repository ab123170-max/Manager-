/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleExtractForm } from "./_shared.ts";

export default async function handler(req: any, res: any) {
  return handleExtractForm(req, res);
}

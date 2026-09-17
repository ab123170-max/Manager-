/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { handleSuperviseBarcodePipeline } from "./_shared";

export default async function handler(req: any, res: any) {
  return handleSuperviseBarcodePipeline(req, res);
}

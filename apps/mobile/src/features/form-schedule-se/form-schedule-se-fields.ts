import scheduleSEFieldsJson from "./schedule-se-fields.2025.json";

import type { ExtractedTaxFormFieldAsset } from "../tax-form-common/types";

const scheduleSEFieldAsset = scheduleSEFieldsJson as unknown as ExtractedTaxFormFieldAsset;

export const scheduleSEFields = scheduleSEFieldAsset.fields;
export const scheduleSEExcludedFields = scheduleSEFieldAsset.excludedFields;
export const scheduleSEFieldCount = scheduleSEFieldAsset.numberOfFields;

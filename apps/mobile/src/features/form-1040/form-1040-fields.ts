import form1040FieldsJson from "./form-1040-fields.2025.json";

import type { ExtractedTaxFormFieldAsset } from "../tax-form-common/types";

const form1040FieldAsset = form1040FieldsJson as unknown as ExtractedTaxFormFieldAsset;

export const form1040Fields = form1040FieldAsset.fields;
export const form1040ExcludedFields = form1040FieldAsset.excludedFields;
export const form1040FieldCount = form1040FieldAsset.numberOfFields;

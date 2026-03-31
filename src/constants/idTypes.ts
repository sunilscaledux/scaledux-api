export const ID_TYPES = [
  // { value: 'passport', label: 'Passport' },
  // { value: 'driving-license', label: "Driver's License" },
  { value: 'aadhaar-card', label: 'Aadhaar Card' },
  { value: 'pan-card', label: 'PAN Card' },
  // { value: 'citizen-card', label: 'Citizenship Card' },
  // { value: 'other-government-id', label: 'Other Government-Issued ID' },
] as const;

export type IdTypeValue = (typeof ID_TYPES)[number]['value'];

const validValues = new Set<string>(ID_TYPES.map((t) => t.value));

export function isValidIdType(value: string | null | undefined): boolean {
  if (value == null || value === '') return false;
  return validValues.has(value);
}

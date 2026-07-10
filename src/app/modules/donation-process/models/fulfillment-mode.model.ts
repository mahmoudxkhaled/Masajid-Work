export const FulfillmentMode = {
  SelfFulfillment: 1,
  ViaCharityRepresentative: 2,
} as const;

export type FulfillmentModeValue = (typeof FulfillmentMode)[keyof typeof FulfillmentMode];

export function requiresCharityEntity(mode: number): boolean {
  return mode === FulfillmentMode.ViaCharityRepresentative;
}

export function isValidFulfillmentMode(mode: number): boolean {
  return mode === FulfillmentMode.SelfFulfillment || mode === FulfillmentMode.ViaCharityRepresentative;
}

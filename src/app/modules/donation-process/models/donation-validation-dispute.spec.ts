import { DonationRequestStatusId, isDonationRequestClosingStatus } from './donation-request-status.model';
import { canSubmitDonationValidation } from './donation-validation.model';

describe('community validation dispute helpers', () => {
  it('treats only rejected, broken down, closed, and cancelled as closing statuses', () => {
    expect(isDonationRequestClosingStatus(DonationRequestStatusId.Rejected)).toBeTrue();
    expect(isDonationRequestClosingStatus(DonationRequestStatusId.BrokenDown)).toBeTrue();
    expect(isDonationRequestClosingStatus(DonationRequestStatusId.Closed)).toBeTrue();
    expect(isDonationRequestClosingStatus(DonationRequestStatusId.Cancelled)).toBeTrue();
    expect(isDonationRequestClosingStatus(DonationRequestStatusId.FulfillmentDisputed)).toBeFalse();
  });

  it('allows the first validation while the request is open for validation', () => {
    expect(canSubmitDonationValidation(DonationRequestStatusId.OpenForValidation, 100, [])).toBeTrue();
  });

  it('allows a different user to validate a disputed fulfillment', () => {
    expect(
      canSubmitDonationValidation(DonationRequestStatusId.FulfillmentDisputed, 200, [100]),
    ).toBeTrue();
  });

  it('blocks the first validator from validating the disputed fulfillment again', () => {
    expect(
      canSubmitDonationValidation(DonationRequestStatusId.FulfillmentDisputed, 100, [100]),
    ).toBeFalse();
  });
});

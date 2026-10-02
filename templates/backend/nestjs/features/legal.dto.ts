import { IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

/** Checked unless missing or empty (an empty string resets the field to its default). */
const sent = (_: object, value: unknown) => value !== undefined && value !== '';

/** Only the fields that are sent change. */
export class UpdateLegalDto {
  @ValidateIf(sent)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  termsUrl?: string;

  @ValidateIf(sent)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  privacyPolicyUrl?: string;

  @ValidateIf(sent)
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  deleteAccountUrl?: string;

  @ValidateIf(sent)
  @IsString()
  @MaxLength(500_000)
  termsHtml?: string;

  @ValidateIf(sent)
  @IsString()
  @MaxLength(500_000)
  privacyPolicyHtml?: string;

  @ValidateIf(sent)
  @IsString()
  @MaxLength(500_000)
  deleteAccountHtml?: string;
}

// ── responses (documentation) ────────────────────────────────────────────────

export class LegalDto {
  termsUrl: string;
  privacyPolicyUrl: string;
  deleteAccountUrl: string | null;
  /** Saved in the admin panel – null: public/terms-and-conditions.html. */
  termsHtml: string | null;
  privacyPolicyHtml: string | null;
  deleteAccountHtml: string | null;
}

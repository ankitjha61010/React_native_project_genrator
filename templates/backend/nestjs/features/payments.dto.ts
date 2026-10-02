{{#if GATEWAY}}
import { Type } from 'class-transformer';
{{/if}}
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength{{#if IAP_NATIVE}}, ValidateIf{{/if}} } from 'class-validator';
import { PRODUCT_KINDS, type ProductKind{{#if GATEWAY}}, PAYMENT_STATUSES, type PaymentStatus{{/if}} } from '{{IMPORT:domain.payments}}';
import { PageQueryDto } from '{{IMPORT:nest.commonDto}}';

const ACCESS_LEVEL = /^[a-z0-9_-]{1,64}$/;

export class ProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description: string | null = null;

  @IsIn(PRODUCT_KINDS)
  kind: ProductKind = 'one_time';

  /** Minor units – 999 = 9.99. */
  @IsInt()
  @Min(0)
  price: number;

  /** ISO 4217, e.g. USD. */
  @Matches(/^[A-Za-z]{3}$/)
  currency: string;

  @Matches(ACCESS_LEVEL)
  accessLevel: string = 'premium';

  /** Access lasts this many days; null = forever. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36500)
  durationDays: number | null = null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  appleProductId: string | null = null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  googleProductId: string | null = null;

  @IsBoolean()
  active: boolean = true;

  @IsInt()
  sortOrder: number = 0;
}

/** PATCH: every field optional (no defaults – only what is sent changes). */
export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsIn(PRODUCT_KINDS) kind?: ProductKind;
  @IsOptional() @IsInt() @Min(0) price?: number;
  @IsOptional() @Matches(/^[A-Za-z]{3}$/) currency?: string;
  @IsOptional() @Matches(ACCESS_LEVEL) accessLevel?: string;
  @IsOptional() @IsInt() @Min(1) @Max(36500) durationDays?: number | null;
  @IsOptional() @IsString() @MaxLength(200) appleProductId?: string | null;
  @IsOptional() @IsString() @MaxLength(200) googleProductId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class ProductsQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  all?: 'true' | 'false';
}

export class EntitlementsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}

export class GrantEntitlementDto {
  @IsString()
  @MaxLength(64)
  userId: string;

  @Matches(ACCESS_LEVEL)
  accessLevel: string = 'premium';

  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  productId?: string | null;
}
{{#if GATEWAY}}

export class CheckoutDto {
  @IsString()
  @MaxLength(64)
  productId: string;
}

export class PaymentsQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}

export class RefundDto {
  /** Minor units; empty = everything left. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;
}
{{/if}}
{{#if IAP}}

export class PurchasesQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;
}
{{/if}}
{{#if IAP_NATIVE}}

export class VerifyPurchaseDto {
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @IsString()
  @MaxLength(200)
  productId: string;

  /** iOS: the StoreKit transaction id (required on iOS). */
  @ValidateIf((dto: VerifyPurchaseDto) => dto.platform === 'ios' || dto.transactionId !== undefined)
  @IsString()
  @MaxLength(255)
  transactionId?: string;

  /** Android: the Play Billing purchase token (required on Android). */
  @ValidateIf((dto: VerifyPurchaseDto) => dto.platform === 'android' || dto.purchaseToken !== undefined)
  @IsString()
  @MaxLength(4096)
  purchaseToken?: string;

  @IsOptional()
  @IsIn(['in-app', 'subs'])
  type?: 'in-app' | 'subs';
}
{{/if}}

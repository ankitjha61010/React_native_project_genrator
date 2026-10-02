/**
 * Every JSON file inside `locales/<language>/` is one translation file, named after the file:
 *
 *   locales/en/home.json  { "pickImage": "Pick an image" }  ->  <AppText intlType="home" value="pickImage" />
 *   locales/hi/home.json  same key, Hindi text
 *
 * Keys are flat (no nesting) and only need to be unique inside their own file.
 * Adding a new file (e.g. `cart.json`): create it for EVERY language and add it below.
 * The `translations` test fails on a missing or nested key.
 */
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enOrder from './locales/en/order.json';
import enProduct from './locales/en/product.json';
{{#if PAYMENTS}}
import enPayments from './locales/en/payments.json';
{{/if}}
{{#if RTL}}
import arAuth from './locales/ar/auth.json';
import arCommon from './locales/ar/common.json';
import arHome from './locales/ar/home.json';
import arOrder from './locales/ar/order.json';
import arProduct from './locales/ar/product.json';
{{#if PAYMENTS}}
import arPayments from './locales/ar/payments.json';
{{/if}}
{{/if}}
import hiAuth from './locales/hi/auth.json';
import hiCommon from './locales/hi/common.json';
import hiHome from './locales/hi/home.json';
import hiOrder from './locales/hi/order.json';
import hiProduct from './locales/hi/product.json';
{{#if PAYMENTS}}
import hiPayments from './locales/hi/payments.json';
{{/if}}

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    product: enProduct,
    order: enOrder,
{{#if PAYMENTS}}
    payments: enPayments,
{{/if}}
  },
  hi: {
    common: hiCommon,
    auth: hiAuth,
    home: hiHome,
    product: hiProduct,
    order: hiOrder,
{{#if PAYMENTS}}
    payments: hiPayments,
{{/if}}
  },
{{#if RTL}}
  ar: {
    common: arCommon,
    auth: arAuth,
    home: arHome,
    product: arProduct,
    order: arOrder,
{{#if PAYMENTS}}
    payments: arPayments,
{{/if}}
  },
{{/if}}
} as const;

/** English is the source of truth for files, keys and types. */
export type TranslationResources = (typeof resources)['en'];

/** A translation file: "common", "auth", "home"… */
export type Namespace = keyof TranslationResources;

export const NAMESPACES = Object.keys(resources.en) as Namespace[];

export const DEFAULT_NAMESPACE: Namespace = 'common';

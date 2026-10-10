import { z } from "zod";

// US geographic mobile/fixed-line numbering pattern from Google libphonenumber metadata,
// inspected 2026-10-10 (Apache-2.0, Copyright The Libphonenumber Authors).
// Source: https://github.com/google/libphonenumber/blob/master/resources/PhoneNumberMetadata.xml
// License copy: third-party/google-libphonenumber-LICENSE.txt
// +1 is shared by NANP countries: do not silently enable Canada or Caribbean destinations.
// Keep this pattern aligned with identity_private.mobile_us_destination in the migration.
const usNationalPattern =
  "983[2-57-9][0-9]{6}|(?:2(?:0[1-35-9]|1[02-9]|2[03-57-9]|3[1459]|4[08]|5[1-46]|6[0279]|7[02469]|8[13])|3(?:0[1-57-9]|1[02-9]|2[013-79]|3[0-24679]|4[167]|5[0-3]|6[01349]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[02589]|8[04])|5(?:0[1-57-9]|1[0235-8]|20|3[0149]|4[01]|5[179]|6[1-47]|7[0-5]|8[0256])|6(?:0[1-35-9]|1[024-9]|2[03689]|3[016]|4[0156]|5[01679]|6[0-279]|78|8[0-269])|7(?:0[1-46-8]|1[2-9]|2[04-8]|3[0-2478]|4[0378]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[0168]|3[0-2589]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[01357-9]|5[12469]|7[0-3589]|8[04-69]))[2-9][0-9]{6}";
const usPhone = new RegExp(`^\\+1(?:${usNationalPattern})$`);

export function mobileInvitationDestination(phone: string): "ZA" | "US" | null {
  if (phone !== phone.trim()) return null;
  if (/^\+27[0-9]{9}$/.test(phone)) return "ZA";
  return usPhone.test(phone) ? "US" : null;
}

export const mobileInvitationDestinationSchema = z
  .string()
  .refine((phone) => mobileInvitationDestination(phone) !== null);

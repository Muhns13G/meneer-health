import { companyProfile } from "./company-profile";

/** Derive a successor body; never mutate an original publication or acceptance receipt. */
export function replacePilotCompanyIdentity(original: string): string {
  if (!original.includes("OCTOTHORP ZA") || !original.trim())
    throw new Error("COMPANY_NOTICE_PREDECESSOR_REJECTED");
  const successor = original
    .replace(
      "K2024185008,\nVAT number 9279262266. Our supplied contact address is",
      `${companyProfile.registrationNumber}. Our registered office is`,
    )
    .replace("K2024185008, VAT number 9279262266,", `${companyProfile.registrationNumber},`)
    .replaceAll("K2024185008", companyProfile.registrationNumber)
    .replaceAll("OCTOTHORP ZA", companyProfile.legalName)
    .replaceAll("De Chatillon Cres - Onrus, 7201,\nSouth Africa", companyProfile.registeredAddress)
    .replaceAll("De Chatillon Cres - Onrus, 7201, South Africa", companyProfile.registeredAddress)
    .replaceAll("De Chatillon Cres - Onrus, 7201", companyProfile.registeredAddress)
    .replaceAll("supplied\ncontact address", "registered\noffice address")
    .replaceAll("supplied contact address", "registered office address");
  if (/OCTOTHORP ZA|K2024185008|9279262266|De Chatillon|VAT number/.test(successor))
    throw new Error("COMPANY_NOTICE_UNRECOGNISED_TAX_OR_ADDRESS_LAYOUT");
  return successor;
}

/** Owner / distributor company profile — this ERP is built for this business. */
export const COMPANY = {
  legalName: 'Dissanayake Enterprise (Pvt) Ltd',
  tradingAs: 'Seirra Cables',
  displayName: 'Dissanayake Enterprise (Pvt) Ltd – Seirra Cables',
  shortName: 'Dissanayake Enterprise',
  address: '9 Cannel, Mahanilubewa, Hidogama, Anuradhapura, Sri Lanka',
  phone: '+94 77 777 9548',
  email: 'Dissanayakenr@gmail.com',
  country: 'Sri Lanka',
  productName: 'Distribution ERP',
  tagline: 'Distributor ERP for Seirra Cables',
} as const;

export function companyContactLine(): string {
  return `Tel: ${COMPANY.phone} | Email: ${COMPANY.email}`;
}

export function companyFooter(): string {
  return `${COMPANY.displayName} · ${COMPANY.address}`;
}

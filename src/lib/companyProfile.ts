/** Owner / distributor company profile — this ERP is built for this business. */
export const COMPANY = {
  legalName: 'Dissanayake Enterprises',
  tradingAs: 'Sierra Cables Distributor',
  displayName: 'Dissanayake Enterprises',
  shortName: 'Dissanayake',
  address: '9 Cannel, Mahanilubewa, Hidogama, Anuradhapura, Sri Lanka',
  phone: '+94 77 777 9548',
  email: 'Dissanayakenr@gmail.com',
  country: 'Sri Lanka',
  productName: 'Distribution ERP',
  tagline: 'Your one-stop shop for all your hardware needs',
  logoPath: '/logo.png',
  iconPath: '/app-icon.png',
} as const;

export function companyContactLine(): string {
  return `Tel: ${COMPANY.phone} | Email: ${COMPANY.email}`;
}

export function companyFooter(): string {
  return `${COMPANY.displayName} · ${COMPANY.address}`;
}

export default interface PersonDetailData{
  2022: string;
  2023: string;
  Sachbezug: string;
  buildingOrRoom: string;
  Dienstkleidung: string;
  permanentEstablishment: { name: string, id: string, address: unknown[] };
  Tarifeinstufung: string;
  reasonForGivingNotice: string,
  position: string;
  privateMobilePhoneNumber: string;
  address: {
    country: string,
    phone: string,
    street: string,
    additionalData: string,
    streetNumber: string,
    internationalCountryCode: string,
    countryCode: string,
    zipCode: string;
    city: string;
  },
  isActive: true,
  'Im Arbeitsfeld': string;
  privateEmail: string;
  firstName: string;
  organizationUnit: { number: string, name: string, countryCode: string };
  personnelNumber: string;
  'Weitere Kostenstellen': string;
  highestProfessionalQualificationId: string;
  joinDate: string
  officePhoneNumber: string;
  'Pause im Arbeitsfeld': string;
  personLicenseNumber: string;
  highestLevelOfEducationId: string;
  'Kleidergröße': string;
  workSchedule: {
    workingDays: string[];
    weeklyWorkingHours: string;
    name: string;
    key: string;
  };
  nationality: 'Germany',
  taxpayerIdentificationNumber: string;
  'wöchentliche Stundenzahl': string;
  'Kost 2': string;
  employmentType: string;
  gender: string;
  accountPayable: string;
  lastName: string;
  'Kost 3': string;
  Stundenanzahl: string;
  triggerForGivingNotice: string;
  personIdentifierForKiosk: string;
  historicizedData: {
    employment: string[],
    healthInsurance: string[],
    address: string[],
    severeDisability: string[],
    workSchedule: string[]
  },
  profilePictureUrl: string;
  Pate: string;
  title: string;
  email: string;
  'Kost 4': string;
  companyMobilePhoneNumber: string;
  personId:string;
  socialSecurityNumber: string;
  countryCode: string;
  'Kost 1': string;
  Arbeitsort: string;
}
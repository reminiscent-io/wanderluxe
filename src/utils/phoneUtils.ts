export const formatInternationalPhone = (
  internationalNumber?: string | null,
  formattedNumber?: string | null
): string => {
  return internationalNumber || formattedNumber || '';
};
export const CUSDT_DECIMALS = 1_000_000n;

export function formatCusdt(value: bigint) {
  const whole = value / CUSDT_DECIMALS;
  const fraction = value % CUSDT_DECIMALS;
  const fractionString = fraction.toString().padStart(6, '0');
  return `${whole}.${fractionString}`;
}

export function shortHex(value: string | null | undefined, visibleChars = 6) {
  if (!value) {
    return '';
  }

  const cleanValue = value.toString();
  if (cleanValue.length <= visibleChars * 2) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, visibleChars)}...${cleanValue.slice(-visibleChars)}`;
}

/**
 * Pseudonymous reporter identity, used to dedupe flags.
 *
 * A plain SHA-256 of the address. The only property the flag ledger needs is
 * equality, and hashing keeps raw reporter IPs out of the database. Be clear
 * about what that buys: this is pseudonymisation, not anonymisation — an IPv4
 * address can be brute forced back out of the digest. Do not reuse it as a
 * general-purpose privacy control.
 */
export const hashIp = async (ip: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

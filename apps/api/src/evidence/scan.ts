export type ScanResult = 'CLEAN' | 'INFECTED';

// EICAR standard antivirus test signature. A real deployment streams the file to
// ClamAV or a managed AV scanner; this stub lets us prove the scan-status path.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export function scanBuffer(buffer: Buffer): ScanResult {
  return buffer.includes(EICAR) ? 'INFECTED' : 'CLEAN';
}

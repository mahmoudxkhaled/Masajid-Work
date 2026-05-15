export async function sha256FromUint8(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashedBytes = new Uint8Array(hashBuffer);
  const hexBytes = Array.from(hashedBytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  );

  return hexBytes.join('');
}


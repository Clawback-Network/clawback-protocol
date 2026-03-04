import { config } from "../config.js";

const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Pin a JSON object to IPFS via Pinata.
 * Returns the IPFS CID (content hash).
 */
export async function pinJsonToIpfs(
  json: Record<string, unknown>,
  name?: string,
): Promise<string> {
  const res = await fetch(PINATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: config.pinataApiKey,
      pinata_secret_api_key: config.pinataSecretKey,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: name ? { name } : undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata pin failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as PinataResponse;
  return data.IpfsHash;
}

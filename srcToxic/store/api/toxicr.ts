// src/api.ts
export interface Payload {
  [key: string]: number[];
}
export interface Result {
  [key: string]: number;
}

export async function processData(
  data: Payload
): Promise<Result> {
  const resp = await fetch(
    "https://connect.your.org/__api__/my‐data‐processor/process",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // If you locked the API behind a key:
        // "Authorization": "Key YOUR_CONNECT_API_KEY"
      },
      body: JSON.stringify(data),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API error: ${resp.status} ${err}`);
  }
  return resp.json() as Promise<Result>;
}

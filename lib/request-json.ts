export class RequestBodyError extends Error {
  constructor(public status: 400 | 413) {
    super(status === 413 ? "Request is too large" : "Invalid request");
  }
}

export async function readJsonObject(request: Request, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new RequestBodyError(413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400);

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        // Do not hold the response open waiting for the sender to finish.
        void reader.cancel().catch(() => {});
        throw new RequestBodyError(413);
      }
      chunks.push(value);
    }
    const value: unknown = JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new RequestBodyError(400);
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally {
    reader.releaseLock();
  }
}

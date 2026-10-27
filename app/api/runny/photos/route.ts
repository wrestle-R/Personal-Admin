import { randomUUID } from "node:crypto";
import { authenticated, sameOrigin, privateJson } from "@/lib/auth";
import { db, query } from "@/lib/db";
import { collections, cloudinaryConfig, photoCollection, photoText, readPhotoBody, verifyUpload, PhotoError } from "@/lib/runny-photos";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function failure(error: unknown) {
  return privateJson({ error: error instanceof PhotoError ? error.message : "Couldn’t save photos. Please retry." }, error instanceof PhotoError ? error.status : 503);
}

export async function GET(request: Request) {
  if (!authenticated(request)) return privateJson({ error: "Sign in required" }, 401);
  try {
    const photos = await query(`SELECT id,url,alt,caption,placement,year,month,position,deleted_at AS "deletedAt",updated_at AS "updatedAt" FROM public.runny_photos ORDER BY position,created_at,id`);
    let uploadReady = true;
    try { cloudinaryConfig(); } catch { uploadReady = false; }
    return privateJson({ photos, collections, uploadReady });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!authenticated(request)) return privateJson({ error: "Sign in required" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid origin" }, 403);
  try {
    const body = await readPhotoBody(request);
    const collection = photoCollection(body.collection);
    const { alt, caption } = photoText(body);
    const asset = await verifyUpload(body.publicId);
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(2702026)");
      await client.query(`INSERT INTO public.runny_photos(id,url,public_id,alt,caption,placement,year,month,position)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,COALESCE(MAX(position),-1)+1 FROM public.runny_photos WHERE placement=$6 AND year IS NOT DISTINCT FROM $7 AND month IS NOT DISTINCT FROM $8
        ON CONFLICT(public_id) DO NOTHING`, [randomUUID(),asset.url,asset.publicId,alt,caption,collection.placement,collection.year,collection.month]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return privateJson({ saved: true }, 201);
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!authenticated(request)) return privateJson({ error: "Sign in required" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid origin" }, 403);
  try {
    const body = await readPhotoBody(request);
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/.test(body.id)) throw new PhotoError("Invalid photo.");
    if (typeof body.updatedAt !== "string" || !Number.isFinite(Date.parse(body.updatedAt))) throw new PhotoError("Reload photos and try again.");
    const allowed = ["edit", "remove", "restore", "earlier", "later", "replace"];
    if (!allowed.includes(String(body.action))) throw new PhotoError("Invalid photo action.");
    const text = body.action === "edit" ? photoText(body) : null;
    const asset = body.action === "replace" ? await verifyUpload(body.publicId) : null;
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(2702026)");
      const { rows: [photo] } = await client.query(`SELECT * FROM public.runny_photos WHERE id=$1 FOR UPDATE`, [body.id]);
      if (!photo) throw new PhotoError("Photo not found.", 404);
      if (new Date(photo.updated_at).toISOString() !== new Date(body.updatedAt).toISOString()) throw new PhotoError("This photo changed in another tab. Reload photos and try again.", 409);
      if (body.action !== "restore" && photo.deleted_at) throw new PhotoError("Restore this photo first.", 409);
      if (body.action === "edit") {
        await client.query(`UPDATE public.runny_photos SET alt=$2,caption=$3,updated_at=clock_timestamp() WHERE id=$1`, [body.id,text!.alt,text!.caption]);
      } else if (asset) {
        await client.query(`UPDATE public.runny_photos SET url=$2,public_id=$3,updated_at=clock_timestamp() WHERE id=$1`, [body.id,asset.url,asset.publicId]);
      } else if (body.action === "remove" || body.action === "restore") {
        await client.query(`UPDATE public.runny_photos SET deleted_at=CASE WHEN $2 THEN clock_timestamp() ELSE NULL END,updated_at=clock_timestamp() WHERE id=$1`, [body.id,body.action === "remove"]);
      } else {
        const { rows } = await client.query(`SELECT id FROM public.runny_photos WHERE placement=$1 AND year IS NOT DISTINCT FROM $2 AND month IS NOT DISTINCT FROM $3 AND deleted_at IS NULL ORDER BY position,created_at,id`, [photo.placement,photo.year,photo.month]);
        const index = rows.findIndex((item) => item.id === body.id);
        const next = index + (body.action === "earlier" ? -1 : 1);
        if (next >= 0 && next < rows.length) [rows[index], rows[next]] = [rows[next], rows[index]];
        await client.query(`UPDATE public.runny_photos AS p SET position=s.ordinality-1,updated_at=clock_timestamp() FROM unnest($1::uuid[]) WITH ORDINALITY AS s(id,ordinality) WHERE p.id=s.id AND p.position IS DISTINCT FROM s.ordinality-1`, [rows.map((item) => item.id)]);
      }
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    return privateJson({ saved: true });
  } catch (error) { return failure(error); }
}

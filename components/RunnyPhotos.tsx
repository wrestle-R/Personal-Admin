"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, RefreshCw, Upload } from "lucide-react";

type Collection = { value: string; label: string; placement: string; year: number | null; month: number | null };
type Photo = { id: string; url: string; alt: string; caption: string; placement: string; year: number | null; month: number | null; position: number; deletedAt: string | null; updatedAt: string };

async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please retry.");
  return result;
}

async function uploadPhoto(file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(file.type))
    throw new Error("Choose a JPG, PNG, WebP, AVIF or GIF under 10 MB.");
  const signed = await api("/api/runny/photos/upload", "POST");
  const data = new FormData();
  data.append("file", file);
  data.append("api_key", signed.apiKey);
  data.append("signature", signed.signature);
  Object.entries(signed.params).forEach(([key, value]) => data.append(key, String(value)));
  const response = await fetch(signed.url, { method: "POST", body: data, signal: AbortSignal.timeout(120000) });
  const result = await response.json();
  if (!response.ok) throw new Error("Cloudinary couldn’t upload this photo. Please retry.");
  return result.public_id as string;
}

function PhotoRow({ photo, first, last, busy, uploadReady, onAction }: {
  photo: Photo; first: boolean; last: boolean; busy: boolean; uploadReady: boolean;
  onAction: (photo: Photo, action: string, extra?: Record<string, unknown>, file?: File) => Promise<void>;
}) {
  const [alt, setAlt] = useState(photo.alt);
  const [caption, setCaption] = useState(photo.caption);
  const replacement = useRef<HTMLInputElement>(null);
  return (
    <form className={`photo-row${photo.deletedAt ? " photo-removed" : ""}`} onSubmit={(event) => { event.preventDefault(); void onAction(photo, "edit", { alt, caption }); }}>
      {/* Cloudinary delivers these thumbnails; the original URL stays in the database. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url.replace("/image/upload/", "/image/upload/c_fill,w_240,h_240,q_auto,f_auto/")} alt={photo.alt} width={112} height={112} loading="lazy" />
      <div className="photo-fields">
        <label>Photo description<input value={alt} onChange={(event) => setAlt(event.target.value)} maxLength={240} required disabled={busy || !!photo.deletedAt} /></label>
        <label>Caption<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} rows={2} disabled={busy || !!photo.deletedAt} /></label>
        <div className="photo-row-actions">
          {photo.deletedAt ? <button type="button" disabled={busy} onClick={() => void onAction(photo, "restore")}>Restore photo</button> : <>
            <button className="primary" type="submit" disabled={busy || (alt === photo.alt && caption === photo.caption)}>Save text</button>
            <button type="button" disabled={busy || !uploadReady} onClick={() => replacement.current?.click()}>Replace photo</button>
            <input ref={replacement} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void onAction(photo, "replace", {}, file); }} />
            <button type="button" aria-label={`Move ${photo.alt} earlier`} disabled={busy || first} onClick={() => void onAction(photo, "earlier")}><ArrowUp size={15} /></button>
            <button type="button" aria-label={`Move ${photo.alt} later`} disabled={busy || last} onClick={() => void onAction(photo, "later")}><ArrowDown size={15} /></button>
            <button type="button" className="photo-remove" disabled={busy} onClick={() => void onAction(photo, "remove")}>Remove</button>
          </>}
        </div>
      </div>
    </form>
  );
}

export default function RunnyPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState("gallery");
  const [uploadReady, setUploadReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [pendingPublicId, setPendingPublicId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingReplacement = useRef<{ file: File; publicId: string } | null>(null);
  const load = useCallback(async () => {
    const result = await api("/api/runny/photos");
    setPhotos(result.photos); setCollections(result.collections); setUploadReady(result.uploadReady); setLoaded(true);
  }, []);

  useEffect(() => { void load().catch((error) => setError(error.message)); }, [load]);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
      try { await load(); } catch { setError("Saved, but couldn’t reload the photo list. Use Reload photos."); }
    } catch (error) { setError(error instanceof Error ? error.message : "Couldn’t save. Please retry."); }
    finally { setBusy(false); }
  }

  async function reloadPhotos() {
    setBusy(true); setError(""); setMessage("");
    try { await load(); setMessage("Photo list refreshed."); }
    catch { setError("Couldn’t reload photos. Please retry."); }
    finally { setBusy(false); }
  }

  async function addPhoto(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError("Choose a photo first."); return; }
    await run(async () => {
      const publicId = pendingPublicId || await uploadPhoto(file);
      setPendingPublicId(publicId);
      await api("/api/runny/photos", "POST", { publicId, collection: selected, alt, caption });
      setPendingPublicId(null); setFile(null); setAlt(""); setCaption("");
      if (fileInput.current) fileInput.current.value = "";
    }, "Photo published to Runny.");
  }

  async function onAction(photo: Photo, action: string, extra: Record<string, unknown> = {}, file?: File) {
    await run(async () => {
      if (file) {
        const cached = pendingReplacement.current;
        const publicId = cached?.file === file ? cached.publicId : await uploadPhoto(file);
        pendingReplacement.current = { file, publicId };
        extra.publicId = publicId;
      }
      await api("/api/runny/photos", "PATCH", { id: photo.id, updatedAt: photo.updatedAt, action, ...extra });
      pendingReplacement.current = null;
    }, action === "remove" ? "Photo removed from Runny. You can restore it below." : action === "restore" ? "Photo restored to Runny." : "Changes published to Runny.");
  }

  const collection = collections.find((item) => item.value === selected);
  const matches = (photo: Photo) => !!collection && photo.placement === collection.placement && photo.year === collection.year && photo.month === collection.month;
  const visible = photos.filter((photo) => matches(photo) && !photo.deletedAt);
  const removed = photos.filter((photo) => matches(photo) && photo.deletedAt);
  return (
    <section className="panel runny-photos" aria-labelledby="runny-photos-title">
      <div className="panel-heading"><div><h2 id="runny-photos-title">Runny photos</h2><p>Upload here, then see it on the website. No code changes needed.</p></div><ImagePlus size={23} className="muted" /></div>
      <div className="photo-editor">
        <div className="photo-toolbar">
          <label>Where should these photos appear?<select value={selected} disabled={busy || !loaded} onChange={(event) => { setSelected(event.target.value); setShowRemoved(false); setMessage(""); }}>{collections.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <button type="button" disabled={busy} onClick={() => void reloadPhotos()}><RefreshCw size={14} /> Reload photos</button>
          <a href="https://runny.russeldanielpaul.is-a.dev/" target="_blank" rel="noreferrer">Open Runny ↗</a>
        </div>
        {error && <p className="photo-error" role="alert">{error}</p>}
        {message && <p className="photo-message" role="status">{message}</p>}
        {!loaded && !error && <p className="muted" role="status">Loading photos...</p>}
        {loaded && !uploadReady && <p className="photo-error">Cloudinary uploads need server configuration. Your existing photos are still available to edit.</p>}
        {loaded && <>
          <form className="photo-upload" onSubmit={addPhoto}>
            <div className="photo-file">
              {preview ? <img src={preview} alt="Selected photo preview" width={128} height={128} /> : <Upload size={25} />}
              <label>Choose a photo<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={busy || !uploadReady} onChange={(event) => { const next = event.target.files?.[0] || null; setFile(next); setPendingPublicId(null); if (next && !alt) setAlt(next.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")); }} required /></label>
              <span className="muted">JPG, PNG, WebP, AVIF or GIF · up to 10 MB</span>
            </div>
            <div className="photo-fields">
              <label>Photo description<input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="What’s in the photo?" maxLength={240} required disabled={busy} /></label>
              <label>Caption <span className="muted">(optional)</span><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={1000} rows={2} disabled={busy} /></label>
              <div><button className="primary" type="submit" disabled={busy || !file || !uploadReady}><Upload size={15} /> {busy ? "Saving..." : "Upload & publish"}</button></div>
            </div>
          </form>
          <div className="photo-list-heading"><h3>{collection?.label}</h3><span className="muted">{visible.length} photos</span></div>
          {selected !== "gallery" && <p className="muted photo-hint">The first two photos appear on phones. All photos appear on desktop. Captions appear on hover or keyboard focus.</p>}
          <div className="photo-list" aria-busy={busy}>
            {visible.length ? visible.map((photo, index) => <PhotoRow key={`${photo.id}-${photo.updatedAt}`} photo={photo} first={!index} last={index === visible.length - 1} busy={busy} uploadReady={uploadReady} onAction={onAction} />) : <p className="muted">No photos here yet. Upload the first one above.</p>}
          </div>
          {removed.length > 0 && <div className="photo-trash"><button type="button" disabled={busy} aria-expanded={showRemoved} onClick={() => setShowRemoved(!showRemoved)}>{showRemoved ? "Hide" : "Show"} removed photos ({removed.length})</button>{showRemoved && removed.map((photo) => <PhotoRow key={`${photo.id}-${photo.updatedAt}`} photo={photo} first last busy={busy} uploadReady={uploadReady} onAction={onAction} />)}</div>}
          <p className="muted photo-hint">Saved photos appear on the next visit or refresh. An open Runny tab checks for updates every 30 seconds.</p>
        </>}
      </div>
    </section>
  );
}

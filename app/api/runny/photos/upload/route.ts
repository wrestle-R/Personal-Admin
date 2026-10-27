import { authenticated, sameOrigin, privateJson, sign } from "@/lib/auth";
import { limit } from "@/lib/limit";
import { prepareUpload, PhotoError } from "@/lib/runny-photos";

export async function POST(request: Request) {
  if (!authenticated(request)) return privateJson({ error: "Sign in required" }, 401);
  if (!sameOrigin(request)) return privateJson({ error: "Invalid origin" }, 403);
  try {
    if (!(await limit(sign("runny-photo-upload"), 20, 60)))
      return privateJson({ error: "Please wait a minute before uploading more photos." }, 429);
    return privateJson(prepareUpload());
  } catch (error) {
    return privateJson({ error: error instanceof PhotoError ? error.message : "Unable to start upload." }, error instanceof PhotoError ? error.status : 503);
  }
}

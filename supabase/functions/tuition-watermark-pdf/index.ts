// Vattams Online Tuition — Phase 5.1 — Step 2
//
// Watermarking pipeline for tuition_course_materials PDFs.
//
// What this function does, end to end:
//   1. Authenticates the caller against a server-side secret (never the
//      anon key — this endpoint writes data, so it cannot be open like the
//      public-read tuition_course_materials policy).
//   2. Stores the ORIGINAL PDF, unmodified, in the private
//      tuition-materials-originals bucket (no anon/authenticated storage
//      policy exists for that bucket — see
//      20260814020000_create_tuition_materials_watermark_storage.sql — so
//      only this function's service_role client can ever read it back).
//   3. Generates a PROTECTED copy: every page gets a repeating diagonal
//      "VATTAMS" watermark burned directly into the PDF content stream
//      (via pdf-lib), not CSS/HTML — so it survives download, printing,
//      and viewing in any PDF reader.
//   4. Uploads the protected copy to the public tuition-materials-protected
//      bucket and writes/updates the corresponding row in
//      tuition_course_materials, using only columns that already exist on
//      that table.
//   5. Returns the new row + public URL. The original file's bytes never
//      leave step 2 — they are not returned to the caller and are not
//      referenced by any column exposed to anon/authenticated readers.
//
// Secrets required (set via supabase secrets set, never committed):
//   SUPABASE_URL                    - injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY       - injected automatically by Supabase
//   TUITION_MATERIALS_UPLOAD_SECRET - shared secret this function checks
//                                     against the x-upload-secret header
//                                     before doing anything. Set this to a
//                                     long random value; give it only to
//                                     the admin tooling that calls this
//                                     function. This is what stands in for
//                                     "admin auth" until Phase 5.2 wires a
//                                     real authenticated admin role check
//                                     onto this function.
//
// No service_role key, storage credential, or admin credential is ever
// present in frontend code — this function is the only thing that holds
// SUPABASE_SERVICE_ROLE_KEY, and it runs entirely server-side.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb, degrees } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-upload-secret",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const uploadSecret = Deno.env.get("TUITION_MATERIALS_UPLOAD_SECRET");

const supabase = createClient(supabaseUrl, serviceRoleKey);

const ORIGINALS_BUCKET = "tuition-materials-originals";
const PROTECTED_BUCKET = "tuition-materials-protected";
const WATERMARK_TEXT = "VATTAMS";

const VALID_CATEGORIES = new Set([
  "courseMaterials",
  "studyMaterials",
  "worksheets",
  "questionBanks",
  "testPapers",
  "mockExams",
  "solutions",
  "revisionMaterials",
  "examPreparation",
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    if (!uploadSecret) {
      return errorResponse(
        "Server misconfigured: TUITION_MATERIALS_UPLOAD_SECRET is not set",
        500
      );
    }
    const providedSecret = req.headers.get("x-upload-secret");
    if (!providedSecret || providedSecret !== uploadSecret) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const {
      course_slug,
      category,
      title,
      description,
      subject,
      topic,
      grade,
      file_base64,
      file_name,
      is_published,
    } = body ?? {};

    if (!course_slug?.trim() || !category?.trim() || !title?.trim() || !file_base64?.trim()) {
      return errorResponse(
        "course_slug, category, title, and file_base64 are required"
      );
    }
    if (!VALID_CATEGORIES.has(category)) {
      return errorResponse(category must be one of: ${[...VALID_CATEGORIES].join(", ")});
    }

    // Confirm the course exists (tuition_course_materials.course_slug has an
    // FK to tuition_courses.slug — fail fast with a clear error instead of a
    // raw Postgres FK violation).
    const { data: course, error: courseError } = await supabase
      .from("tuition_courses")
      .select("slug")
      .eq("slug", course_slug)
      .maybeSingle();
    if (courseError) {
      return errorResponse(Failed to look up course: ${courseError.message}, 500);
    }
    if (!course) {
      return errorResponse(No tuition_courses row with slug "${course_slug}", 404);
    }

    let originalBytes: Uint8Array;
    try {
      originalBytes = base64ToBytes(file_base64);
    } catch {
      return errorResponse("file_base64 is not valid base64");
    }

    const safeFileBase = (file_name?.trim() || "material").replace(/[^a-zA-Z0-9.-]/g, "");
    const stamp = Date.now();
    const id = crypto.randomUUID();
    const originalPath = ${course_slug}/${category}/${stamp}-${id}-original-${safeFileBase};
    const protectedPath = ${course_slug}/${category}/${stamp}-${id}-protected-${safeFileBase};

    // 1. Store the original privately, unmodified, exactly as received.
    const { error: originalUploadError } = await supabase.storage
      .from(ORIGINALS_BUCKET)
      .upload(originalPath, originalBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (originalUploadError) {
      return errorResponse(Failed to store original PDF: ${originalUploadError.message}, 500);
    }

    // 2. Generate the watermarked/protected PDF from the original bytes.
    let watermarkedBytes: Uint8Array;
    try {
      watermarkedBytes = await watermarkPdf(originalBytes);
    } catch (err) {
      return errorResponse(
        Failed to watermark PDF: ${err instanceof Error ? err.message : String(err)},
        500
      );
    }

    // 3. Store the protected copy publicly. This is the ONLY version ever
    //    handed to a student.
    const { error: protectedUploadError } = await supabase.storage
      .from(PROTECTED_BUCKET)
      .upload(protectedPath, watermarkedBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (protectedUploadError) {
      return errorResponse(Failed to store protected PDF: ${protectedUploadError.message}, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from(PROTECTED_BUCKET)
      .getPublicUrl(protectedPath);
    const resourceUrl = publicUrlData.publicUrl;

    // 4. Upsert the tuition_course_materials row using only existing columns.
    const { data: materialRow, error: insertError } = await supabase
      .from("tuition_course_materials")
      .insert({
        course_slug,
        title,
        description: description ?? null,
        category,
        subject: subject ?? null,
        topic: topic ?? null,
        grade: grade ?? null,
        resource_url: resourceUrl,
        external_url: null,
        file_type: "pdf",
        file_size: watermarkedBytes.byteLength,
        is_published: is_published ?? true,
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse(Failed to save material row: ${insertError.message}, 500);
    }

    return jsonResponse({
      success: true,
      material: materialRow,
      resource_url: resourceUrl,
      original_storage_path: ${ORIGINALS_BUCKET}/${originalPath},
      protected_storage_path: ${PROTECTED_BUCKET}/${protectedPath},
      original_size_bytes: originalBytes.byteLength,
      protected_size_bytes: watermarkedBytes.byteLength,
    });
  } catch (err) {
    return errorResponse(
      Unexpected error: ${err instanceof Error ? err.message : String(err)},
      500
    );
  }
});

/**
 * Burns a repeating, rotated, low-opacity "VATTAMS" watermark into every
 * page of the given PDF. This edits the actual PDF content stream (via
 * pdf-lib) — it is not an overlay done in the browser/CSS, so it is present
 * in the downloaded file itself and survives printing.
 *
 * Design choices, matching the stated requirements:
 *   - repeated diagonal watermark: text is tiled in a grid across an area
 *     larger than the page (so corners are covered too), each instance
 *     rotated 45°.
 *   - subtle opacity / readable content: opacity 0.12, mid-gray — visible
 *     enough to deter redistribution, faint enough that the underlying
 *     text/notes stay easy to read.
 *   - suitable for mobile + print: vector text (not a raster image), so it
 *     stays crisp at any zoom level and print resolution.
 *   - difficult to remove by simple cropping: the tile grid repeats every
 *     ~170x130pt and extends past all four edges of the page, so no single
 *     rectangular crop can remove the watermark without also removing the
 *     page's actual content.
 */
async function watermarkPdf(originalBytes: Uint8Array): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 26;
  const tileSpacingX = 190;
  const tileSpacingY = 140;
  const opacity = 0.12;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const diagonal = Math.sqrt(width * width + height * height);

    for (let y = -diagonal; y < diagonal; y += tileSpacingY) {
      for (let x = -diagonal; x < diagonal; x += tileSpacingX) {
        page.drawText(WATERMARK_TEXT, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity,
          rotate: degrees(45),
        });
      }
    }
  }

  return await pdfDoc.save();
}

function base64ToBytes(base64: string): Uint8Array {
  const cleaned = base64.includes(",") ? base64.split(",").pop()! : base64;
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ success: false, error: message }, status);
}

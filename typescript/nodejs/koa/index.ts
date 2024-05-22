import Koa from "koa";
import Router from "@koa/router";
import multer from "@koa/multer";
import fs from "node:fs/promises";
import bodyParser from "koa-body";

// Define interfaces for type safety
interface FormFields {
  status: string;
  id_gen: string;
  time_gen: string;
  img_message?: string;
}

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface FormData {
  fields: FormFields;
  files: {
    res_image: UploadedFile[];
  };
}

/**
 * Handles errors by logging the error message.
 * @param {string} error - The error message to log.
 */
function errorHandler(error: string): void {
  console.error("errorHandler", error);
}

/**
 * Checks if the request method is POST.
 * @param {Koa.Context} ctx - The Koa context.
 * @returns {boolean} - True if the method is POST, false otherwise.
 */
function isPostMethod(ctx: Koa.Context): boolean {
  return ctx.method === "POST";
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Processes the form data from the request.
 * @param {FormData} formData - The form data from the request.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 */
async function processFormData(formData: FormData): Promise<void> {
  const { status, id_gen, time_gen, img_message: imgMessage } = formData.fields;
  const resImage = formData.files.res_image[0];
  const isImage = resImage && resImage.buffer;

  try {
    if (status !== "200") {
      throw new Error(imgMessage || "Unknown error");
    } else if (!isImage) {
      throw new Error("resImage is not a file");
    }

    // Save the file if it exists
    await fs.writeFile("resImage.png", resImage.buffer);

    console.debug("processFormData", `ID: ${id_gen}, Time: ${time_gen}`);
  } catch (err) {
    const error = err as Error;
    errorHandler(error.message);
  }
}

const app = new Koa();
const router = new Router();

/**
 * Webhook route configuration.
 */
router.post(
  "/webhook",
  upload.fields([{ name: "res_image", maxCount: 1 }]),
  async (ctx) => {
    if (!isPostMethod(ctx)) {
      ctx.status = 405;
      ctx.body = "Method Not Allowed";
    } else {
      const formData: FormData = {
        fields: ctx.request.body as FormFields,
        files: ctx.request.files as unknown as { res_image: UploadedFile[] },
      };
      await processFormData(formData);
      ctx.status = 200;
      ctx.body = "OK";
    }
  }
);

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

const PORT = 4000;

/**
 * Starts the server and listens on the specified port.
 */
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

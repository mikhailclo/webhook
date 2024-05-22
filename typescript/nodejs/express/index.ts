import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs/promises";
import bodyParser from "body-parser";

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
 * Configures Multer for file uploads using memory storage.
 * @returns {multer.Instance} - The configured Multer instance.
 */
function configureMulter(): multer.Multer {
  const storage = multer.memoryStorage();
  return multer({ storage });
}

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

/**
 * Handles webhook requests.
 * @param {Request} req - The incoming request.
 * @param {Response} res - The outgoing response.
 * @returns {Promise<void>} - A promise that resolves when the request is handled.
 */
async function handleWebhook(req: Request, res: Response): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
  } else {
    const formData: FormData = {
      fields: req.body as FormFields,
      files: req.files as unknown as { res_image: UploadedFile[] },
    };
    await processFormData(formData);
    res.status(200).send("OK");
  }
}

const app = express();
const router = express.Router();
const upload = configureMulter();

/**
 * Webhook route configuration.
 */
router.post(
  "/webhook",
  upload.fields([{ name: "res_image", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    await handleWebhook(req, res);
  }
);

// Middleware configuration
app.use(bodyParser.json());
app.use(router);

const PORT = 4000;

/**
 * Starts the server and listens on the specified port.
 */
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

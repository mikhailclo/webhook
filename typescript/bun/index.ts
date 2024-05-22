/**
 * Handles errors by logging the error message.
 * @param {string} error - The error message to log.
 */
function errorHandler(error: string): void {
  console.error("errorHandler", error);
}

/**
 * Checks if the request method is POST.
 * @param {Request} req - The incoming request.
 * @returns {boolean} - True if the method is POST, false otherwise.
 */
function isPostMethod(req: Request): boolean {
  return req.method === "POST";
}

/**
 * Checks if the request contains multipart/form-data.
 * @param {Request} req - The incoming request.
 * @returns {boolean} - True if the content-type is multipart/form-data, false otherwise.
 */
function isMultipartFormData(req: Request): boolean {
  return (
    req.headers.get("content-type")?.includes("multipart/form-data") ?? false
  );
}

/**
 * Processes the form data from the request.
 * @param {FormData} formData - The form data from the request.
 * @returns {Promise<void>} - A promise that resolves when the processing is complete.
 */
async function processFormData(formData: FormData): Promise<void> {
  const status = formData.get("status") as string;
  const idGen = formData.get("id_gen") as string;
  const timeGen = formData.get("time_gen") as string;
  const resImage = formData.get("res_image");
  const isImage = resImage instanceof File;

  try {
    if (status !== "200") {
      const imgMessage = formData.get("img_message") as string;
      throw new Error(imgMessage);
    } else if (!isImage) {
      throw new Error("resImage is not a file");
    }

    await Bun.write("resImage.png", await resImage.arrayBuffer());

    console.debug("processFormData", `ID: ${idGen}, Time: ${timeGen}`);
  } catch (err) {
    const error = err as Error;
    errorHandler(error.message);
  }
}

/**
 * Main handler function for the webhook endpoint.
 * @param {Request} req - The incoming request.
 * @returns {Promise<Response>} - A promise that resolves to the response.
 */
async function handleWebhook(req: Request): Promise<Response> {
  if (!isPostMethod(req)) {
    return new Response("Method Not Allowed", { status: 405 });
  } else if (!isMultipartFormData(req)) {
    return new Response("Bad Request", { status: 400 });
  }

  const formdata = await req.formData();
  await processFormData(formdata);
  return new Response("OK", { status: 200 });
}

/**
 * Main fetch handler for the server.
 * @param {Request} req - The incoming request.
 * @returns {Promise<Response>} - A promise that resolves to the response.
 */
async function fetchHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/webhook") {
    return handleWebhook(req);
  }

  return new Response("Not Found", { status: 404 });
}

// Start the Bun server
const server = Bun.serve({
  port: 4000,
  fetch: fetchHandler,
});

console.log(`Listening on http://localhost:${server.port}`);

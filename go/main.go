package main

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
)

// errorHandler logs the error message.
// @param {error} err - The error to log.
func errorHandler(err error) {
	log.Println("errorHandler:", err)
}

// isPostMethod checks if the request method is POST.
// @param {http.Request} r - The incoming request.
// @returns {bool} - True if the method is POST, false otherwise.
func isPostMethod(r *http.Request) bool {
	return r.Method == http.MethodPost
}

// isMultipartFormData checks if the request contains multipart/form-data.
// @param {http.Request} r - The incoming request.
// @returns {bool} - True if the content-type is multipart/form-data, false otherwise.
func isMultipartFormData(r *http.Request) bool {
	return strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data")
}

// processFormData processes the form data from the request.
// It handles optional fields and performs necessary operations based on their presence.
// @param {multipart.Form} formData - The form data from the request.
// @returns {error} - An error if any occurred during processing, otherwise nil.
func processFormData(formData *multipart.Form) error {
	status := formData.Value["status"]
	idGen := formData.Value["id_gen"]
	timeGen := formData.Value["time_gen"]
	resImage := formData.File["res_image"]

	// Check status and handle error if not 200
	if len(status) > 0 && status[0] != "200" {
		imgMessage := formData.Value["img_message"]
		if len(imgMessage) > 0 {
			return fmt.Errorf(imgMessage[0])
		}
		return fmt.Errorf("status is not 200 and img_message is missing")
	}

	// Check if resImage is provided and is a file
	if len(resImage) > 0 {
		file, err := resImage[0].Open()
		if err != nil {
			return err
		}
		defer file.Close()

		dst, err := os.Create("resImage.png")
		if err != nil {
			return err
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			return err
		}
	}

	// Log debug information if idGen and timeGen are available
	if len(idGen) > 0 && len(timeGen) > 0 {
		log.Printf("processFormData: ID: %s, Time: %s\n", idGen[0], timeGen[0])
	} else {
		log.Println("processFormData: idGen or timeGen not provided")
	}

	return nil
}

// handleWebhook handles the webhook endpoint.
// It validates the request method and content type, parses the multipart form data, and processes it.
// @param {http.ResponseWriter} w - The response writer.
// @param {http.Request} r - The incoming request.
func handleWebhook(w http.ResponseWriter, r *http.Request) {
	var responseMessage string

	if !isPostMethod(r) {
		responseMessage = "Method Not Allowed"
		errorHandler(fmt.Errorf(responseMessage))
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, responseMessage)
		return
	}

	if !isMultipartFormData(r) {
		responseMessage = "Bad Request"
		errorHandler(fmt.Errorf(responseMessage))
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, responseMessage)
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		errorHandler(err)
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Internal Server Error")
		return
	}

	if err := processFormData(r.MultipartForm); err != nil {
		errorHandler(err)
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "OK")
}

// fetchHandler handles incoming HTTP requests.
// It routes requests to the appropriate handler based on the URL path.
// @param {http.ResponseWriter} w - The response writer.
// @param {http.Request} r - The incoming request.
func fetchHandler(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/webhook":
		handleWebhook(w, r)
	default:
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "Not Found")
	}
}

// main sets up the HTTP server and listens on port 4000.
func main() {
	http.HandleFunc("/", fetchHandler)
	port := 4000
	fmt.Printf("Listening on http://localhost:%d\n", port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil); err != nil {
		log.Fatal(err)
	}
}

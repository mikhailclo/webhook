from flask import Flask, request
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def error_handler(error: str) -> None:
    """
    Handles errors by logging the error message.
    @param error: The error message to log.
    """
    print("errorHandler", error)

def is_post_method(req) -> bool:
    """
    Checks if the request method is POST.
    @param req: The incoming request.
    @returns: True if the method is POST, false otherwise.
    """
    return req.method == 'POST'

def is_multipart_form_data(req) -> bool:
    """
    Checks if the request contains multipart/form-data.
    @param req: The incoming request.
    @returns: True if the content-type is multipart/form-data, false otherwise.
    """
    return 'multipart/form-data' in req.content_type

def process_form_data(form_data) -> None:
    """
    Processes the form data from the request.
    @param form_data: The form data from the request.
    @returns: None.
    """
    status = form_data.get('status')
    id_gen = form_data.get('id_gen')
    time_gen = form_data.get('time_gen')
    res_image = form_data.get('res_image')

    try:
        if status != '200':
            img_message = form_data.get('img_message')
            raise Exception(img_message)
        elif res_image.filename == '':
            raise Exception("resImage is not a file")

        file_path = os.path.join(UPLOAD_FOLDER, 'resImage.png')
        res_image.save(file_path)

        print("processFormData", f"ID: {id_gen}, Time: {time_gen}")
    except Exception as err:
        error_handler(str(err))

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """
    Main handler function for the webhook endpoint.
    @returns: A response indicating the result of the request handling.
    """
    if not is_post_method(request):
        return "Method Not Allowed", 405
    elif not is_multipart_form_data(request):
        return "Bad Request", 400

    formdata = request.form
    files = request.files
    formdata = {**formdata, **files}
    process_form_data(formdata)
    return "OK", 200

if __name__ == '__main__':
    app.run(port=4000, debug=True)

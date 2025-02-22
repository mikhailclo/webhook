from flask import Flask, request
import os
import requests

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def error_handler(error: str) -> None:
    """
    Logs the error message.
    
    @param error: The error message to log.
    """
    app.logger.error("errorHandler: %s", error)

def is_post_method(req) -> bool:
    """
    Checks if the request method is POST.
    
    @param req: The incoming request.
    @returns: True if the method is POST, False otherwise.
    """
    return req.method == 'POST'

def is_multipart_form_data(req) -> bool:
    """
    Checks if the request contains multipart/form-data.
    
    @param req: The incoming request.
    @returns: True if the content-type is multipart/form-data, False otherwise.
    """
    return 'multipart/form-data' in req.content_type

def process_form_data(form_data) -> None:
    """
    Processes the form data from the webhook request.
    
    Expected keys in form_data:
        - status
        - id_gen
        - time_gen
        - res_image (should be a file)
    
    Saves the received file to the UPLOAD_FOLDER if valid.
    
    @param form_data: The merged form data and files from the request.
    @returns: None.
    """
    status = form_data.get('status')
    id_gen = form_data.get('id_gen')
    time_gen = form_data.get('time_gen')
    res_image = form_data.get('res_image')

    try:
        if status != '200':
            img_message = form_data.get('img_message', 'Unknown error')
            raise Exception(img_message)
        if not getattr(res_image, 'filename', None):
            raise Exception("res_image is not a valid file")
        
        file_path = os.path.join(UPLOAD_FOLDER, 'resImage.png')
        res_image.save(file_path)
        app.logger.info("processFormData: ID: %s, Time: %s", id_gen, time_gen)
    except Exception as err:
        error_handler(str(err))

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """
    Handles the webhook endpoint.
    
    Checks the request method and content type, merges form data and files,
    and processes the received data.
    
    @returns: A tuple with response message and HTTP status code.
    """
    if not is_post_method(request):
        return "Method Not Allowed", 405
    if not is_multipart_form_data(request):
        return "Bad Request", 400

    # Merge form and files data
    form_data = request.form.to_dict()
    form_data.update(request.files.to_dict())
    process_form_data(form_data)
    return "OK", 200

@app.route('/swap_face', methods=['POST'])
def handle_swap_face():
    """
    Handles the face swap endpoint.
    
    Constructs a request to the external face_swap API with the necessary
    payload and files, then returns the API response.
    
    @returns: A tuple with response message and HTTP status code.
    """
    if not is_post_method(request):
        return "Method Not Allowed", 405

    url = "https://public-api.clothoff.net/face_swap"
    
    # Define the payload for the API
    payload = {
        'webhook': 'https://webhook.site',
        'id_gen': 'YOUR_UNIQ_ID',
        'type_gen': 'swapface_photo'
    }
    
    # Prepare files to send using context managers to ensure proper file closure.
    file_path = os.path.join('..', 'image.jpeg')
    try:
        with open(file_path, 'rb') as input_file, open(file_path, 'rb') as target_file:
            files = {
                'input_pv': ('image.jpeg', input_file, 'image/jpeg'),
                'target_image': ('target_image.jpg', target_file, 'image/jpg')
            }

            # Retrieve the API key from environment variables.
            api_key = os.environ.get('API_KEY')
            if not api_key:
                return "API Key not configured", 500

            headers = {
                'x-api-key': api_key
            }
            
            response = requests.post(url, headers=headers, data=payload, files=files)
    except Exception as e:
        error_handler(f"Error reading file: {e}")
        return "Internal Server Error", 500

    if response.status_code != 200:
        error_handler(f"Face swap API error: {response.status_code} {response.text}")
        return "Face swap API error", response.status_code

    return response.json(), 200

if __name__ == '__main__':
    app.run(port=4000, debug=True)

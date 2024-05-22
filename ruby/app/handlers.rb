# Error handler, logs the error message
#
# @param error [Exception] The error object to be logged
def error_handler(error)
  puts "errorHandler: #{error}"
end

# Checks if the request method is POST
#
# @param req [WEBrick::HTTPRequest] The request object
# @return [Boolean] True if the request method is POST, false otherwise
def post_method?(req)
  req.request_method == 'POST'
end

# Checks if the request contains multipart/form-data
#
# @param req [WEBrick::HTTPRequest] The request object
# @return [Boolean] True if the request contains multipart/form-data, false otherwise
def multipart_form_data?(req)
  # Check if the Content-Type header exists and includes 'multipart/form-data'
  req.content_type && req.content_type.include?('multipart/form-data')
end

# Processes form data from the request
#
# @param req [WEBrick::HTTPRequest] The request object containing form data
def process_form_data(req)
  # Access form data directly from the request object
  status = req.query['status']            # String
  id_gen = req.query['id_gen']            # String
  time_gen = req.query['time_gen']        # String
  res_image = req.query['res_image']      # WEBrick::HTTPUtils::FormData::File

  # Check status and image type
  if status != '200'
    img_message = req.query['img_message']  # String
    raise img_message
  elsif res_image.empty?
    raise 'resImage is empty'
  end

  # Ensure 'uploads' directory exists
  Dir.mkdir('uploads') unless Dir.exist?('uploads')

  # Save the image
  File.open("uploads/#{id_gen}.png", 'wb') do |file|
    file.write(res_image)
  end

  puts "processFormData: ID: #{id_gen}, Time: #{time_gen}"
end

# Main handler function for the webhook endpoint
#
# @param req [WEBrick::HTTPRequest] The request object
# @param res [WEBrick::HTTPResponse] The response object
def handle_webhook(req, res)
  unless post_method?(req)
    res.status = 405
    res.body = 'Method Not Allowed'
    return
  end

  unless multipart_form_data?(req)
    res.status = 400
    res.body = 'Bad Request'
    return
  end

  res.status = 200
  res.body = 'OK'

  begin
    process_form_data(req)
  rescue StandardError => e
    error_handler(e) # Pass the exception object 'e'
  end
end

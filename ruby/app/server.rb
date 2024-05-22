require 'webrick'
require_relative 'handlers'

# Main request handler for the server
#
# @param req [WEBrick::HTTPRequest] The request object
# @param res [WEBrick::HTTPResponse] The response object
def fetch_handler(req, res)
  case req.path
  when '/webhook'
    handle_webhook(req, res)
  else
    res.status = 404
    res.body = 'Not Found'
  end
end

# Server setup
server = WEBrick::HTTPServer.new(Port: 4000)
server.mount_proc('/') do |req, res|
  fetch_handler(req, res)
end

# Start the server
trap('INT') { server.shutdown }
puts "Listening on http://localhost:#{server.config[:Port]}"
server.start

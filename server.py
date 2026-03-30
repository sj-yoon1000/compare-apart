"""Local development server for Compare Apart."""
import http.server
import os

os.chdir(os.path.join(os.path.dirname(__file__), "web"))
print("Serving at http://0.0.0.0:8000")
http.server.HTTPServer(("0.0.0.0", 8000), http.server.SimpleHTTPRequestHandler).serve_forever()

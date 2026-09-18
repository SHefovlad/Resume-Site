from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import webbrowser

HOST = "127.0.0.1"
PORT = 8000


class Server(SimpleHTTPRequestHandler):
    pass


server = ThreadingHTTPServer((HOST, PORT), Server)

url = f"http://{HOST}:{PORT}"
print(f"Server started: {url}")
print("Press Ctrl+C to stop")

webbrowser.open(url)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped")
    server.server_close()

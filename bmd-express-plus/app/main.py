from flask import Flask, send_from_directory, render_template_string
import os

# Point to Vite build directory
REACT_BUILD_DIR = os.path.join(os.path.dirname(__file__), '../dist')

app = Flask(__name__, static_folder=os.path.join(REACT_BUILD_DIR, 'assets'))

@app.route('/')
def index():
    # Read and serve index.html manually
    with open(os.path.join(REACT_BUILD_DIR, 'index.html')) as f:
        return render_template_string(f.read())

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(REACT_BUILD_DIR, 'assets'), filename)
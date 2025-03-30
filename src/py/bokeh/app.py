import debugpy
import time
import sys

# Start debugpy and listen on port 5678
debugpy.listen(("localhost", 5678))
sys.stderr.write("✅ Waiting for VS Code to attach... Open VS Code and run 'Attach to Bokeh Server'\n")
sys.stderr.flush()
print("✅ Waiting for VS Code to attach... Open VS Code and run 'Attach to Bokeh Server'", flush=True)

# Optionally pause execution until the debugger attaches
debugpy.wait_for_client()
time.sleep(3)  # Give VS Code time to connect


from bokeh.io import curdoc
from bokeh.themes import Theme
from layout import MainLayout
from state import AppState



#from add_js_query_to_document import CustomJS  # Import the custom extension

# Initialize the application state with configuration settings
app_state = AppState()

#curdoc().template_variables["custom_style"] = "<style>.bk-selected { background-color: #ddff99 !important; }</style>"
# Prepare the layout using the state
main_layout = MainLayout(app_state)
layout = main_layout.get_layout()

from bokeh.io import curdoc
from bokeh.themes import built_in_themes
theme = built_in_themes['light_minimal']
curdoc().theme = theme

# Create an instance of the CustomJS extension
#custom_js = CustomJS()

# Add both the layout and the custom JS to the current document
curdoc().add_root(layout)
#curdoc().add_root(custom_js)

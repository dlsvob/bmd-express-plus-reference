from bokeh.models import Button, Div, Dropdown
from data_management import update_data
from bokeh.models import InlineStyleSheet
from functools import partial

def create_navigation_buttons(state):    
    stylesheet_forward = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #e6ffb3; font-size: 32px;}")
    stylesheet_fforward = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #ddff99; font-size: 32px;}")
    stylesheet_ffforward = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #66ff66; font-size: 32px;}")
    stylesheet_back = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #ffcc66; font-size: 32px;}")
    stylesheet_fback = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #ffcc00; font-size: 32px;}")
    stylesheet_ffback = InlineStyleSheet(css=".bk-btn.bk-btn-default { background-color: #ff9900; font-size: 32px;}")

    forward_button = Button(label=">", name='forward_button', width=260, height=75, stylesheets=[stylesheet_forward])
    fforward_button = Button(label=">>", name='fforward_button', width=260, height=75, stylesheets=[stylesheet_fforward])
    ffforward_button = Button(label=">>>", name='ffforward_button', width=260, height=75, stylesheets=[stylesheet_ffforward])

    back_button = Button(label="<", name='back_button', width=260, height=75, stylesheets=[stylesheet_back])
    fback_button = Button(label="<<", name='fback_button', width=260, height=75, stylesheets=[stylesheet_fback])
    ffback_button = Button(label="<<<", name='ffback_button', width=260, height=75, stylesheets=[stylesheet_ffback]) 

    forward_button.on_click(lambda: update_data(state, 'forward'))
    fforward_button.on_click(lambda: update_data(state, 'fforward'))
    ffforward_button.on_click(lambda: update_data(state, 'ffforward'))
    back_button.on_click(lambda: update_data(state, 'back'))
    fback_button.on_click(lambda: update_data(state, 'fback'))
    ffback_button.on_click(lambda: update_data(state, 'ffback'))
    return ffback_button, fback_button, back_button, forward_button, fforward_button, ffforward_button 

def create_chemicals_dropdown(state):
    unique_chemicals = state.chemicals
    menu_items = [(chem, chem) for chem in unique_chemicals]
    stylesheet_chem_drop = InlineStyleSheet(css=".bk-btn.bk-btn-default, .bk-menu.bk-below { background-color: #0096F7; font-size: 32px; } \
                                            .bk-caret.bk-down { transform: scale(2.5); }")
    chemical_dropdown = Dropdown(label=f"{menu_items[0][0]}\t", width=260, height=75,
                                menu=menu_items,
                                stylesheets=[stylesheet_chem_drop])
    chemical_dropdown.on_event('menu_item_click', partial(chemical_select_callback, state, widget=chemical_dropdown))
    return chemical_dropdown

def chemical_select_callback(state, event, widget):
    for item in widget.menu:
        if item[0] == event.item:  # Compare the value part of the tuple to the event item
            widget.label = item[0]  # Update the label to the label part of the tuple
            break
    state.current_index = 1
    state.chemical = widget.label
    update_data(state, 'new_chemical')

def create_static_title(text):
    # Creates a simple Div component for displaying text or titles
    div = Div(text=text, sizing_mode="stretch_width", styles={"font-size": "18pt", "font-weight": "bold", "text-align": "left"})
    return div

def create_dynamic_plot_title(state):
    # Creates a simple Div component for displaying text or titles
    div = Div(text=f'UMAP (Rank: {state.current_index}-{state.current_index+24})', sizing_mode="stretch_width", styles={"font-size": "18pt", "font-weight": "bold", "text-align": "left"})
    return div
    
def create_dynamic_table_title(state):
    # Creates a simple Div component for displaying text or titles
    div = Div(text="", sizing_mode="stretch_width", styles={"font-size": "18pt", "font-weight": "bold", "text-align": "left"})
    return div
    
def create_selected_cluster_info_div():
    info_div = Div(text="", width=200, height=100)
    return info_div

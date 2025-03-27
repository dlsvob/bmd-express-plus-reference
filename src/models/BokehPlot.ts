// src/types/IUmapBokehPlot.ts
// To parse this data:
//
//   import { Convert, IUmapBokehPlot } from "./file";
//
//   const iUmapBokehPlot = Convert.toIUmapBokehPlot(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface IUmapBokehPlot {
    doc:       Doc;
    root_id:   string;
    target_id: string;
    version:   string;
    [property: string]: any;
}

export interface Doc {
    callbacks: Callbacks;
    defs:      any[];
    roots:     Root[];
    title:     string;
    version:   string;
    [property: string]: any;
}

export interface Callbacks {
    type: string;
    [property: string]: any;
}

export interface Root {
    attributes: RootAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface RootAttributes {
    below:              Below[];
    center:             Center[];
    height:             number;
    js_event_callbacks: JSEventCallbacks;
    left:               Left[];
    match_aspect:       boolean;
    name:               string;
    renderers:          FluffyRenderer[];
    right:              Right[];
    title:              Title;
    toolbar:            Toolbar;
    width:              number;
    x_range:            XRange;
    x_scale:            XScale;
    y_range:            YRange;
    y_scale:            YScale;
    [property: string]: any;
}

export interface Below {
    attributes: BelowAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface BelowAttributes {
    axis_label:         string;
    formatter:          PurpleFormatter;
    major_label_policy: PurpleMajorLabelPolicy;
    ticker:             PurpleTicker;
    [property: string]: any;
}

export interface PurpleFormatter {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface PurpleMajorLabelPolicy {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface PurpleTicker {
    attributes: PurpleAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface PurpleAttributes {
    mantissas: number[];
    [property: string]: any;
}

export interface Center {
    attributes: CenterAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface CenterAttributes {
    axis:       Axis;
    dimension?: number;
    [property: string]: any;
}

export interface Axis {
    id: string;
    [property: string]: any;
}

export interface JSEventCallbacks {
    entries: Array<Array<PurpleEntry[] | string>>;
    type:    string;
    [property: string]: any;
}

export interface PurpleEntry {
    attributes: EntryAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface EntryAttributes {
    args: Args;
    code: string;
    [property: string]: any;
}

export interface Args {
    entries: Array<Array<FluffyEntry | string>>;
    type:    string;
    [property: string]: any;
}

export interface FluffyEntry {
    id: string;
    [property: string]: any;
}

export interface Left {
    attributes: LeftAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface LeftAttributes {
    axis_label?:         string;
    formatter?:          FluffyFormatter;
    items?:              PurpleItem[];
    major_label_policy?: FluffyMajorLabelPolicy;
    ticker?:             FluffyTicker;
    [property: string]: any;
}

export interface FluffyFormatter {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface PurpleItem {
    attributes: FluffyAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface FluffyAttributes {
    label:     PurpleLabel;
    renderers: PurpleRenderer[];
    [property: string]: any;
}

export interface PurpleLabel {
    type:  string;
    value: string;
    [property: string]: any;
}

export interface PurpleRenderer {
    id: string;
    [property: string]: any;
}

export interface FluffyMajorLabelPolicy {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface FluffyTicker {
    attributes: TentacledAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface TentacledAttributes {
    mantissas: number[];
    [property: string]: any;
}

export interface FluffyRenderer {
    attributes: RendererAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface RendererAttributes {
    data_source:        DataSource;
    glyph:              Glyph;
    muted_glyph:        MutedGlyph;
    name:               string;
    nonselection_glyph: NonselectionGlyph;
    view:               View;
    [property: string]: any;
}

export interface DataSource {
    attributes: DataSourceAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface DataSourceAttributes {
    data:             Data;
    selected:         Selected;
    selection_policy: SelectionPolicy;
    [property: string]: any;
}

export interface Data {
    entries: Array<Array<TentacledEntry | string>>;
    type:    string;
    [property: string]: any;
}

export interface TentacledEntry {
    array: string[] | ArrayObject;
    dtype: string;
    order: string;
    shape: number[];
    type:  string;
    [property: string]: any;
}

export interface ArrayObject {
    data: string;
    type: string;
    [property: string]: any;
}

export interface Selected {
    attributes: SelectedAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface SelectedAttributes {
    indices:      any[];
    line_indices: any[];
    [property: string]: any;
}

export interface SelectionPolicy {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface Glyph {
    attributes: GlyphAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface GlyphAttributes {
    fill_alpha: PurpleFillAlpha;
    fill_color: PurpleFillColor;
    line_color: PurpleLineColor;
    marker?:    PurpleMarker;
    size:       PurpleSize;
    x:          PurpleX;
    y:          PurpleY;
    [property: string]: any;
}

export interface PurpleFillAlpha {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleFillColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleLineColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleMarker {
    type:  string;
    value: string;
    [property: string]: any;
}

export interface PurpleSize {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleX {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleY {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface MutedGlyph {
    attributes: MutedGlyphAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface MutedGlyphAttributes {
    fill_alpha:  FluffyFillAlpha;
    fill_color:  FluffyFillColor;
    hatch_alpha: PurpleHatchAlpha;
    line_alpha:  PurpleLineAlpha;
    line_color:  FluffyLineColor;
    marker?:     FluffyMarker;
    size:        FluffySize;
    x:           FluffyX;
    y:           FluffyY;
    [property: string]: any;
}

export interface FluffyFillAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface FluffyFillColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface PurpleHatchAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface PurpleLineAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface FluffyLineColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface FluffyMarker {
    type:  string;
    value: string;
    [property: string]: any;
}

export interface FluffySize {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface FluffyX {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface FluffyY {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface NonselectionGlyph {
    attributes: NonselectionGlyphAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface NonselectionGlyphAttributes {
    fill_alpha:  TentacledFillAlpha;
    fill_color:  TentacledFillColor;
    hatch_alpha: FluffyHatchAlpha;
    line_alpha:  FluffyLineAlpha;
    line_color:  TentacledLineColor;
    marker?:     TentacledMarker;
    size:        TentacledSize;
    x:           TentacledX;
    y:           TentacledY;
    [property: string]: any;
}

export interface TentacledFillAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface TentacledFillColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface FluffyHatchAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface FluffyLineAlpha {
    type:  string;
    value: number;
    [property: string]: any;
}

export interface TentacledLineColor {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface TentacledMarker {
    type:  string;
    value: string;
    [property: string]: any;
}

export interface TentacledSize {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface TentacledX {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface TentacledY {
    field: string;
    type:  string;
    [property: string]: any;
}

export interface View {
    attributes: ViewAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface ViewAttributes {
    filter: Filter;
    [property: string]: any;
}

export interface Filter {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface Right {
    attributes: RightAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface RightAttributes {
    items: FluffyItem[];
    [property: string]: any;
}

export interface FluffyItem {
    attributes: StickyAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface StickyAttributes {
    label:     FluffyLabel;
    renderers: TentacledRenderer[];
    [property: string]: any;
}

export interface FluffyLabel {
    type:  string;
    value: string;
    [property: string]: any;
}

export interface TentacledRenderer {
    id: string;
    [property: string]: any;
}

export interface Title {
    attributes: TitleAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface TitleAttributes {
    text: string;
    [property: string]: any;
}

export interface Toolbar {
    attributes: ToolbarAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface ToolbarAttributes {
    active_drag: ActiveDrag;
    tools:       Tool[];
    [property: string]: any;
}

export interface ActiveDrag {
    id: string;
    [property: string]: any;
}

export interface Tool {
    attributes?: ToolAttributes;
    id:          string;
    name:        string;
    type:        string;
    [property: string]: any;
}

export interface ToolAttributes {
    overlay?:   Overlay;
    renderers?: string;
    tooltips?:  Array<string[]>;
    [property: string]: any;
}

export interface Overlay {
    attributes: OverlayAttributes;
    id:         string;
    name:       string;
    type:       string;
    [property: string]: any;
}

export interface OverlayAttributes {
    bottom_units?: string;
    editable?:     boolean;
    fill_alpha:    number;
    fill_color:    string;
    left_units?:   string;
    level:         string;
    line_alpha:    number;
    line_color:    string;
    line_dash:     number[];
    line_width:    number;
    right_units?:  string;
    syncable:      boolean;
    top_units?:    string;
    visible:       boolean;
    [property: string]: any;
}

export interface XRange {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface XScale {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface YRange {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

export interface YScale {
    id:   string;
    name: string;
    type: string;
    [property: string]: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toIUmapBokehPlot(json: string): IUmapBokehPlot {
        return cast(JSON.parse(json), r("IUmapBokehPlot"));
    }

    public static iUmapBokehPlotToJson(value: IUmapBokehPlot): string {
        return JSON.stringify(uncast(value, r("IUmapBokehPlot")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "IUmapBokehPlot": o([
        { json: "doc", js: "doc", typ: r("Doc") },
        { json: "root_id", js: "root_id", typ: "" },
        { json: "target_id", js: "target_id", typ: "" },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "Doc": o([
        { json: "callbacks", js: "callbacks", typ: r("Callbacks") },
        { json: "defs", js: "defs", typ: a("any") },
        { json: "roots", js: "roots", typ: a(r("Root")) },
        { json: "title", js: "title", typ: "" },
        { json: "version", js: "version", typ: "" },
    ], "any"),
    "Callbacks": o([
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Root": o([
        { json: "attributes", js: "attributes", typ: r("RootAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "RootAttributes": o([
        { json: "below", js: "below", typ: a(r("Below")) },
        { json: "center", js: "center", typ: a(r("Center")) },
        { json: "height", js: "height", typ: 0 },
        { json: "js_event_callbacks", js: "js_event_callbacks", typ: r("JSEventCallbacks") },
        { json: "left", js: "left", typ: a(r("Left")) },
        { json: "match_aspect", js: "match_aspect", typ: true },
        { json: "name", js: "name", typ: "" },
        { json: "renderers", js: "renderers", typ: a(r("FluffyRenderer")) },
        { json: "right", js: "right", typ: a(r("Right")) },
        { json: "title", js: "title", typ: r("Title") },
        { json: "toolbar", js: "toolbar", typ: r("Toolbar") },
        { json: "width", js: "width", typ: 0 },
        { json: "x_range", js: "x_range", typ: r("XRange") },
        { json: "x_scale", js: "x_scale", typ: r("XScale") },
        { json: "y_range", js: "y_range", typ: r("YRange") },
        { json: "y_scale", js: "y_scale", typ: r("YScale") },
    ], "any"),
    "Below": o([
        { json: "attributes", js: "attributes", typ: r("BelowAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "BelowAttributes": o([
        { json: "axis_label", js: "axis_label", typ: "" },
        { json: "formatter", js: "formatter", typ: r("PurpleFormatter") },
        { json: "major_label_policy", js: "major_label_policy", typ: r("PurpleMajorLabelPolicy") },
        { json: "ticker", js: "ticker", typ: r("PurpleTicker") },
    ], "any"),
    "PurpleFormatter": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleMajorLabelPolicy": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleTicker": o([
        { json: "attributes", js: "attributes", typ: r("PurpleAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleAttributes": o([
        { json: "mantissas", js: "mantissas", typ: a(0) },
    ], "any"),
    "Center": o([
        { json: "attributes", js: "attributes", typ: r("CenterAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "CenterAttributes": o([
        { json: "axis", js: "axis", typ: r("Axis") },
        { json: "dimension", js: "dimension", typ: u(undefined, 0) },
    ], "any"),
    "Axis": o([
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "JSEventCallbacks": o([
        { json: "entries", js: "entries", typ: a(a(u(a(r("PurpleEntry")), ""))) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleEntry": o([
        { json: "attributes", js: "attributes", typ: r("EntryAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "EntryAttributes": o([
        { json: "args", js: "args", typ: r("Args") },
        { json: "code", js: "code", typ: "" },
    ], "any"),
    "Args": o([
        { json: "entries", js: "entries", typ: a(a(u(r("FluffyEntry"), ""))) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyEntry": o([
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "Left": o([
        { json: "attributes", js: "attributes", typ: r("LeftAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "LeftAttributes": o([
        { json: "axis_label", js: "axis_label", typ: u(undefined, "") },
        { json: "formatter", js: "formatter", typ: u(undefined, r("FluffyFormatter")) },
        { json: "items", js: "items", typ: u(undefined, a(r("PurpleItem"))) },
        { json: "major_label_policy", js: "major_label_policy", typ: u(undefined, r("FluffyMajorLabelPolicy")) },
        { json: "ticker", js: "ticker", typ: u(undefined, r("FluffyTicker")) },
    ], "any"),
    "FluffyFormatter": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleItem": o([
        { json: "attributes", js: "attributes", typ: r("FluffyAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyAttributes": o([
        { json: "label", js: "label", typ: r("PurpleLabel") },
        { json: "renderers", js: "renderers", typ: a(r("PurpleRenderer")) },
    ], "any"),
    "PurpleLabel": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "PurpleRenderer": o([
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "FluffyMajorLabelPolicy": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyTicker": o([
        { json: "attributes", js: "attributes", typ: r("TentacledAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TentacledAttributes": o([
        { json: "mantissas", js: "mantissas", typ: a(0) },
    ], "any"),
    "FluffyRenderer": o([
        { json: "attributes", js: "attributes", typ: r("RendererAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "RendererAttributes": o([
        { json: "data_source", js: "data_source", typ: r("DataSource") },
        { json: "glyph", js: "glyph", typ: r("Glyph") },
        { json: "muted_glyph", js: "muted_glyph", typ: r("MutedGlyph") },
        { json: "name", js: "name", typ: "" },
        { json: "nonselection_glyph", js: "nonselection_glyph", typ: r("NonselectionGlyph") },
        { json: "view", js: "view", typ: r("View") },
    ], "any"),
    "DataSource": o([
        { json: "attributes", js: "attributes", typ: r("DataSourceAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "DataSourceAttributes": o([
        { json: "data", js: "data", typ: r("Data") },
        { json: "selected", js: "selected", typ: r("Selected") },
        { json: "selection_policy", js: "selection_policy", typ: r("SelectionPolicy") },
    ], "any"),
    "Data": o([
        { json: "entries", js: "entries", typ: a(a(u(r("TentacledEntry"), ""))) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TentacledEntry": o([
        { json: "array", js: "array", typ: u(a(""), r("ArrayObject")) },
        { json: "dtype", js: "dtype", typ: "" },
        { json: "order", js: "order", typ: "" },
        { json: "shape", js: "shape", typ: a(0) },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "ArrayObject": o([
        { json: "data", js: "data", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Selected": o([
        { json: "attributes", js: "attributes", typ: r("SelectedAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "SelectedAttributes": o([
        { json: "indices", js: "indices", typ: a("any") },
        { json: "line_indices", js: "line_indices", typ: a("any") },
    ], "any"),
    "SelectionPolicy": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Glyph": o([
        { json: "attributes", js: "attributes", typ: r("GlyphAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "GlyphAttributes": o([
        { json: "fill_alpha", js: "fill_alpha", typ: r("PurpleFillAlpha") },
        { json: "fill_color", js: "fill_color", typ: r("PurpleFillColor") },
        { json: "line_color", js: "line_color", typ: r("PurpleLineColor") },
        { json: "marker", js: "marker", typ: u(undefined, r("PurpleMarker")) },
        { json: "size", js: "size", typ: r("PurpleSize") },
        { json: "x", js: "x", typ: r("PurpleX") },
        { json: "y", js: "y", typ: r("PurpleY") },
    ], "any"),
    "PurpleFillAlpha": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleFillColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleLineColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleMarker": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "PurpleSize": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleX": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleY": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "MutedGlyph": o([
        { json: "attributes", js: "attributes", typ: r("MutedGlyphAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "MutedGlyphAttributes": o([
        { json: "fill_alpha", js: "fill_alpha", typ: r("FluffyFillAlpha") },
        { json: "fill_color", js: "fill_color", typ: r("FluffyFillColor") },
        { json: "hatch_alpha", js: "hatch_alpha", typ: r("PurpleHatchAlpha") },
        { json: "line_alpha", js: "line_alpha", typ: r("PurpleLineAlpha") },
        { json: "line_color", js: "line_color", typ: r("FluffyLineColor") },
        { json: "marker", js: "marker", typ: u(undefined, r("FluffyMarker")) },
        { json: "size", js: "size", typ: r("FluffySize") },
        { json: "x", js: "x", typ: r("FluffyX") },
        { json: "y", js: "y", typ: r("FluffyY") },
    ], "any"),
    "FluffyFillAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "FluffyFillColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "PurpleHatchAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "PurpleLineAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "FluffyLineColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyMarker": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "FluffySize": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyX": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyY": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "NonselectionGlyph": o([
        { json: "attributes", js: "attributes", typ: r("NonselectionGlyphAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "NonselectionGlyphAttributes": o([
        { json: "fill_alpha", js: "fill_alpha", typ: r("TentacledFillAlpha") },
        { json: "fill_color", js: "fill_color", typ: r("TentacledFillColor") },
        { json: "hatch_alpha", js: "hatch_alpha", typ: r("FluffyHatchAlpha") },
        { json: "line_alpha", js: "line_alpha", typ: r("FluffyLineAlpha") },
        { json: "line_color", js: "line_color", typ: r("TentacledLineColor") },
        { json: "marker", js: "marker", typ: u(undefined, r("TentacledMarker")) },
        { json: "size", js: "size", typ: r("TentacledSize") },
        { json: "x", js: "x", typ: r("TentacledX") },
        { json: "y", js: "y", typ: r("TentacledY") },
    ], "any"),
    "TentacledFillAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "TentacledFillColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "FluffyHatchAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "FluffyLineAlpha": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: 3.14 },
    ], "any"),
    "TentacledLineColor": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TentacledMarker": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "TentacledSize": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TentacledX": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TentacledY": o([
        { json: "field", js: "field", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "View": o([
        { json: "attributes", js: "attributes", typ: r("ViewAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "ViewAttributes": o([
        { json: "filter", js: "filter", typ: r("Filter") },
    ], "any"),
    "Filter": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "Right": o([
        { json: "attributes", js: "attributes", typ: r("RightAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "RightAttributes": o([
        { json: "items", js: "items", typ: a(r("FluffyItem")) },
    ], "any"),
    "FluffyItem": o([
        { json: "attributes", js: "attributes", typ: r("StickyAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "StickyAttributes": o([
        { json: "label", js: "label", typ: r("FluffyLabel") },
        { json: "renderers", js: "renderers", typ: a(r("TentacledRenderer")) },
    ], "any"),
    "FluffyLabel": o([
        { json: "type", js: "type", typ: "" },
        { json: "value", js: "value", typ: "" },
    ], "any"),
    "TentacledRenderer": o([
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "Title": o([
        { json: "attributes", js: "attributes", typ: r("TitleAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "TitleAttributes": o([
        { json: "text", js: "text", typ: "" },
    ], "any"),
    "Toolbar": o([
        { json: "attributes", js: "attributes", typ: r("ToolbarAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "ToolbarAttributes": o([
        { json: "active_drag", js: "active_drag", typ: r("ActiveDrag") },
        { json: "tools", js: "tools", typ: a(r("Tool")) },
    ], "any"),
    "ActiveDrag": o([
        { json: "id", js: "id", typ: "" },
    ], "any"),
    "Tool": o([
        { json: "attributes", js: "attributes", typ: u(undefined, r("ToolAttributes")) },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "ToolAttributes": o([
        { json: "overlay", js: "overlay", typ: u(undefined, r("Overlay")) },
        { json: "renderers", js: "renderers", typ: u(undefined, "") },
        { json: "tooltips", js: "tooltips", typ: u(undefined, a(a(""))) },
    ], "any"),
    "Overlay": o([
        { json: "attributes", js: "attributes", typ: r("OverlayAttributes") },
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "OverlayAttributes": o([
        { json: "bottom_units", js: "bottom_units", typ: u(undefined, "") },
        { json: "editable", js: "editable", typ: u(undefined, true) },
        { json: "fill_alpha", js: "fill_alpha", typ: 3.14 },
        { json: "fill_color", js: "fill_color", typ: "" },
        { json: "left_units", js: "left_units", typ: u(undefined, "") },
        { json: "level", js: "level", typ: "" },
        { json: "line_alpha", js: "line_alpha", typ: 3.14 },
        { json: "line_color", js: "line_color", typ: "" },
        { json: "line_dash", js: "line_dash", typ: a(0) },
        { json: "line_width", js: "line_width", typ: 0 },
        { json: "right_units", js: "right_units", typ: u(undefined, "") },
        { json: "syncable", js: "syncable", typ: true },
        { json: "top_units", js: "top_units", typ: u(undefined, "") },
        { json: "visible", js: "visible", typ: true },
    ], "any"),
    "XRange": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "XScale": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "YRange": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
    "YScale": o([
        { json: "id", js: "id", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "type", js: "type", typ: "" },
    ], "any"),
};

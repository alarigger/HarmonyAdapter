MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : IMPORT_ANIMATIC.JS ")
MessageLog.trace("----------------------------------------------------------")

const script_folder = System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")

include(script_folder + "/engine/parse_args.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))

_import_animatic(args.video_path, args.layer_name || "animatique")

scene.saveAll()


// ---------------------------------------------------------------------------
// Core function
//
// Imports the animatic video as a sequence of PNG frames in a READ node.
//
// Batch mode constraints (Harmony 25) that shape this implementation:
//   - column.setEntry() → ACCESS_VIOLATION crash  → exposures set by Python
//   - node.add("READ") → creates PLACEHOLDER      → fixed by Python XML patch
//   - element.physicalName(id) → returns name only → folder = name+"."+id
//   - Drawing.create(clearPixmap=true) → GPU crash → NOT USED here
//
// What this script does:
//   1. Cleanup (idempotent)
//   2. Create element  → Harmony creates elements/{name}.{id}/ on disk
//   3. Extract frames  → MovieImport writes {name}-1.png … {name}-N.png
//   4. Create DRAWING column + link to element
//   5. Create READ node (will be PLACEHOLDER; Python fixes it)
//   6. Save (Python reads xstage to inject exposures and fix the module)
// ---------------------------------------------------------------------------

function _import_animatic(video_path, layer_name) {

    MessageLog.trace("[Animatic] video_path = " + video_path)
    MessageLog.trace("[Animatic] layer_name = " + layer_name)

    // Normalise Windows backslashes → forward slashes
    video_path = video_path.split("\\").join("/")

    // ---- Cleanup (idempotent) ----
    var node_path = "Top/" + layer_name
    if (node.type(node_path) !== "") {
        node.deleteNode(node_path, true, true)
        MessageLog.trace("[Animatic] Deleted node: " + node_path)
    }
    // Also remove orphan READ nodes linked to our column
    if (column.type(layer_name) !== "") {
        var subnodes = node.subNodes("Top")
        for (var i = 0; i < subnodes.length; i++) {
            var n = subnodes[i]
            if (node.type(n) === "READ") {
                var linked = node.getTextAttr(n, 1, "DRAWING.ELEMENT")
                if (linked === layer_name) {
                    node.deleteNode(n, true, true)
                    MessageLog.trace("[Animatic] Cleaned orphan READ: " + n)
                }
            }
        }
        // Note: column.removeColumn() n'existe pas dans Harmony 25.
        // La colonne sera réutilisée ou reliée au nouvel élément ci-dessous.
    }
    // Remove existing element with this name
    var num_elem = element.numberOf()
    for (var i = 0; i < num_elem; i++) {
        var eid = element.id(i)
        if (element.physicalName(eid) === layer_name) {
            element.remove(eid)
            MessageLog.trace("[Animatic] Removed element id: " + eid)
            break
        }
    }

    // ---- Create element (Harmony creates the folder immediately) ----
    var elem_id = element.add(layer_name, "COLOR", 12, "PNG", "None")
    if (elem_id < 0) throw "[Animatic] element.add() failed for: " + layer_name
    MessageLog.trace("[Animatic] elem_id = " + elem_id)

    // The element folder follows the Harmony convention: name.id
    // element.physicalName() is bugged in batch mode (omits the .id suffix),
    // but the actual folder on disk is reliably named as below.
    var scene_folder = scene.currentProjectPath()
    var elem_folder  = scene_folder + "/elements/" + layer_name + "." + elem_id

    // Ensure the folder exists (normally created by element.add, but mkdir is safe)
    var d = new Dir
    d.path = elem_folder
    if (!d.exists) {
        d.mkdirs()
        MessageLog.trace("[Animatic] Created element folder: " + elem_folder)
    }

    // ---- Extract frames via MovieImport ----
    // MovieImport writes {prefix}-1.png, {prefix}-2.png … into elem_folder.
    // This is the same naming convention Harmony uses for drawing files.
    MovieImport.setMovieFilename(video_path)
    MovieImport.setImageFolder(elem_folder)
    MovieImport.setImagePrefix(layer_name)
    MovieImport.doImport()

    var movie_length = MovieImport.numberOfImages()
    MessageLog.trace("[Animatic] Frames extracted: " + movie_length)

    if (movie_length <= 0) {
        // Batch mode may not support MovieImport on some configurations.
        // Log the error and let Python report it.
        MessageLog.trace("[Animatic] WARNING: MovieImport returned 0 frames. " +
                         "Batch mode video decoding may be unavailable.")
    }

    // ---- Create DRAWING column ----
    // column.add() may return true (bool) instead of the column name — ignore
    // the return value and always reference the column by layer_name.
    if (column.type(layer_name) !== "") {
        MessageLog.trace("[Animatic] Reusing existing column: " + layer_name)
    } else {
        column.add(layer_name, "DRAWING")
        MessageLog.trace("[Animatic] Created column: " + layer_name)
    }
    column.setElementIdOfDrawing(layer_name, elem_id)

    // ---- Create READ node (becomes PLACEHOLDER in batch mode — fixed by Python) ----
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0)
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name)
        new_node = "Top/" + layer_name
    }
    node.linkAttr(new_node, "DRAWING.ELEMENT", layer_name)
    MessageLog.trace("[Animatic] READ/PLACEHOLDER node created: " + new_node)
}

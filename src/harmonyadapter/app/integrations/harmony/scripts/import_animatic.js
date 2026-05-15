MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : IMPORT_ANIMATIC.JS ")
MessageLog.trace("----------------------------------------------------------")

// Ce script tourne SANS -batch (lancé via launcher_noBatch.bat).
// Toutes les APIs Harmony sont disponibles :
//   - node.add("READ") crée un vrai module READ (pas un PLACEHOLDER)
//   - column.setEntry() fonctionne sans ACCESS_VIOLATION
//
// Args attendus (via HARMONY_WRAPPER_ARGS JSON) :
//   video_path : chemin absolu vers le fichier vidéo source
//   layer_name : nom du node READ à créer (défaut : "animatique")
//   scale_x    : échelle X de l'overlay (défaut : 0.33)
//   scale_y    : échelle Y de l'overlay (défaut : 0.33)
//   offset_x   : décalage X (défaut : 0.36)
//   offset_y   : décalage Y (défaut : -0.20)

const script_folder = System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")

include(script_folder + "/engine/parse_args.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))

try {
    _import_animatic(
        args.video_path,
        args.layer_name || "animatique",
        args.scale_x    !== undefined ? parseFloat(args.scale_x)  : 0.33,
        args.scale_y    !== undefined ? parseFloat(args.scale_y)  : 0.33,
        args.offset_x   !== undefined ? parseFloat(args.offset_x) : 0.36,
        args.offset_y   !== undefined ? parseFloat(args.offset_y) : -0.20
    )
    scene.saveAll()
    System.exit(0)
} catch (e) {
    MessageLog.trace("[Animatic] FATAL ERROR: " + e)
    scene.saveAll()
    System.exit(1)
}


// ---------------------------------------------------------------------------
// Core function
//
// Ce script tourne sans -batch : toutes les APIs fonctionnent normalement.
//
// Ce que ce script fait :
//   1. Cleanup (idempotent)
//   2. Créer l'élément → Harmony crée elements/{name}.{id}/ sur disque
//   3. Extraire les frames → MovieImport écrit {name}-1.png … {name}-N.png
//   4. Créer la colonne DRAWING + lier à l'élément
//   5. Créer le node READ (vrai READ, pas PLACEHOLDER)
//   6. Définir les exposures frame par frame via column.setEntry()
//   7. Appliquer le transform (scale/offset) via node.setTextAttr()
//   8. Lier au Composite
// ---------------------------------------------------------------------------

function _import_animatic(video_path, layer_name, scale_x, scale_y, offset_x, offset_y) {

    MessageLog.trace("[Animatic] video_path = " + video_path)
    MessageLog.trace("[Animatic] layer_name = " + layer_name)
    MessageLog.trace("[Animatic] scale      = (" + scale_x + ", " + scale_y + ")")
    MessageLog.trace("[Animatic] offset     = (" + offset_x + ", " + offset_y + ")")

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
    }
    // Remove existing element with this name.
    var num_elem = element.numberOf()
    for (var i = 0; i < num_elem; i++) {
        var eid = element.id(i)
        if (element.physicalName(eid) === layer_name) {
            try {
                element.remove(eid, true)
            } catch (e) {
                try { element.remove(eid) } catch (e2) {}
            }
            MessageLog.trace("[Animatic] Removed element id: " + eid)
            break
        }
    }

    // ---- Create element (Harmony creates the folder immediately) ----
    var elem_id = element.add(layer_name, "COLOR", 12, "PNG", "None")
    if (elem_id < 0) throw "[Animatic] element.add() failed for: " + layer_name
    MessageLog.trace("[Animatic] elem_id = " + elem_id)

    var scene_folder = scene.currentProjectPath()
    var elem_folder  = scene_folder + "/elements/" + layer_name + "." + elem_id

    var d = new Dir
    d.path = elem_folder
    if (!d.exists) {
        d.mkdirs()
        MessageLog.trace("[Animatic] Created element folder: " + elem_folder)
    }

    // ---- Extract frames via MovieImport ----
    MovieImport.setMovieFilename(video_path)
    MovieImport.setImageFolder(elem_folder)
    MovieImport.setImagePrefix(layer_name)
    MovieImport.doImport()

    var movie_length = MovieImport.numberOfImages()
    MessageLog.trace("[Animatic] Frames extracted: " + movie_length)

    if (movie_length <= 0) {
        throw "[Animatic] MovieImport returned 0 frames for: " + video_path
    }

    // ---- Create DRAWING column ----
    if (column.type(layer_name) !== "") {
        MessageLog.trace("[Animatic] Reusing existing column: " + layer_name)
    } else {
        column.add(layer_name, "DRAWING")
        MessageLog.trace("[Animatic] Created column: " + layer_name)
    }
    column.setElementIdOfDrawing(layer_name, elem_id)

    // ---- Create READ node (vrai READ sans -batch) ----
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0)
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name)
        new_node = "Top/" + layer_name
    }
    node.linkAttr(new_node, "DRAWING.ELEMENT", layer_name)
    MessageLog.trace("[Animatic] READ node created: " + new_node)

    // ---- Définir les exposures frame par frame ----
    // column.setEntry(col, subCol=1, frame, drawingName) — fonctionne sans -batch.
    // Chaque frame i correspond au dessin "{i}" (fichier animatique-{i}.png).
    for (var f = 1; f <= movie_length; f++) {
        column.setEntry(layer_name, 1, f, f.toString())
    }
    MessageLog.trace("[Animatic] Exposures set: 1 to " + movie_length)

    // ---- Appliquer le transform (scale/offset) sur le node READ ----
    // SCALE.X/Y et OFFSET.X/Y sont les attributs intégrés du READ module.
    node.setTextAttr(new_node, 1, "SCALE.X",  scale_x)
    node.setTextAttr(new_node, 1, "SCALE.Y",  scale_y)
    node.setTextAttr(new_node, 1, "OFFSET.X", offset_x)
    node.setTextAttr(new_node, 1, "OFFSET.Y", offset_y)
    MessageLog.trace("[Animatic] Transform applied: scale=(" + scale_x + "," + scale_y +
                     ") offset=(" + offset_x + "," + offset_y + ")")

    // ---- Lier au Composite principal ----
    var comp = "Top/Composite"
    if (node.type(comp) !== "") {
        node.link(new_node, 0, comp, node.numberOfInputPorts(comp))
        MessageLog.trace("[Animatic] Linked to " + comp)
    } else {
        MessageLog.trace("[Animatic] Warning: Top/Composite not found")
    }

    MessageLog.trace("[Animatic] Done: '" + layer_name + "' imported from " + video_path)
}

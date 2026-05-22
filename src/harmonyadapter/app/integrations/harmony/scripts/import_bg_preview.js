MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : IMPORT_BG_PREVIEW.JS ")
MessageLog.trace("----------------------------------------------------------")

// Ce script tourne en mode BATCH (lancé via launcher.bat avec -batch -compile).
// En batch mode :
//   - node.add("READ") crée un vrai module READ (pas un PLACEHOLDER)
//   - Drawing.create(id, "1", false, false) fonctionne (clearPixmap=false obligatoire)
//   - QFile disponible pour la copie du JPG
//   - column.setEntry() cause ACCESS_VIOLATION → NE PAS UTILISER
//   - System.exit() non nécessaire (Harmony quitte automatiquement en fin de script)
//
// Gestion des exposures :
//   L'élément est créé avec un seul dessin "1". Harmony l'expose automatiquement
//   sur toutes les frames à l'ouverture de la scène (comportement par défaut pour
//   un élément JPEG à dessin unique). Pas d'appel column.setEntry() requis.
//
// Args attendus (via HARMONY_WRAPPER_ARGS JSON) :
//   jpg_path   : chemin absolu vers le JPG source
//   layer_name : nom du node READ à créer (défaut : "BG_preview")
//   offset_x   : décalage X du READ (calculé côté Python, défaut : 0)
//   offset_y   : décalage Y du READ
//   scale_x    : échelle X du READ (défaut : 1)
//   scale_y    : échelle Y du READ

const script_folder = System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")

include(script_folder + "/engine/parse_args.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))

try {
    _import_bg_preview(
        args.jpg_path,
        args.layer_name || "BG_preview",
        args.offset_x !== undefined ? parseFloat(args.offset_x) : 0.0,
        args.offset_y !== undefined ? parseFloat(args.offset_y) : 0.0,
        args.scale_x !== undefined ? parseFloat(args.scale_x) : 1.0,
        args.scale_y !== undefined ? parseFloat(args.scale_y) : 1.0
    )
    scene.saveAll()
} catch (e) {
    MessageLog.trace("[BGPreview] FATAL ERROR: " + e)
    // Ne pas appeler scene.saveAll() en cas d'erreur (état potentiellement corrompu)
}


// ---------------------------------------------------------------------------
// Core function
//
// Lancé en mode batch : node.add("READ") crée un vrai READ module,
// Drawing.create + QFile disponibles pour la copie du JPG.
//
// Ordre d'opérations :
//   1. Cleanup idempotent (supprimer node/column/element précédents)
//   2. Créer le node READ
//   3. Créer élément + colonne + lier
//   4. Créer l'entrée Drawing et copier le JPG via Drawing.filename() + QFile
//   5. Appliquer le transform (offset/scale) via node.setTextAttr()
//   6. Lier au Composite
//   (Pas d'exposures via column.setEntry() — ACCESS_VIOLATION en batch mode)
// ---------------------------------------------------------------------------

function _import_bg_preview(jpg_path, layer_name, offset_x, offset_y, scale_x, scale_y) {

    MessageLog.trace("[BGPreview] jpg_path   = " + jpg_path)
    MessageLog.trace("[BGPreview] layer_name = " + layer_name)
    MessageLog.trace("[BGPreview] offset     = (" + offset_x + ", " + offset_y + ")")
    MessageLog.trace("[BGPreview] scale      = (" + scale_x + ", " + scale_y + ")")

    // Normaliser les backslashes Windows → forward slashes
    jpg_path = jpg_path.split("\\").join("/")

    // --- Cleanup idempotent ---
    var node_path = "Top/" + layer_name
    if (node.type(node_path) !== "") {
        node.deleteNode(node_path, true, true)
        MessageLog.trace("[BGPreview] Deleted node: " + node_path)
    }
    if (column.type(layer_name) !== "") {
        var subnodes = node.subNodes("Top")
        for (var i = 0; i < subnodes.length; i++) {
            var n = subnodes[i]
            if (node.type(n) === "READ") {
                var linked_col = node.linkedColumn(n, "DRAWING.ELEMENT")
                if (linked_col === layer_name) {
                    node.deleteNode(n, true, true)
                    MessageLog.trace("[BGPreview] Cleaned orphan READ node: " + n)
                }
            }
        }
    }

    // --- Créer le node READ EN PREMIER (vrai READ sans -batch) ---
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0)
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name)
        new_node = "Top/" + layer_name
    }
    MessageLog.trace("[BGPreview] READ node created: " + new_node)

    // --- Créer l'élément et la colonne ---
    var elem_id = element.add(layer_name, "COLOR", 12, "JPEG", "None")
    if (elem_id < 0) throw "[BGPreview] element.add() failed for: " + layer_name
    MessageLog.trace("[BGPreview] elem_id: " + elem_id)

    var col_name = layer_name
    if (column.type(layer_name) !== "") {
        MessageLog.trace("[BGPreview] Reusing existing column: " + col_name)
    } else {
        column.add(layer_name, "DRAWING")
        MessageLog.trace("[BGPreview] Created column: " + col_name)
    }
    column.setElementIdOfDrawing(col_name, elem_id)
    MessageLog.trace("[BGPreview] column linked to element " + elem_id)

    // --- Créer l'entrée de dessin et copier le JPG ---
    // Drawing.create(id, name, clearPixmap=false, reposition=false) :
    //   clearPixmap=false → stable (pas d'init GPU requise)
    Drawing.create(elem_id, "1", false, false)
    var dst_path = Drawing.filename(elem_id, "1")
    MessageLog.trace("[BGPreview] Drawing.filename = " + dst_path)

    // Normaliser le chemin de destination (Drawing.filename peut retourner backslashes)
    dst_path = dst_path.split("\\").join("/")

    // Créer le dossier si nécessaire
    var dst_dir_str = dst_path.substring(0, dst_path.lastIndexOf("/"))
    var dst_dir = new Dir
    dst_dir.path = dst_dir_str
    if (!dst_dir.exists) {
        dst_dir.mkdirs()
        MessageLog.trace("[BGPreview] Created element folder: " + dst_dir_str)
    }

    // Copier le JPG (supprimer l'existant pour permettre l'écrasement)
    var dst_file = new QFile(dst_path)
    if (dst_file.exists()) dst_file.remove()
    var src_file = new QFile(jpg_path)
    if (!src_file.copy(dst_path)) {
        throw "[BGPreview] QFile.copy failed: " + jpg_path + " → " + dst_path
    }
    MessageLog.trace("[BGPreview] JPG copied to: " + dst_path)

    // --- Lier le node READ à la colonne ---
    node.linkAttr(new_node, "DRAWING.ELEMENT", col_name)
    MessageLog.trace("[BGPreview] Linked READ node to column")

    // Pas d'exposition explicite via column.setEntry() :
    // column.setEntry() cause ACCESS_VIOLATION en batch mode.
    // L'élément contient un seul dessin "1" — Harmony l'expose automatiquement.

    // --- Appliquer le transform (offset/scale) sur le node READ ---
    // Les attributs OFFSET.X/Y et SCALE.X/Y sont les attrs intégrés du READ module.
    // node.setTextAttr(path, frame, attrName, value) — frame=1 donne une valeur statique.
    if (offset_x !== 0.0 || offset_y !== 0.0) {
        node.setTextAttr(new_node, "OFFSET.X", 1, offset_x)
        node.setTextAttr(new_node, "OFFSET.Y", 1, offset_y)
        MessageLog.trace("[BGPreview] Applied offset: (" + offset_x + ", " + offset_y + ")")
    }
    if (scale_x !== 1.0 || scale_y !== 1.0) {
        node.setTextAttr(new_node, "SCALE.X", 1, scale_x)
        node.setTextAttr(new_node, "SCALE.Y", 1, scale_y)
        MessageLog.trace("[BGPreview] Applied scale: (" + scale_x + ", " + scale_y + ")")
    }

    // --- Lier au Composite principal ---
    var comp = "Top/Composite"
    if (node.type(comp) !== "") {
        node.link(new_node, 0, comp, node.numberOfInputPorts(comp))
        MessageLog.trace("[BGPreview] Linked to " + comp)
    } else {
        MessageLog.trace("[BGPreview] Warning: Top/Composite not found")
    }

    MessageLog.trace("[BGPreview] Done: '" + layer_name + "' imported from " + jpg_path)
}

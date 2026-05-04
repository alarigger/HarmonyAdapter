MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : IMPORT_BG_PREVIEW.JS ")
MessageLog.trace("----------------------------------------------------------")

const script_folder = System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")
const lib_folder    = System.getenv("APP_LIB_FOLDER")

// API Harmony brute uniquement — pas d'OpenHarmony.
// Raisons :
//   - root.importImage() crash en batch mode (clearPixmap=true init GPU)
//   - column.uniqueName() n'existe pas en Harmony 25
// On utilise :
//   - element.add / column.add / node.add / Drawing.create (raw Harmony)
//   - column.setElementIdOfDrawing (raw Harmony, confirmé dans oDrawingColumn.js)
//   - Dir (raw Harmony) pour la copie de fichier

include(script_folder + "/engine/parse_args.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))

_import_bg_preview(args.jpg_path, args.layer_name || "BG_preview")

scene.saveAll()


// ---------------------------------------------------------------------------
// Core function
// Drawing.create(id, name, clearPixmap, reposition) :
//   clearPixmap=true  → crash en batch mode (init GPU/display requise)
//   clearPixmap=false → stable en batch mode
//
// Ordre d'opérations intentionnel :
//   1. Cleanup (supprimer node + tous les READ liés à la colonne, pour idempotence)
//   2. Créer le node READ EN PREMIER — évite le conflit de nom avec l'élément
//   3. Créer élément + colonne + lier
//   4. Copier le JPG + Drawing.create
//   5. Lier au Composite
// ---------------------------------------------------------------------------

function _import_bg_preview(jpg_path, layer_name) {

    MessageLog.trace("[BGPreview] jpg_path   = " + jpg_path)
    MessageLog.trace("[BGPreview] layer_name = " + layer_name)

    // Normaliser les backslashes Windows → forward slashes
    jpg_path = jpg_path.split("\\").join("/")

    // --- Cleanup idempotent ---
    // 1. Supprimer le node direct s'il existe déjà
    var node_path = "Top/" + layer_name
    if (node.type(node_path) !== "") {
        node.deleteNode(node_path, true, true)
        MessageLog.trace("[BGPreview] Deleted node: " + node_path)
    }
    // 2. Supprimer tous les READ nodes de Top liés à notre colonne
    //    (peut exister sous un autre nom si exécution précédente avortée)
    if (column.type(layer_name) !== "") {
        var subnodes = node.subNodes("Top")
        for (var i = 0; i < subnodes.length; i++) {
            var n = subnodes[i]
            if (node.type(n) === "READ") {
                var linked = node.getTextAttr(n, 1, "DRAWING.ELEMENT")
                if (linked === layer_name) {
                    node.deleteNode(n, true, true)
                    MessageLog.trace("[BGPreview] Cleaned orphan READ node: " + n)
                }
            }
        }
    }

    // --- Créer le node READ EN PREMIER ---
    // Créer le node avant l'élément évite le conflit de nom dans le namespace Harmony
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0)
    // Correction du nom si Harmony a utilisé le type comme fallback
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name)
        new_node = "Top/" + layer_name
    }
    MessageLog.trace("[BGPreview] READ node created: " + new_node)

    // --- Créer l'élément et la colonne ---
    var elem_id = element.add(layer_name, "COLOR", 12, "JPEG", "None")
    if (elem_id < 0) throw "[BGPreview] element.add() failed for: " + layer_name
    MessageLog.trace("[BGPreview] elem_id: " + elem_id)

    // Note: column.add() peut retourner true (booléen) au lieu du nom de colonne
    // selon la version/contexte de Harmony. On ignore la valeur de retour et on
    // utilise toujours layer_name comme identifiant de colonne.
    var col_name = layer_name
    if (column.type(layer_name) !== "") {
        MessageLog.trace("[BGPreview] Reusing existing column: " + col_name)
    } else {
        column.add(layer_name, "DRAWING")
        MessageLog.trace("[BGPreview] Created column: " + col_name)
    }

    // Lier la colonne au nouvel élément
    column.setElementIdOfDrawing(col_name, elem_id)
    MessageLog.trace("[BGPreview] column linked to element " + elem_id)

    // --- Créer l'entrée de dessin (clearPixmap=false : stable en batch mode) ---
    // Note: column.setEntry() crash avec ACCESS_VIOLATION en batch mode sur Harmony 25.
    // Note: element.physicalName() retourne elementName (ex: "BG_preview") et NON
    //       elementFolder (ex: "BG_preview.22") — la copie du fichier est donc
    //       faite côté Python après sauvegarde, en lisant l'attribut elementFolder
    //       depuis le XML du xstage.
    Drawing.create(elem_id, "1", false, false)
    MessageLog.trace("[BGPreview] Drawing entry created")
    // Log exact file path Harmony expects for this drawing
    var expected_file = Drawing.filename(elem_id, "1")
    MessageLog.trace("[BGPreview] Drawing.filename = " + expected_file)

    // --- Lier le node READ à la colonne ---
    node.linkAttr(new_node, "DRAWING.ELEMENT", col_name)
    MessageLog.trace("[BGPreview] Linked READ node to column")

    // --- Lier au Composite principal ---
    var comp = "Top/Composite"
    if (node.type(comp) !== "") {
        node.link(new_node, 0, comp, node.numberOfInputPorts(comp))
        MessageLog.trace("[BGPreview] Linked to " + comp)
    } else {
        MessageLog.trace("[BGPreview] Warning: Top/Composite not found")
    }

    // TODO: Cohérence caméra
    // Le BG preview est actuellement importé flat (aucune transformation).
    // Si la scène a un mouvement de caméra, le BG ne le suivra pas.
    // Pour corriger : envelopper new_node dans un Peg (comme putNodeInGroupWithPeg
    // dans bg_cadre.js) et appliquer les coordonnées issues de CameraManager.
    // Blocker actuel : on n'a pas de "cadre" (rectangle de composition) pour ce JPG,
    // contrairement aux BG PrevizBG qui ont un cadre défini dans le PSD.
    // Options à évaluer avec l'équipe :
    //   A) Utiliser la taille native du JPG comme cadre (bg.width / bg.height)
    //   B) Laisser flat et accepter que le BG preview ne suive pas la caméra
    //   C) Passer un cadre optionnel en argument (à alimenter par MiyuBGPreviewResolver)

    MessageLog.trace("[BGPreview] Done: '" + layer_name + "' imported from " + jpg_path)
}

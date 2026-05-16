

/*
             
                IMPORTATION STRATEGIES 
                Describe what is happening inside the asset group .. importing tpl , layers ect... 

*/

function ImportStrategiesRegister() {

    this._table = {}
    /**
     * 
     * @param {string} name 
     * @param {function} func 
     */
    this.add = function (name, func) {
        this._table[name] = func
    }
    /**
     * 
     * @param {AssetGroup} asset_group 
     * @returns {$.oNode[]}
     */
    this.apply = function (asset_group) {
        const strategy_name = asset_group.get_import_strategy() ||  asset_group.get_file_type()
        if (!this._table[strategy_name]) {
            MessageLog.trace("Import Strategy not found: " + strategy_name)
            return asset_group
        }
        return this._table[strategy_name](asset_group)
    }
}
var import_strategy_register = new ImportStrategiesRegister()


/**
 * Import TPL
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_tpl(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    // Delete the empty wrapper group BEFORE importing.
    // Rationale: addGroup() sets the new group as Harmony's "current active group".
    // copyPaste.pasteNewNodes then pastes into that context (ignoring the explicit "Top" param).
    // Deleting it resets the active context to Top so the import lands at the correct level.
    if (group && group.path) {
        MessageLog.trace("[TPL] Deleting wrapper group before import: " + group.path);
        node.deleteNode(group.path, false, false);
    }

    // Reset stale registrations (wrapper group no longer exists)
    asset_group.node_list = [];
    asset_group.node_table = {};

    // Import at Top level
    var top = $.scene.getNodeByPath("Top");
    var nodes = top.importTemplate(path);
    MessageLog.trace("[TPL] imported nodes raw: " + nodes);

    if (!nodes) {
        MessageLog.trace("[TPL] ERROR Import failed: " + path);
        return null;
    }

    // Normalize to array
    if (!Array.isArray(nodes)) {
        nodes = [nodes];
    }

    if (nodes.length === 0) {
        MessageLog.trace("[TPL] ERROR Empty import result: " + path);
        return null;
    }
    var firstNode = nodes[0];

    MessageLog.trace("[TPL] first node type: " + node.type(firstNode.path) + " path: " + firstNode.path);

    if (node.type(firstNode.path) == "GROUP") {
        // GROUP-rooted TPL: the imported group has its own internal multiport routing.
        MessageLog.trace("[TPL] GROUP-rooted TPL at Top level: " + firstNode.path);
        asset_group.group = firstNode;
        asset_group.register_node(firstNode, "group");
        asset_group.register_node(firstNode, "head");
    } else {
        // PEG-rooted TPL: PEG is head, last node (puppet group) is foot.
        var headNode = nodes[0];
        var footNode = nodes[nodes.length - 1];
        MessageLog.trace("[TPL] PEG-rooted TPL at Top level: peg=" + headNode.path + " foot=" + footNode.path);
        asset_group.group = footNode;
        asset_group.register_node(headNode, "peg");
        asset_group.register_node(headNode, "head");
        asset_group.register_node(footNode, "group");
    }

    return asset_group
}
import_strategy_register.add("TPL", _import_strategy_tpl)





/**
 * Import PSD 
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_psd(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    return asset_group
    return group.importPSD(path, true, true, true, true)
}
import_strategy_register.add("PSD", _import_strategy_psd)

/**
 * Import Image proxy representing the file (PSD -> PNG ) this image should exist and be given in computed.proxy_image
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_proxy_image(asset_group) {

    const image_path = asset_group.get_proxy_image_path()
    var group = asset_group.group
    if(!image_path){
        MessageLog.trace("[use_proxy_image] ERROR! proxy image not found  "+image_path)
        return asset_group
    }
    MessageLog.trace("[use_proxy_image] Importing proxy image "+image_path)
    var image_node = group.importImage(image_path)
    image_node.linkOutNode(group.multiportOut);
    group.multiportIn.linkOutNode(image_node);
    return asset_group
}
import_strategy_register.add("use_proxy_image", _import_strategy_proxy_image)



/**
 * 
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 *
 * XSTAGE : import d'un puppet Harmony depuis un fichier .xstage extrait.
 *
 * Stratégie : tenter d'abord importTemplate (OpenHarmony), qui peut
 * accepter un .xstage valide en plus du .tpl classique.
 * En cas d'échec, essayer scene.importLayout (API native Harmony).
 *
 * Note studio Miyu :
 *   Les puppets sont livrés sous forme d'archives .rar/.zip contenant
 *   un .xstage. Le PuppetResolver Python extrait l'archive et passe le
 *   chemin .xstage ici via le JSON de scene build.
 */
function _import_strategy_xstage(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    MessageLog.trace("[XSTAGE] Import du puppet depuis : " + path);

    // --- Tentative 1 : importTemplate OpenHarmony ---
    var nodes = null;
    try {
        nodes = group.importTemplate(path);
    } catch (e) {
        MessageLog.trace("[XSTAGE] importTemplate a échoué : " + e);
        nodes = null;
    }

    if (nodes && !(Array.isArray(nodes) && nodes.length === 0)) {
        MessageLog.trace("[XSTAGE] importTemplate réussi.");
        if (!Array.isArray(nodes)) nodes = [nodes];
        var first = nodes[0];
        if (node.type(first.path) === "GROUP") {
            first.linkOutNode(group.multiportOut);
            group.multiportIn.linkOutNode(first);
        }
        return nodes;
    }

    // --- Tentative 2 : scene.importLayout (API native Harmony) ---
    try {
        MessageLog.trace("[XSTAGE] Tentative importLayout...");
        // scene.importLayout importe la structure de nodes depuis un .xstage
        // uniquement disponible dans certaines versions de Harmony Premium
        scene.importLayout(path, group.path);
        MessageLog.trace("[XSTAGE] importLayout réussi.");
        return group;
    } catch (e2) {
        MessageLog.trace("[XSTAGE] importLayout a échoué : " + e2);
    }

    MessageLog.trace("[XSTAGE] ERREUR : impossible d'importer " + path);
    MessageLog.trace("[XSTAGE] → Vérifier que le .xstage est un puppet valide.");
    return null;
}
import_strategy_register.add("XSTAGE", _import_strategy_xstage)





/**
 * Import PNG
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_png(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    return group
}
import_strategy_register.add("PNG", _import_strategy_png)


/**
 * Import PNG SEQUENCE
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_png_sequence(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    return group
}
import_strategy_register.add("PNG_SEQUENCE", _import_strategy_png_sequence)



/**
 * Import PNG AS LAYERS
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_png_layers(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    return group
}
import_strategy_register.add("PNG_AS_LAYERS", _import_strategy_png_layers)


/**
 * Import VIDEO 
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_video(asset_group) {

    const path = asset_group.get_path()
    var group = asset_group.group

    return group
}
import_strategy_register.add("VIDEO", _import_strategy_video)


/**
 * Import JPG as a BG READ node.
 *
 * Used for BG preview placeholders injected by SceneBuildRunner (Python side).
 * Mirrors the core logic of import_bg_preview.js — the asset is placed in the
 * BG backdrop and linked to Top/Composite by the standard pipeline steps
 * (_deployment_strategy_bg_asset + _link_asset_group).
 *
 * File copy, exposure injection and PLACEHOLDER→READ patch are handled by
 * Python post-processing (HarmonyBGPreviewImporter._post_process_xstage)
 * after the Harmony batch run, exactly as in the standalone import-bg command.
 *
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_jpg(asset_group) {

    var jpg_path = asset_group.get_path().split("\\").join("/");
    var group = asset_group.group;
    var layer_name = asset_group.get_asset_name();

    // Lire offset/scale depuis asset_group.computed si présent
    var offset_x = 0.0, offset_y = 0.0, scale_x = 1.0, scale_y = 1.0;
    if (asset_group.computed) {
        if (asset_group.computed.offset_x !== undefined) offset_x = parseFloat(asset_group.computed.offset_x);
        if (asset_group.computed.offset_y !== undefined) offset_y = parseFloat(asset_group.computed.offset_y);
        if (asset_group.computed.scale_x !== undefined) scale_x = parseFloat(asset_group.computed.scale_x);
        if (asset_group.computed.scale_y !== undefined) scale_y = parseFloat(asset_group.computed.scale_y);
    }
    MessageLog.trace("[JPG] Import BG preview from : " + jpg_path);
    MessageLog.trace("[JPG] Layer name : " + layer_name);
    MessageLog.trace("[JPG] Offset: (" + offset_x + ", " + offset_y + ") Scale: (" + scale_x + ", " + scale_y + ")");

    // --- Delete wrapper group (same reason as TPL strategy) ---
    if (group && group.path) {
        MessageLog.trace("[JPG] Deleting wrapper group : " + group.path);
        node.deleteNode(group.path, false, false);
    }
    asset_group.node_list = [];
    asset_group.node_table = {};

    // --- Idempotent cleanup ---
    var node_path = "Top/" + layer_name;
    if (node.type(node_path) !== "") {
        node.deleteNode(node_path, true, true);
        MessageLog.trace("[JPG] Deleted existing node : " + node_path);
    }
    if (column.type(layer_name) !== "") {
        var subnodes = node.subNodes("Top");
        for (var i = 0; i < subnodes.length; i++) {
            var n = subnodes[i];
            if (node.type(n) === "READ") {
                var linked = node.getTextAttr(n, 1, "DRAWING.ELEMENT");
                if (linked === layer_name) {
                    node.deleteNode(n, true, true);
                    MessageLog.trace("[JPG] Cleaned orphan READ : " + n);
                }
            }
        }
    }
    // Remove existing element with this name.
    var num_elem = element.numberOf();
    for (var i = 0; i < num_elem; i++) {
        var eid = element.id(i);
        if (element.physicalName(eid) === layer_name) {
            try { element.remove(eid, true); } catch (e) { try { element.remove(eid, false); } catch (e2) { } }
            MessageLog.trace("[JPG] Removed element id: " + eid);
            break;
        }
    }

    // --- Create READ node FIRST ---
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0);
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name);
        new_node = "Top/" + layer_name;
    }
    MessageLog.trace("[JPG] READ node created : " + new_node);

    // --- Create element and drawing column ---
    var elem_id = element.add(layer_name, "COLOR", 12, "JPEG", "None");
    if (elem_id < 0) {
        MessageLog.trace("[JPG] element.add() failed for : " + layer_name);
        return null;
    }
    var col_name = layer_name;
    if (column.type(layer_name) === "") {
        column.add(layer_name, "DRAWING");
        MessageLog.trace("[JPG] Created column: " + col_name);
    }
    column.setElementIdOfDrawing(col_name, elem_id);
    MessageLog.trace("[JPG] Column linked to element " + elem_id);

    // Drawing.create: clearPixmap=false is mandatory in batch mode (true crashes GPU)
    Drawing.create(elem_id, "1", false, false);
    var dst_path = Drawing.filename(elem_id, "1");
    MessageLog.trace("[JPG] Drawing.filename = " + dst_path);

    // --- Copier le JPG source dans l'élément ---
    dst_path = dst_path.split("\\").join("/");
    var dst_dir_str = dst_path.substring(0, dst_path.lastIndexOf("/"));
    var dst_dir = new Dir; dst_dir.path = dst_dir_str;
    if (!dst_dir.exists) { dst_dir.mkdirs(); MessageLog.trace("[JPG] Created element folder: " + dst_dir_str); }
    var dst_file = new QFile(dst_path);
    if (dst_file.exists()) dst_file.remove();
    var src_file = new QFile(jpg_path);
    if (!src_file.copy(dst_path)) {
        MessageLog.trace("[JPG] QFile.copy failed: " + jpg_path + " → " + dst_path);
    } else {
        MessageLog.trace("[JPG] JPG copied to: " + dst_path);
    }

    // --- Link READ to column ---
    node.linkAttr(new_node, "DRAWING.ELEMENT", col_name);
    MessageLog.trace("[JPG] Linked READ node to column");

    // --- Appliquer offset/scale sur le node READ ---
    if (offset_x !== 0.0 || offset_y !== 0.0) {
        node.setTextAttr(new_node, 1, "OFFSET.X", offset_x);
        node.setTextAttr(new_node, 1, "OFFSET.Y", offset_y);
        MessageLog.trace("[JPG] Applied offset: (" + offset_x + ", " + offset_y + ")");
    }
    if (scale_x !== 1.0 || scale_y !== 1.0) {
        node.setTextAttr(new_node, 1, "SCALE.X", scale_x);
        node.setTextAttr(new_node, 1, "SCALE.Y", scale_y);
        MessageLog.trace("[JPG] Applied scale: (" + scale_x + ", " + scale_y + ")");
    }

    // --- Register READ node as foot (group) + head so the standard pipeline
    var oNode = $.scene.getNodeByPath(new_node);
    asset_group.group = oNode;
    asset_group.register_node(oNode, "group");
    asset_group.register_node(oNode, "head");

    // --- Wrap in Group + Peg (needed for CadreFitter in deployment step) ---
    try {
        var peg_node = putNodeInGroupWithPeg(layer_name + "_grp", new_node);
        if (peg_node) {
            var group_node = $.scene.getNodeByPath("Top/" + layer_name + "_grp");
            asset_group.group = group_node || peg_node;
            if (group_node) {
                asset_group.register_node(group_node, "group");
            }
            asset_group.register_node(peg_node, "peg");
            asset_group.register_node(peg_node, "head");
            MessageLog.trace("[JPG] Groupe: " + (group_node ? group_node.path : "null") + " | Peg: " + peg_node.path);
        } else {
            MessageLog.trace("[JPG] WARN putNodeInGroupWithPeg a retourné null — import flat.");
        }
    } catch (grp_err) {
        MessageLog.trace("[JPG] WARN erreur création groupe/peg : " + grp_err + " — import flat.");
    }

    MessageLog.trace("[JPG] Done : '" + layer_name + "' ready from " + jpg_path);
    return asset_group;
}
import_strategy_register.add("JPG", _import_strategy_jpg);

/**
 * Import ANIMATIC (video overlay as READ node)
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 *
 * Cette stratégie importe une vidéo animatic comme overlay, en créant un node READ,
 * une colonne, un élément, les exposures, applique le scale/offset, et lie au composite.
 * S'inspire de import_animatic.js mais adaptée au pattern asset_group.
 */
function _import_strategy_animatic(asset_group) {
    var video_path = asset_group.get_path().split("\\").join("/");
    var group = asset_group.group;
    var layer_name = asset_group.get_asset_name() || "animatique";
    var scale_x = asset_group.scale_x !== undefined ? asset_group.scale_x : 0.33;
    var scale_y = asset_group.scale_y !== undefined ? asset_group.scale_y : 0.33;
    var offset_x = asset_group.offset_x !== undefined ? asset_group.offset_x : 0.36;
    var offset_y = asset_group.offset_y !== undefined ? asset_group.offset_y : -0.20;

    MessageLog.trace("[ANIMATIC] Import animatic from: " + video_path);
    MessageLog.trace("[ANIMATIC] Layer name: " + layer_name);
    MessageLog.trace("[ANIMATIC] Scale: (" + scale_x + ", " + scale_y + ")");
    MessageLog.trace("[ANIMATIC] Offset: (" + offset_x + ", " + offset_y + ")");

    // Cleanup (idempotent)
    var node_path = "Top/" + layer_name;
    if (node.type(node_path) !== "") {
        node.deleteNode(node_path, true, true);
        MessageLog.trace("[ANIMATIC] Deleted node: " + node_path);
    }
    if (column.type(layer_name) !== "") {
        var subnodes = node.subNodes("Top");
        for (var i = 0; i < subnodes.length; i++) {
            var n = subnodes[i];
            if (node.type(n) === "READ") {
                var linked = node.getTextAttr(n, 1, "DRAWING.ELEMENT");
                if (linked === layer_name) {
                    node.deleteNode(n, true, true);
                    MessageLog.trace("[ANIMATIC] Cleaned orphan READ: " + n);
                }
            }
        }
    }
    // Remove existing element with this name.
    var num_elem = element.numberOf();
    for (var i = 0; i < num_elem; i++) {
        var eid = element.id(i);
        if (element.physicalName(eid) === layer_name) {
            try { element.remove(eid, true); } catch (e) { try { element.remove(eid); } catch (e2) { } }
            MessageLog.trace("[ANIMATIC] Removed element id: " + eid);
            break;
        }
    }

    // Create element
    var elem_id = element.add(layer_name, "COLOR", 12, "PNG", "None");
    if (elem_id < 0) {
        MessageLog.trace("[ANIMATIC] element.add() failed for: " + layer_name);
        return null;
    }
    var scene_folder = scene.currentProjectPath();
    var elem_folder = scene_folder + "/elements/" + layer_name + "." + elem_id;
    var d = new Dir; d.path = elem_folder;
    if (!d.exists) { d.mkdirs(); MessageLog.trace("[ANIMATIC] Created element folder: " + elem_folder); }

    // Extract frames via MovieImport
    MovieImport.setMovieFilename(video_path);
    MovieImport.setImageFolder(elem_folder);
    MovieImport.setImagePrefix(layer_name);
    MovieImport.doImport();
    var movie_length = MovieImport.numberOfImages();
    MessageLog.trace("[ANIMATIC] Frames extracted: " + movie_length);
    if (movie_length <= 0) { MessageLog.trace("[ANIMATIC] MovieImport returned 0 frames for: " + video_path); return null; }

    // Create DRAWING column
    if (column.type(layer_name) !== "") {
        MessageLog.trace("[ANIMATIC] Reusing existing column: " + layer_name);
    } else {
        column.add(layer_name, "DRAWING");
        MessageLog.trace("[ANIMATIC] Created column: " + layer_name);
    }
    column.setElementIdOfDrawing(layer_name, elem_id);

    // Create READ node
    var new_node = node.add("Top", "READ", layer_name, 0, 0, 0);
    if (node.getName(new_node) !== layer_name) {
        node.rename(new_node, layer_name);
        new_node = "Top/" + layer_name;
    }
    node.linkAttr(new_node, "DRAWING.ELEMENT", layer_name);
    MessageLog.trace("[ANIMATIC] READ node created: " + new_node);

    // Set exposures
    for (var f = 1; f <= movie_length; f++) {
        column.setEntry(layer_name, 1, f, f.toString());
    }
    MessageLog.trace("[ANIMATIC] Exposures set: 1 to " + movie_length);

    // Apply transform
    node.setTextAttr(new_node, 1, "SCALE.X", scale_x);
    node.setTextAttr(new_node, 1, "SCALE.Y", scale_y);
    node.setTextAttr(new_node, 1, "OFFSET.X", offset_x);
    node.setTextAttr(new_node, 1, "OFFSET.Y", offset_y);
    MessageLog.trace("[ANIMATIC] Transform applied: scale=(" + scale_x + "," + scale_y + ") offset=(" + offset_x + "," + offset_y + ")");

    // Link to Composite
    var comp = "Top/Composite";
    if (node.type(comp) !== "") {
        node.link(new_node, 0, comp, node.numberOfInputPorts(comp));
        MessageLog.trace("[ANIMATIC] Linked to " + comp);
    } else {
        MessageLog.trace("[ANIMATIC] Warning: Top/Composite not found");
    }

    // Register in asset_group for deployment steps
    var oNode = $.scene.getNodeByPath(new_node);
    asset_group.group = oNode;
    asset_group.register_node(oNode, "group");
    asset_group.register_node(oNode, "head");

    MessageLog.trace("[ANIMATIC] Done: '" + layer_name + "' imported from " + video_path);
    return asset_group;
}
import_strategy_register.add("ANIMATIC", _import_strategy_animatic);
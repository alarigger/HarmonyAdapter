
/*
             
                IMPORTATION STRATEGIES 
                Describe what is happening inside the asset group .. importing tpl , layers ect... 

*/

function ImportStrategiesRegister(){

    this._table = {}
    /**
     * 
     * @param {string} name 
     * @param {function} func 
     */
    this.add = function(name,func){
        this._table[name] = func
    }
    /**
     * 
     * @param {AssetGroup} asset_group 
     * @returns {$.oNode[]}
     */
    this.apply = function(asset_group){
        const file_type = asset_group.get_file_type()
        if (!this._table[file_type]){
            MessageLog.trace("Import Strategy not found: " + file_type)
            return asset_group
        }
        
        return this._table[file_type](asset_group)
    }
}
var import_strategy_register = new ImportStrategiesRegister()


/**
 * Import TPL
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_tpl(asset_group){

    const path = asset_group.get_path()
    var group = asset_group.group

    var nodes = group.importTemplate(path);
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

    MessageLog.trace("[TPL] data type : " +typeof firstNode);

    // If TPL root is a group
    if (node.type(firstNode.path)=="GROUP") {
        MessageLog.trace("[TPL] linking group ...");
        firstNode.linkOutNode(group.multiportOut)
        group.multiportIn.linkOutNode(firstNode)
        // todo ungroup firstNode
    } else {
        MessageLog.trace("[TPL] Imported non-grouped TPL: " + path);
        MessageLog.trace("[TPL] keeping imported node graph as-is (no forced relink).");
    }



    return asset_group
}
import_strategy_register.add("TPL",_import_strategy_tpl)





/**
 * Import PSD 
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_stragy_psd(asset_group){

    const path = asset_group.get_path()
    var group = asset_group.group

    return asset_group
    return group.importPSD(path,true,true,true,true)
}
import_strategy_register.add("PSD",_import_stragy_psd)



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
function _import_strategy_xstage(asset_group){

    const path = asset_group.get_path()
    var group = asset_group.group

    MessageLog.trace("[XSTAGE] Import du puppet depuis : " + path);

    // --- Tentative 1 : importTemplate OpenHarmony ---
    var nodes = null;
    try {
        nodes = group.importTemplate(path);
    } catch(e) {
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
    } catch(e2) {
        MessageLog.trace("[XSTAGE] importLayout a échoué : " + e2);
    }

    MessageLog.trace("[XSTAGE] ERREUR : impossible d'importer " + path);
    MessageLog.trace("[XSTAGE] → Vérifier que le .xstage est un puppet valide.");
    return null;
}
import_strategy_register.add("XSTAGE",_import_strategy_xstage) 





/**
 * Import PNG
 * @param {AssetGroup} asset_group
 * @returns {AssetGroup}
 */
function _import_strategy_png(asset_group){

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
function _import_strategy_png_sequence(asset_group){

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
function _import_strategy_png_layers(asset_group){

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
function _import_strategy_video(asset_group){

    const path = asset_group.get_path()
    var group = asset_group.group

    return group
}
import_strategy_register.add("VIDEO", _import_strategy_video)


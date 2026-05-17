
/*
             
                Deployement STRATEGIES 
                Describe what is happening Outside the asset group (adding peg , ect.. )
                Must be run once the importation is done 

*/


const backdrop_asset_type_color_table = {
    Character: new $.oColorValue("#1ca062"),
    Prop: new $.oColorValue("#d8a73e"),
    FX: new $.oColorValue("#d819af"),
    BG: new $.oColorValue("#193cd8"),
    Background: new $.oColorValue("#2619d8"),
    Animatic: new $.oColorValue("#e67e22") // orange vif pour l'animatic
}


function DeploymentStrategiesRegister() {

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
     * @param {CastingImporter} casting_importer 
     * @returns {$.oNode[]}
     */
    this.apply = function (asset_group, casting_importer) {
        const asset_type = asset_group.get_asset_type() 
        var strategy_name = asset_group.get_deployment_strategy() || asset_type
        casting_importer = casting_importer || new CastingImporter()
        if (!this._table[strategy_name] && asset_type != strategy_name) {
            // fall back to asset type
            strategy_name =  asset_type
        }        
        if (!this._table[strategy_name]) {
            MessageLog.trace(" Deployment Strategy not found: " + strategy_name)
            return asset_group
        }

        return this._table[strategy_name](asset_group, casting_importer)
    }
}
var deployment_strategy_register = new DeploymentStrategiesRegister()


/**
 * Import All asset expept Backgrounds
     * @param {AssetGroup} asset_group
     * @param {CastingImporter} casting_importer
    * @returns {AssetGroup}
 */
function _deployment_strategy_non_bg_asset(asset_group, casting_importer) {

    // add basic nodes for animators 
    asset_group.add_peg()
    asset_group.add_display()

    // set backdrop color
    var backdrop_color = backdrop_asset_type_color_table[asset_group.get_asset_type()] || $.oColorValue("#336600ff")
    asset_group.add_backdrop(backdrop_color)

    //place the asset group sligthly above 0 in Z to be in front of the background and not behind 
    asset_group.get_node("peg").attributes.position.z.setValue(0.01);

    return asset_group

}
deployment_strategy_register.add("Character", _deployment_strategy_non_bg_asset)
deployment_strategy_register.add("Prop", _deployment_strategy_non_bg_asset)
deployment_strategy_register.add("FX", _deployment_strategy_non_bg_asset)

// Ajout Animatic : même logique que non_bg_asset (peg, display, backdrop)
deployment_strategy_register.add("Animatic", _deployment_strategy_non_bg_asset)

/**
 * Import Backgrounds
     * @param {AssetGroup} asset_group
     * @param {CastingImporter} casting_importer
    * @returns {AssetGroup}
 */
function _deployment_strategy_bg_asset(asset_group, casting_importer) {

    asset_group.add_peg()
    asset_group.add_display()
    var backdrop_color = backdrop_asset_type_color_table[asset_group.get_asset_type()] || $.oColorValue("#336600ff")
    asset_group.add_backdrop(backdrop_color)

    var cadre_fiter = new CadreFitter()
    var shot_cadre = asset_group.get_shot_cadre();

    // TODO : move this to the cadre fiter responsabilty ? 

    // Apply cadre-matched camera positioning if cadre data is available.
    // CadreFitter lives here (deployment) rather than in the import strategy
    // so it works for all BG types (JPG, PNG, PSD) without duplication.
    if (cadre_fiter.validate_shot_cadre(shot_cadre)==false) {
        MessageLog.trace("[BG deploy] L'objet cadre n'est pas valid, positionnement non appliqué.");
        return asset_group
    }    
    var peg = asset_group.get_node("peg");
    if (!peg) {
        MessageLog.trace("[BG deploy] CadreFitter : pas de peg trouvé, skip.");
        return asset_group
    }
    
    MessageLog.trace("[BG deploy] CadreFitter : cadre=" + JSON.stringify(shot_cadre));
    cadre_fiter.place_peg_according_to_cadre(peg, shot_cadre);


    return asset_group

}

deployment_strategy_register.add("Background", _deployment_strategy_bg_asset)
deployment_strategy_register.add("BG", _deployment_strategy_bg_asset)
// BG preview (JPG) : même logique que BG
deployment_strategy_register.add("JPG", _deployment_strategy_bg_asset)






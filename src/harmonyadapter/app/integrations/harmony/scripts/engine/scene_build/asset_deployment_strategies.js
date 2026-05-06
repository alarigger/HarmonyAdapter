
/*
             
                Deployement STRATEGIES 
                Describe what is happening Outside the asset group (adding peg , ect.. )
                Must be run once the importation is done 

*/


const backdrop_asset_type_color_table = {
    Character:new $.oColorValue("#1ca062"),
    Prop:new $.oColorValue("#d8a73e"),
    FX:new $.oColorValue("#d819af"),
    BG:new $.oColorValue("#193cd8"),
    Background:new $.oColorValue("#2619d8")
}


function DeploymentStrategiesRegister(){

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
     * @param {CastingImporter} casting_importer 
     * @returns {$.oNode[]}
     */
    this.apply = function(asset_group,casting_importer){
        const asset_type = asset_group.get_asset_type()
        casting_importer = casting_importer || new CastingImporter()
        if (!this._table[asset_type]){
            MessageLog.trace(" Deployment Strategy not found: " + asset_type)
            return asset_group
        }
        
        return this._table[asset_type](asset_group,casting_importer)
    }
}
var deployment_strategy_register = new DeploymentStrategiesRegister()


/**
 * Import All asset expept Backgrounds
     * @param {AssetGroup} asset_group
     * @param {CastingImporter} casting_importer
    * @returns {AssetGroup}
 */
function _deployment_strategy_non_bg_asset(asset_group,casting_importer){

    asset_group.add_peg()
    asset_group.add_display()
    var backdrop_color = backdrop_asset_type_color_table[asset_group.get_asset_type()] || $.oColorValue("#336600ff")
    asset_group.add_backdrop(backdrop_color)


    return asset_group

}
deployment_strategy_register.add("Character",_deployment_strategy_non_bg_asset)
deployment_strategy_register.add("Prop",_deployment_strategy_non_bg_asset)
deployment_strategy_register.add("FX",_deployment_strategy_non_bg_asset)

/**
 * Import Backgrounds
     * @param {AssetGroup} asset_group
     * @param {CastingImporter} casting_importer
    * @returns {AssetGroup}
 */
function _deployment_strategy_bg_asset(asset_group,casting_importer){


    asset_group.add_peg()
    asset_group.add_display()
    var backdrop_color = backdrop_asset_type_color_table[asset_group.get_asset_type()] || $.oColorValue("#336600ff")
    asset_group.add_backdrop(backdrop_color)

    // retrieve the computed cadre data (normaly passed with the request json input)
    var current_shot_cadre = asset_group.get_shot_cadre()
    
    if(current_shot_cadre){
        
        // the parent peg of the group 
        var asset_peg_path = asset_group.get_node("peg").path 
        
        // module calculating the new position of the peg to place the bg in front of the camera 
        var cadre_fit = new CadreFitter()

        // place the peg 
        cadre_fit.place_peg_according_to_cadre(asset_peg_path,current_shot_cadre)
    
        
    }

    // TODO 
    //lock peg 

    return asset_group

}
deployment_strategy_register.add("Background",_deployment_strategy_bg_asset)
deployment_strategy_register.add("BG",_deployment_strategy_bg_asset)






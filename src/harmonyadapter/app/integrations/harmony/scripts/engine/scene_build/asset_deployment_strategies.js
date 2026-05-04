
/*
             
                Deployement STRATEGIES 
                Describe what is happening Outside the asset group (adding peg , ect.. )
                Must be run once the importation is done 

*/


const backdrop_asset_type_color_table = {
    Character:new $.oColorValue("#1ca062"),
    Prop:new $.oColorValue("#d8a73e"),
    FX:new $.oColorValue("#d819af")
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
    * @returns {AssetGroup}
 */
function _deployment_strategy_non_bg_asset(asset_group,casting_importer){


    asset_group.add_peg()
    asset_group.add_display()
    asset_group.add_composite()
    var backdrop_color = backdrop_asset_type_color_table[asset_group.get_asset_type()] || $.oColorValue("#336600ff")
    asset_group.add_backdrop(backdrop_color)


    return asset_group

}
deployment_strategy_register.add("Character",_deployment_strategy_non_bg_asset)
deployment_strategy_register.add("Prop",_deployment_strategy_non_bg_asset)
deployment_strategy_register.add("FX",_deployment_strategy_non_bg_asset)





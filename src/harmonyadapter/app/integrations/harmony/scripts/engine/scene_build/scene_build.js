/*

    require class 
    AssetGroup 
    AssetGroupFactory
    ImportStrategiesRegister
    DeploymentStrategiesRegister

*/


function build_scene(json_path) {
    var data = new SceneBuilDataFactory().from_json(json_path)
    // Pass parsed object to builder
    data.debug_print()
    var SB = new SceneBuilder();
    SB.build(data);
}


function resolve_library_path(path){
    MessageLog.trace("****RESOLVE PATH***")
    const var_name = "HARMONY_LIBRARY_PATH"
    const key_name = "__LIBRARY__"
    var lib_path = System.getenv(var_name)
    if(path.indexOf(key_name)==-1){
        return path
    }
    MessageLog.trace(path)
    var new_path = path.split(key_name).join(lib_path)
    MessageLog.trace(new_path)
    return new_path
}

function Context(data) {
    this.project = data.project;
    this.task_name = data.task_name;
    this.task_id = data.task_id;
    this.episode = data.episode;
    this.sequence = data.sequence;
    this.shot = data.shot;
    this.cut_duration = data.cut_duration;
}
function DefaultTemplate(data) {


}
function Template(data) {
    this.name = data.name != undefined ? data.name : null;
    this.path = data.path != undefined ? resolve_library_path(data.path) : null;;
    this.final_composite = "Top/Composite"
    this.backdrop_map = data.backdrop_map != undefined ? data.backdrop_map : {
        "Character":"ANIM",
        "Prop":"ANIM",
        "FX":"ANIM",
        "BG":"BG",
        "Background":"BG",
        "Reference":"REF"
    }
    this.composite_map = data.composite_map != undefined ? data.composite_map :{
        "Character":"Top/Composite",
        "Prop":"Top/Composite",
        "FX":"Top/Composite",
        "BG":"Top/Composite",
        "Background":"Top/Composite",
        "Reference":"Top/Composite"
    }
    this.get_composite = function(asset_type){

        if (!asset_type) {
            MessageLog.trace("[Template] get_composite: missing type");
            return this.final_composite;
        }

        var path = this.composite_map[asset_type];

        if (!path) {
            MessageLog.trace("[Template] get_composite: unknown type '" + asset_type + "' → fallback used");
            return  $.scene.getNodeByPath(this.final_composite_path);
        }

        return $.scene.getNodeByPath(path);
    };
    this.get_backdrop = function(asset_type){

        var all_brackdrops =  Backdrop.backdrops("Top")
        MessageLog.trace(all_brackdrops)
        if (!asset_type) {
            MessageLog.trace("[Template] get_backdrop: missing type");
            return "ANIM"; // safe default
        }

        var backdrop = this.backdrop_map[asset_type];

        if (!backdrop) {
            MessageLog.trace("[Template] get_backdrop: unknown type '" + asset_type + "' → fallback ANIM");
            return "ANIM";
        }


        return backdrop;
    };
}


function Asset(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.subType = data.subType;

    this.files = [];
    if (data.files) {
        for (var i = 0; i < data.files.length; i++) {
            var af = new AssetFile(data.files[i])
            af.scene_name = [this.type,this.name,i].join("_")
            af.asset_type = this.type
            this.files.push(af);
        }
    }
}



function AssetFile(data) {
    this.scene_name = null
    this.type = data.type;
    this.asset_type = null;
    this.role = data.role;
    this.actions = data.role || [] // array of string representing registered action names 
    this.path = resolve_library_path(data.path);
    this.debug_print = function(prefix) {
        prefix = prefix || "";
        MessageLog.trace(prefix + "[AssetFile]");
        MessageLog.trace(prefix + "  Type : " + this.type);
        MessageLog.trace(prefix + "  Role : " + this.role);
        MessageLog.trace(prefix + "  Path : " + this.path);
    };
    this.get_file_name = function() {
        if (!this.path) return "";

        // Normalize slashes (just in case)
        var p = this.path.replace(/\\/g, "/");

        // Get filename (after last /)
        var fileName = p.split("/").pop();

        // Remove extension
        var name = fileName.split(".")[0];

        return name;
    };
}


function AssetFileActionRegister(){
    this._table = {}
    /**
     * 
     * @param {string} name 
     * @param {function} func 
     */
    this.register = function(name,func){
        this._table[name] = func
    }
    /**
     * 
     * @param {AssetFile} asset_file 
     * @param {string} action_name 
     */
    this.apply = function(asset_file,action_name){
        if(!this._table[action_name]){
            MessageLog.trace("AssetFileAction named "+action_name+" not found")
            return 
        }
        if(typeof this._table[action_name] !== "function"){
            MessageLog.trace("AssetFileAction named "+action_name+" not found")
            return 
        }
        return this._table[action_name](asset_file)
    }
}


function Casting(data) {
    this.assets = [];

    if (data.assets) {
        for (var i = 0; i < data.assets.length; i++) {
            this.assets.push(new Asset(data.assets[i]));
        }
    }
}
function SceneBuilData(context, template, casting) {
    this.context = context;
    this.template = template;
    this.casting = casting;

    this.debug_print = function() {

        MessageLog.trace("===== Scene Build Data =====");

        // Context
        MessageLog.trace("[Context]");
        MessageLog.trace(" Project: " + this.context.project);
        MessageLog.trace(" Episode: " + this.context.episode);
        MessageLog.trace(" Sequence: " + this.context.sequence);
        MessageLog.trace(" Shot: " + this.context.shot);
        MessageLog.trace(" Task: " + this.context.task_name + " (" + this.context.task_id + ")");
        MessageLog.trace(" Duration: " + this.context.cut_duration);

        // Template
        MessageLog.trace("[Template]");
        MessageLog.trace(" Name: " + this.template.name);
        MessageLog.trace(" Path: " + this.template.path);

        // Casting
        MessageLog.trace("[Casting]");
        var assets = this.casting.assets;

        for (var i = 0; i < assets.length; i++) {
            var asset = assets[i];

            MessageLog.trace("  Asset #" + asset.id + " : " + asset.name);
            MessageLog.trace("   Type: " + asset.type + " / " + asset.subType);

            for (var j = 0; j < asset.files.length; j++) {
                var file = asset.files[j];

                MessageLog.trace("     File:");
                MessageLog.trace("       Type: " + file.type);
                MessageLog.trace("       Role: " + file.role);
                MessageLog.trace("       Path: " + file.path);
            }
        }

        MessageLog.trace("===== End Scene Build Data =====");
    };
}

function SceneBuilDataFactory(){
    
    this.from_json = function(json_path){

        var file = new $.oFile(json_path);
        
        if (!file.exists) {
            MessageBox.warning("[SceneBuild] JSON file not found: " + json_path);
            return null;
        }

        var content = file.read();

        var scene_build_description;
        try {
            scene_build_description = JSON.parse(content);
        } catch (e) {
            MessageBox.warning("[SceneBuild] Invalid JSON:\n" + e);
            return null;
        }

        // Build structured objects
        var context = new Context(scene_build_description.context);
        var template = new Template(scene_build_description.template);
        var casting = new Casting(scene_build_description.casting);

        // Create final data object
        var sceneData = new SceneBuilData(context, template, casting);

        return sceneData;
    }
}


function SceneBuilder() {
    /**
     * Building scene according to the scenebuild data 
     * @param {SceneBuilData} scene_build_data 
     */
    this.build = function(scene_build_data) {
        if(scene_build_data.template){
            MessageLog.trace("[SceneBuild] importing template ")
            this._import_template(scene_build_data.template)
        }
        if(scene_build_data.casting){
            MessageLog.trace("[SceneBuild] importing casting ")
            this._import_casting(scene_build_data.casting)
        }
    };
    /**
     * Import template nodes 
     * @param {Template} template 
     */
    this._import_template = function(template){
        // wip 
    }    
    /**
     * Import all cast members and their associated files into the node view 
     * @param {Casting} casting 
     * @param {Template} template 
     */
    this._import_casting = function(casting,template){
        return new CastingImporter().import_casting(casting,template)
    }    

}

function CastingValidation(){
    this._valid_assets = []
    this.validate_asset = function(asset){

        var isValid = true;

        if (!asset) {
            MessageLog.trace("[Asset Validation][ERROR] Null asset");
            return false;
        }

        if (!asset.name) {
            MessageLog.trace("[Asset Validation][ERROR] Asset missing name");
            isValid = false;
        }

        if (!asset.files || asset.files.length === 0) {
            MessageLog.trace("[Asset Validation][ERROR] No files in asset: " + asset.name);
            return false;
        }

        for (var i = 0; i < asset.files.length; i++) {

            var file = asset.files[i];

            if (!file.path || file.path === "") {
                MessageLog.trace("[Asset Validation][ERROR] Empty path");
                MessageLog.trace("   Asset : " + asset.name);
                MessageLog.trace("   Type  : " + file.type);
                MessageLog.trace("   Role  : " + file.role);

                isValid = false;
                continue;
            }

            var f = new File(file.path);

            if (!f.exists) {
                MessageLog.trace("[Asset Validation][ERROR] Missing file");
                MessageLog.trace("   Asset : " + asset.name);
                MessageLog.trace("   Type  : " + file.type);
                MessageLog.trace("   Role  : " + file.role);
                MessageLog.trace("   Path  : " + file.path);

                isValid = false;
            } else {
                MessageLog.trace("[Asset Validation][OK] " + asset.name + "  >  " + file.type);
            }
        }

        return isValid;
    };
}



function CastingImporter(){

    this._validation = new CastingValidation()
    this._asset_group_factory = new AssetGroupFactory()
    this._file_index = 0
    this._next_x = 0
    this._next_y = 0
    this._template = new Template({})

    var self = this
    /**
     * Import all casting asset and asset files and position their node according to the template composite and backdrops
     * @param {Casting} casting 
     * @param {Template} template 
     */
    this.import_casting = function(casting,template){
        this._template = template || new Template({})
        var type_table = {}
        for(var c = 0 ; c < casting.assets.length ; c++ ){
            var asset = casting.assets[c]
            if(!this._validation.validate_asset(casting.assets[c])){
                continue
            }
            var asset_file_groups = this._import_asset(asset)
            if(type_table[asset.type]==undefined){
                type_table[asset.type]= []
            }
            type_table[asset.type].push(asset_file_groups[0])
            // use later for backdrop grouping 
        }
    }   


    /**
     * Import all asset files 
     * @param {Asset} asset 
     * @returns {string[]}
     */
    this._import_asset = function(asset){
        var asset_groups = []
        for(var c = 0 ; c < asset.files.length ; c++ ){
            var asset_file_group = this._import_asset_file(asset,asset.files[c])
            asset_groups.push(asset_file_group)
        }
        return asset_groups
    }    


    /**
     * Import single asset file inside a new asset group and link it to the composite
     * The node are imported according to the matching asset_file type strategy 
     * @param {Asset} asset
     * @param {AssetFile} asset_file 
     * @param {$.oNode} composite 
     * @returns {AssetGroup}
     */
    this._import_asset_file = function(asset,asset_file){

        // show the asset file data 
        asset_file.debug_print()

        // create the asset group that will recieve the nodes and summeraise asset and asset_file data in  one object 
        var asset_group = this._create_asset_group(asset,asset_file);

        // place the group on the rigth back drop nears its friends 
        var placed_group = this._place_asset_group(asset_group)

        // search for the import_strategy matching the asset file type 
        const type = asset_file.type;

        // import nodes inside the group 
        var imported_nodes = import_strategy_register.apply(placed_group)

        // deploy the node 
        var deployed_group = deployment_strategy_register.apply(placed_group,this)

        // like the group output to the given composite node 
        this._link_asset_group(deployed_group)

        this._file_index+=1

        // return the complete group
        return placed_group
        
    };

    /**
     * Get or Create the asset file group for a clean node import
     * @param {Asset} asset
     * @param {AssetFile} asset_file 
     * @returns {AssetGroup}
    */
    this._create_asset_group = function(asset,asset_file){
        var group_name = asset_file.get_file_name()+"_"+this._file_index; 
        try {
            var existing = $.scene.getNodeByPath("Top/" + group_name);
            if (existing && node.type(existing.path)=="GROUP") {
                return existing;
            }
        } catch (e) {}
        var top = $.scene.getNodeByPath("Top");
        var new_group =  top.addGroup(group_name);

        var asset_group = this._asset_group_factory.create(new_group,asset,asset_file)

        return asset_group
    }
    
    /**
     * place the asset group in line and in the rigth backdrop (infos given by the template )
     * @param {AssetGroup} asset_group 
     * @returns {AssetGroup}
     */
    this._place_asset_group = function(asset_group){
        const composite = this._template.get_composite(asset_group.get_asset_type())
        const backdrop = this._template.get_backdrop(asset_group.get_asset_type())
        var group = asset_group.get_group()
        if(this._next_x==0 && composite){
            this._move_to_backdrop(group,"")
            this._next_y = composite.y -500
            group.x = composite.x 
        }
        group.x = group.x + this._next_x
        group.y= this._next_y
        this._next_x+=100
        return asset_group
    }

    this._expand_asset_group = function(asset_group){

    }




    /**
     * link the group to the proper composite and peg 
     * @param {AssetGroup} asset_group 
     * @returns {AssetGroup}
     */
    this._link_asset_group=function(asset_group){
        const composite = this._template.get_composite(asset_group.get_asset_type())
        asset_group.group.linkOutNode(composite)
        return asset_group
    }


    /**
     * add a backdrop around the group with info about the asset file 
     * @param {AssetGroup} asset_group 
     * @returns {AssetGroup}
     */
    this._add_asset_backdrop = function(asset_group){
        //wip
        return asset_group
    }

    /**
     * place the asset group at the top right corner of the back drop 
     * @param {AssetGroup} asset_group 
     * @param {*} backdrop 
     */
    this._move_to_backdrop = function(asset_group,backdrop){
        // wip 
    }  
 
    this._role_strategies = {
        "rig":function(path,group){

        },
        "ref":function(path,group){

        },
        "background":function(path,group){

        },
    }


}


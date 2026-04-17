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

    this.build = function(scene_build_data) {
        MessageLog.trace("[SceneBuild] importing template ")
        this._import_template(scene_build_data.template)
        MessageLog.trace("[SceneBuild] importing casting ")
        this._import_casting(scene_build_data.casting)
    };

    this._import_template = function(template){

    }    
    /**
     * 
     * @param {Casting} casting 
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
    this._file_index = 0
    this._next_x = 0
    this._next_y = 0
    this._template = new Template({})

    var self = this
    /**
     * 
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
            var asset_group = this._import_asset(asset)
            if(type_table[asset.type]==undefined){
                type_table[asset.type]= []
            }
            type_table[asset.type].push(asset_group)
            // use later for backdrop grouping 
        }
    }   
    /**
     * 
     * @param {Asset} asset 
     */
    this._import_asset = function(asset){
        
        for(var c = 0 ; c < asset.files.length ; c++ ){
            var composite = this._template.get_composite(asset.type)
            var asset_group = this._import_asset_file(asset.files[c],composite)

        }
    }    
    /**
     * 
     * @param {AssetFile} casting 
     */
    this._import_asset_file = function(asset_file,composite){
        asset_file.debug_print()
        return this._import_file(asset_file,composite)
    }

    this._add_asset_group = function(asset_file,composite){
        var group_name = asset_file.get_file_name();
        try {
            var existing = $.scene.getNodeByPath("Top/" + group_name);
            if (existing && node.type(existing.path)=="GROUP") {
                return existing;
            }
        } catch (e) {}
        var top = $.scene.getNodeByPath("Top");
        var asset_group =  top.addGroup(group_name);

        return this._place_asset_group(asset_group,asset_file,composite)

    }

    this._place_asset_group = function(group,asset_file,composite){
        if(this._next_x==0){
            group.y = composite.y +500
        }
        group.x = group.x + this._next_x
        group.y= this._next_y
        this._next_x+=100
        this._next_y=group.y
        this._add_asset_backdrop(group,asset_file)
        return group
    }
    this._add_asset_backdrop = function(group,asset_file){
        //wip
    }

    this._move_to_backdrop = function(group,backdrop){
        // wip 
    }   

    this._import_file = function(asset_file,composite){

        var path = asset_file.path;
        var group_name = asset_file.get_file_name()+"_"+this._file_index; 
        var group = this._add_asset_group(asset_file,composite);

        var type = asset_file.type;

        var import_strategy = this._type_strategies[type];

        if (!import_strategy) {
            MessageLog.trace("[SceneBuilder] No import strategy for type: " + type);
            return null;
        }
        
        import_strategy(path, group);

        group.linkOutNode(composite)
        this._file_index+=1

        return group
        
    };

    this._type_strategies = {

        "TPL": function(path, group){

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

            // If template root is a group
            if (node.type(firstNode.path)=="GROUP") {
                MessageLog.trace("[TPL] linking group ...");
                firstNode.linkOutNode(group.multiportOut)
                group.multiportIn.linkOutNode(firstNode)

            } else {
                MessageLog.trace("[TPL] ERROR Imported non-grouped template: " + path);
            }

            return nodes;
        },
        "PSD":function(path,group){
            return group.importPSD(path,true,true,true,true)
        },
        "PNG":function(path,group){
            return group
        },
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


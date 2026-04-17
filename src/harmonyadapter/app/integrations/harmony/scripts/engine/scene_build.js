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
function Template(data) {
    this.name = data.name;
    this.path = resolve_library_path(data.path);
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
            this.files.push(af);
        }
    }
}
function AssetFile(data) {
    this.scene_name = null
    this.type = data.type;
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
    this._import_casting = function(casting){
        return new CastingImporter().import_casting(casting)
    }    

}

function CastingImporter(){

    this._last_imported_group = null
    /**
     * 
     * @param {Casting} casting 
     */
    this.import_casting = function(casting){
        for(var c = 0 ; c < casting.assets.length ; c++ ){
            this._import_asset(casting.assets[c])
        }
    }   
    /**
     * 
     * @param {Asset} asset 
     */
    this._import_asset = function(asset){
        for(var c = 0 ; c < asset.files.length ; c++ ){
            this._import_asset_file(asset.files[c])
        }
    }    
    /**
     * 
     * @param {AssetFile} casting 
     */
    this._import_asset_file = function(asset_file){
        asset_file.debug_print()

        $.scene.importTemplate(a)

    }

    /**
     * 
     * @param {AssetFile} asset_file 
     */
    this._create_asset_file_group = function(asset_file){

    }
    this._import_file = function(asset_file){

        var path = asset_file.path;
        var group_name = asset_file.get_name(); // ← you renamed it earlier
        var group = findOrCreateGroup(group_name);

        var type = asset_file.type;

        var strategy = this._type_strategies[type];

        if (!strategy) {
            MessageLog.trace("[SceneBuilder] No import strategy for type: " + type);
            return null;
        }

        return strategy(path, group);
    };

    this._type_strategies = {
        "TPL":function(path,group){
            var _group = findOrCreateGroup(group)
            return $.scene.importTemplate(tplPath,group,null,true)
        },
        "PSD":function(path,group){
            var _group = findOrCreateGroup(group)
            return _group.importPSD(path,true,true,true,true)
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

    function findOrCreateGroup(name) {
        try {
            var existing = $.scene.getNodeByPath("Top/" + name);
            if (existing && existing.isGroup) {
                return existing;
            }
        } catch (e) {}

        var top = $.scene.getNodeByPath("Top");
        return top.addGroup(name);
    }
}


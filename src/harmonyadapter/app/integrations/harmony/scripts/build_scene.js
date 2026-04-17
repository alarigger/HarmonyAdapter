MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : BUILD_SCENE.JS ")
MessageLog.trace("----------------------------------------------------------")

const script_folder=System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")
const app_test_folder=System.getenv("APP_TEST_FOLDER")
const library_folder=System.getenv("HARMONY_LIBRARY_PATH")

// open harmony 
MessageLog.trace("-----------------------importing--Openharmony-------------------------")
const lib_folder=System.getenv("APP_LIB_FOLDER")
MessageLog.trace(lib_folder+"/js/OpenHarmony-0.11.0/openHarmony.js")
include(lib_folder+"/js/OpenHarmony-0.11.0/openHarmony.js")
MessageLog.trace("----------------------------------------------------------")

include(script_folder+"/engine/parse_args.js")
include(script_folder+"/engine/scene_build.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))
const json_input_path = args.json_input_path
build_scene(json_input_path)

scene.saveAll()
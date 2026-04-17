MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("           SCRIPT : APPLY_BG_CADRE.JS ")
MessageLog.trace("----------------------------------------------------------")

const script_folder=System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")
const app_test_folder=System.getenv("APP_TEST_FOLDER")

// open harmony 
MessageLog.trace("-----------------------importing--Openharmony-------------------------")
const lib_folder=System.getenv("APP_LIB_FOLDER")
MessageLog.trace(lib_folder+"/js/OpenHarmony-0.11.0/openHarmony.js")
include(lib_folder+"/js/OpenHarmony-0.11.0/openHarmony.js")
MessageLog.trace("----------------------------------------------------------")

include(script_folder+"/engine/parse_args.js")
include(script_folder+"/engine/camera.js")
include(script_folder+"/engine/bg_cadre.js")

const args = parse_args()
MessageLog.trace(JSON.stringify(args))
apply_bg_cadre(args)

scene.saveAll()

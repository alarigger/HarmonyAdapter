MessageLog.trace("----------------------------------------------------------")
MessageLog.trace("hello from test.js !! ")
MessageLog.trace("----------------------------------------------------------")

const script_folder=System.getenv("HARMONY_WRAPPER_SCRIPT_FOLDER")
include(script_folder+"/parse_args.js")


const args = parse_args()
MessageLog.trace(args)
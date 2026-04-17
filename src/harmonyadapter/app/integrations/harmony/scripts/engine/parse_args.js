
MessageLog.trace(args)

function parse_args(){
    const raw_string = System.getenv("HARMONY_WRAPPER_ARGS")
    const args = desrialise(raw_string)
    return args
}


function desrialise(raw_string){
    var clean_string = raw_string
    return JSON.parse(clean_string)
}
// import create_ja_handler from 'lib';


let handle_new_input = create_ja_handler($("#container"));

function soumettre(event) {
    let javalue = $("#ja-orig").val();
    console.log("plop");
    console.log(javalue);
    event.preventDefault();
    // $("#container").text( javalue);
    handle_new_input(javalue);
}

function main() {

    let par = (new URLSearchParams(document.location.search));

    if(par.has("ja")){
        document.getElementById("ja-orig").value = (par.get("ja"));
        handle_new_input(par.get("ja"));
    }

    

};


(() => {

    $(document).ready(main);

})();
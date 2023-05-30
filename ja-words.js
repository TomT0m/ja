
 
 
// import { create_ja_handler } from "./main.js" ;



document.body.style.border = '5px solid red';


const contextMenus = browser.contextMenus;

contextMenus.create({
    id: "ja-words",
    title: "Japanese words reveal",
    contexts: ["selection"],
});


function soumettre(selectionText) {
    let javalue = selectionText;
    console.log(javalue);
    console.log("plop1");
    console.log(document);

    
    let view = $("<div>",{
        id: "ja-words",
        class: "ja-words"
    });

    
    console.log("plop2");
    let close_link=$("<a href='#'>[X]</a>");
    view.append(close_link);
    close_link.on("click",(event)=>view.hide());
    // $("#container").text( javalue);
    document.body.appendChild(view);
    console.log("plop");
    create_ja_handler(view)(selectionText);
}


browser.contextMenus.onClicked.addListener((info, tab) => {
    console.log("menu clicked", info);
    console.log(tab);
    //alert("plop");
    switch (info.menuItemId) {
        case "ja-words":
          console.log(info.selectionText);
          //soumettre(info.selectionText);
          browser.windows.create({url: "index.html?ja=" + encodeURIComponent(info.selectionText)  });
          break;
    }


});

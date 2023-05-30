//export { create_ja_handler };

let lang = navigator.language;

function makeSPARQLQuery(endpointUrl, sparqlQuery) {
    var settings = {
        headers: {
            Accept: 'application/sparql-results+json'
        },
        data: { 
            query: sparqlQuery.replace("[AUTO_LANGUAGE]", lang),
            limit: 'none',
            infer: 'true'
        },
        type:"POST"
    };
    return $.ajax(endpointUrl, settings);
}
let endpointUrl = 'https://query.wikidata.org/sparql';

function query_label_service(){
    let languages = navigator.languages.join(",")
    return `SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],${languages},en". }\n`;
}

let query_part_infos = `
optional {
    ?lex ontolex:sense ?sense .
    optional { 
        ?sense wdt:P5137 ?item . 
    }
    optional { 
        ?sense wdt:P9970 ?verb_action . 
    }
    optional { ?sense skos:definition ?defFr filter (lang(?defFr)="fr") }
    optional { ?sense skos:definition ?defEn filter (lang(?defEn)="en") }
    bind(coalesce(?defFr,?defEn) as ?def) 
    filter (bound(?def)||bound(?item))
}

`

let query_lex_kanji_t = 
`select distinct ?def ?lex ?item ?itemLabel ?lemma ?lemma_hira ?min ?max ("lex" as ?type) ?verb_action{
    ?lex dct:language wd:Q5287 ;
            wikibase:lemma ?lemma .
    optional {
        ?lex wikibase:lemma ?lemma_hira filter(lang(?lemma_hira)="ja-hira")
    }

    ${query_part_infos}

    ${query_label_service()}

    values ?lemma {
            $values
    }
}
`;
let query_item_t = `
select distinct ?item ?itemLabel ?lemma ?lemma_hira ?min ?max ("item" as ?type){

?item rdfs:label ?lemma .

values ?lemma {
    $values
}
}
`; 
let value = (val) => { 
    if(val){ 
        switch(val.datatype){
            case "http://www.w3.org/2001/XMLSchema#integer" : return parseInt(val.value);
            default: return val.value ;
        }
    } else { 
        return ""
    }
};

function compute_lemma_indexes(japanese){
    let indexes_t={}
    let len = japanese.length;
    function insert_in_table(str, indexes){
        if (! (str in indexes_t)){
            indexes_t[str] = [indexes]
        }
        else{
            indexes_t[str].push(indexes)
        }
    };
    
    
    for (let i = 0; i <= len; i++) {
        for (let j = i + 1; j <= len && j<=i+13; j++) {
            insert_in_table(japanese.substring(i, j), [i, j]);
        }
    }
    return indexes_t
}


function create_ja_handler(container){
    return async (input) => {
        handle_new_input_on_handler(input, container);
    }
}



async function handle_new_input_on_handler(input, container) {

    // let tuples = [];

    container.text(input);

    /*for (let i = 0; i <= len; i++) {
        for (let j = i + 1; j <= len && j<i+13; j++) {
            tuples.push(`('${input.substring(i, j)}'@ja ${i} ${j} )`);
        }
    }*/
    let candidates_with_index = compute_lemma_indexes(input);
    let strings = Object.keys(candidates_with_index).map(candidate => `'${candidate}'@ja` )

    let query = query_lex_kanji_t.replace("$values", strings.join("\n\t"));

    let encoded_sparql = encodeURIComponent(query);
    let link = $("<a>", {
        href: `https://query.wikidata.org/#${encoded_sparql}`,
        text: "Wikidata query …"
    });
    container.append(link);
    
    function render_result(res, row, column, column_end){
        let lex_url = value(res.lex);
        // let column = value(res.min);
        // let column_end = value(res.max);
        let item = value(res.item);
        let itemLabel = value(res.itemLabel);
        
        let rendered = $("<div/>").append($(`<a href="${lex_url}">${value(res.lemma)}</a>`));
        let hira = value(res.lemma_hira);
        let def = value(res.def);

        if (hira){
            rendered.append( [$("<br/>"), `【${hira}】`]);
        }
        
        if (item!=""){
            let itemLink = $("<a>",{href:item, text:itemLabel});
            rendered.append([$("<br/>"),itemLink]);
        }
        if (def !=""){
            rendered.append(["<br/>", def]);
        }
        let attrs = {
            class:"result",
            style:`grid-column-start:${column+1};grid-column-end:${column_end+1};`
        }
        
        attrs.style+=(`grid-row-start:${row};`);
        
        return $(`<div>`,attrs).append(rendered);
    }

    makeSPARQLQuery(endpointUrl, query).then(
        result => {

            let bd = result.results.bindings;
            let results_with_indexes = []
            for (i in bd){
                let v = bd[i];
                let word = value(v.lemma)
                let idxs = candidates_with_index[word]
                for(idx_idx in candidates_with_index[word]){
                    results_with_indexes.push({start : idxs[idx_idx][0], end : idxs[idx_idx][1], bd: v })
                }
            }
            results_with_indexes.sort(
                (row1, row2) => (row1.start > row2.start) || (row1.start == row2.start && row1.end <= row2.end) 
            )

            let grid=$("<div/>",{class:"lex_grid"});
            // entête de grille
            input.split("").forEach( (letter,idx) => {
                grid.append( $("<div/>",{
                    class:"letter",
                    text:letter,
                    style:`grid-column : ${idx + 1}; grid-row : 1;`
                }))
            });
            let current = []
            
            for (i in results_with_indexes) {
                let v = results_with_indexes[i];
                current.push(v);
                let cur_min = v.start;
                current = current.filter(
                    (stack_val) =>  (stack_val.end > cur_min)
                );
                grid.append(render_result(v.bd, current.length + 1, v.start, v.end));
            };
            console.log("plop");
            console.log(grid);
            $("#container").append(grid);
        }

    ).catch(err => {
        document.querySelector("#error").text(err.message);
    });
}


(() => {

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


    let query_lex_t = 
`select distinct ?def ?lex ?item ?itemLabel ?lemma ?lemma_hira ?min ?max ("lex" as ?type){
#        {
            ?lex dct:language wd:Q5287 ;
                    wikibase:lemma ?lemma  filter(lang(?lemma)="ja") .
#            optional {
#                ?item rdfs:label ?lemma .
#            }
#        } union {
#            ?item rdfs:label ?lemma .
#            otional {
#                ?lex dct:language wd:Q5287 ;
#                wikibase:lemma ?lemma  filter(lang(?lemma)="ja") .
#            }
#        }
        optional {
            ?lex wikibase:lemma ?lemma_hira filter(lang(?lemma_hira)="ja-hira")
        }
        optional {
            ?lex ontolex:sense ?sense .
            optional { 
                ?sense wdt:P5137 ?item . 
            }
            optional { ?sense skos:definition ?defFr filter (lang(?defFr)="fr") }
            optional { ?sense skos:definition ?defEn filter (lang(?defEn)="en") }
            bind(coalesce(?defFr,?defEn) as ?def) 
            filter (bound(?def)||bound(?item))
        }
        # filter ( bound(?item) || bound(?definition) ) .
        ${query_label_service()}
        values (?lemma ?min ?max) {
              $values
        }
    } order by ?min desc(?max) # limit 1000
    `;
    let query_item_t = `
    select distinct ?item ?itemLabel ?lemma ?lemma_hira ?min ?max ("item" as ?type){

        values {

        }
    }
    values (?lemma ?min ?max) {
        $values
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

    function handle_new_input(input) {
        let len = input.length;
        let tuples = [];

        $("#container").text(input);

        for (let i = 0; i <= len; i++) {
            for (let j = i + 1; j <= len && j<i+13; j++) {
                tuples.push(`('${input.substring(i, j)}'@ja ${i} ${j} )`);
            }
        }
        
        let query = query_lex_t.replace("$values", tuples.join("\n\t"));
        let encoded_sparql = encodeURIComponent(query);
        let link = $("<a>", {
            href: `https://query.wikidata.org/#${encoded_sparql}`,
            text: "Wikidata query …"
        });
        $("#container").append(link);

        function render_result(res, row){
            let lex_url = value(res.lex);
            let column = value(res.min);
            let column_end = value(res.max);
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
                
                for (i in bd) {
                    let v = bd[i];
                    current.push(v);
                    let cur_min = value(v.min);
                    current = current.filter(
                        (stack_val) =>  (value(stack_val.max) > cur_min)
                    );
                    grid.append(render_result(v, current.length + 1));
                };
                $("#container").append(grid);
            }

        ).catch(err => {
            $("#error").text(err.message);
        });
    }

    function soumettre(event) {
        let javalue = $("#ja-orig").val();
        event.preventDefault();
        // $("#container").text( javalue);
        handle_new_input(javalue);

    }

    function main() {

        $("#entree").submit(soumettre);

    };


    $(document).ready(main);

})();
class NewProduct{
    public lining_composition = []
    constructor(
        public id : string,
        public brand_name : string,
        public gender_label : string,
        public family : string,
        public category : string,
        public reference_code : string,
        public size_details_tu : string,
        public label : {fr : string, en : string, de : string, es : string, it : string},
        public description : {fr : string, en : string, de : string, es : string, it : string},
        public season_name : string,
        public country_of_manufacture : string,
        public material_composition : {id : string, reference : string, value : number}[],
        public variants : {type : string, discounted_price_eur_ex_vat : number, custom_suffix : string, color : string, size : string, price_eur_ex_vat : number, weight : number, stock_qty : number, discounted_price_eur_ex_vat_type : null, id : string}[],
    ){}
}

export default NewProduct
class ProductInformation{
    constructor(
        public material_composition : {id: string, percentage : number}[],
        public collection : {reference : string},
        public country_of_manufacture : string,
        public size_details_tu : string,
        public label : {fr : string, en : string, es : string, it : string, de : string},
        public description : {fr : string, en : string, es : string, it : string, de : string}
    ){}
}

export default ProductInformation
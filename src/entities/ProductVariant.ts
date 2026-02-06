class ProductVariant {

    constructor(
        public size_details_tu : string,
        public type : "PACK" | "ITEM",
        public colors : {reference : string}[],
        public stock_qty : number,
        public price_sale : {unit : {value : number}},
        public item : {size : string},
        public packs : {sizes : {size : string, qty : number}[]}[],
        public weight : number,
        public is_active : boolean
    ){}
}

export default ProductVariant
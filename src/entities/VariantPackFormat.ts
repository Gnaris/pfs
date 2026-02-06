class VariantPackFormat {

    public type="PACK"
    public discounted_price_eur_ex_vat= 0
    public custom_suffix= ""

    constructor(
        public color: string,
        public size: string,
        public price_eur_ex_vat: number,
        public weight: number,
        public stock_qty: number,
        public packs : {color: string,size: string,qty: number}[]
    ) { }
}

export default VariantPackFormat
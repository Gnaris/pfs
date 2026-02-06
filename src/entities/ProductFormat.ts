import VariantItemFormat from "./VariantItemFormat.js"
import VariantPackFormat from "./VariantPackFormat.js"


class ProductFormat {

    public lining_composition = []
    constructor(
        public brand_name: string,
        public gender_label: string,
        public family: string,
        public category: string,
        public reference_code: string,
        public size_details_tu : string,
        public label: {
            fr: string,
            en: string,
            es: string,
            de: string,
            it: string
        },
        public description: {
            fr: string,
            en: string,
            es: string,
            de: string,
            it: string
        },
        public season_name: string,
        public country_of_manufacture: string,
        public material_composition: { id: string, value: number }[],
        public variants: (VariantItemFormat | VariantPackFormat | undefined)[]
    ) { }
}



export default ProductFormat
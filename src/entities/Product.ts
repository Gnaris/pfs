class Product {
    constructor(
        public id: string,
        public reference: string,
        public brand: { id: string, name: string },
        public gender: string,
        public family: string,
        public category: { id: string, labels: { fr: string, en: string, de: string, es: string, it: string } },
        public labels: { fr: string, en: string, de: string, es: string, it: string },
        public sizes: string,
        public size_details_tu: string,
        public unit_price: number,
        public creation_date: string,
        public status: string,
        public is_star: number,
        public count_variants: number,
        public images: { DEFAULT: string } & { [key: string]: string[] },
        public flash_sales_discount?: null
    ){}
}

export default Product
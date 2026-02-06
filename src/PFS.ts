import fs from "fs"
import Token from "./entities/Token.js";
import Product from "./entities/Product.js";
import ProductVariant from "./entities/ProductVariant.js";
import ProductInformation from "./entities/ProductInformation.js";
import VariantItemFormat from "./entities/VariantItemFormat.js";
import VariantPackFormat from "./entities/VariantPackFormat.js";
import ProductFormat from "./entities/ProductFormat.js";
import sharp from "sharp";
import FormData from "form-data";
import nodeFetch from "node-fetch"
import NewProduct from "./entities/NewProduct.js";

class ParisFashionShop {

    public token: Token | null = null;

    public async connect(email: string, password: string) {
        const dateNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
        dateNow.setMinutes(dateNow.getMinutes() + 10)

        const tokenFile = fs.readFileSync("token.json", "utf-8")
        let token = tokenFile ? JSON.parse(tokenFile) as Token : null

        if (!token || !token.access_token || new Date(token.expires_at) < dateNow || token.email != email || token.password != password) {
            const TokenResponse = await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/oauth/token", {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });
            const newToken = await TokenResponse.json() as Token | { message: string }
            if (!TokenResponse.ok || "message" in newToken) {
                fs.writeFileSync("token.json", JSON.stringify(newToken))
                throw new Error("email ou mot de passe incorrect")
            }
            token = newToken
            token.email = email
            token.password = password
            fs.writeFileSync("token.json", JSON.stringify(token))
        }
        this.token = token
        return this
    }

    public async refreshPage({ page, nbProduct, reference = undefined }: { page: number, nbProduct: number, reference?: string }) {
        const products = await this.getAllProduct({ page, nbProduct, reference })
        const productDeleted: string[] = []
        const productReadyToSale: string[] = []
        const variantsOutOfStock: string[] = []
        const variantDisabled: string[] = []
        const defaultColorProduct: Map<string, string> = new Map()
        let i = 1;
        let nbError = 0
        for (const product of products) {
            try {
                console.log(`===================================================( ${i} / ${products.length} )====================================================`)
                console.log(`⏳ Récupération des données de la référence : ${product.reference}...`)
                const { variants, productInformation } = await this.getProductInformation(product.id)
                const productFormat = this.getProductFormat(product, variants, productInformation)
                const newProduct = await this.createProduct(productFormat)
                for (const newVariant of newProduct.variants) {
                    for (const oldVariant of variants) {
                        if (newVariant.color == oldVariant.colors[0].reference && newVariant.type == oldVariant.type) {
                            if (oldVariant.stock_qty <= 0) {
                                variantsOutOfStock.push(newVariant.id)
                            }
                            if (!oldVariant.is_active) {
                                variantDisabled.push(newVariant.id)
                            }
                        }
                    }
                }
                console.log(`✅ Création de la référence : ${productFormat.reference_code} terminée.`)
                const { DEFAULT, ...colors } = product.images
                await this.uploadImg(newProduct.id, variants, colors)
                console.log(`🖼️  Importation des photos pour la référence : ${productFormat.reference_code} terminée.`)
                for (const [color, links] of Object.entries(colors)) {
                    if (links.some(link => link == product.images.DEFAULT)) {
                        defaultColorProduct.set(newProduct.id, color)
                    }
                }
                productDeleted.push(product.id)
                productReadyToSale.push(newProduct.id)
            } catch (e) {
                console.log(e)
                nbError++
            }
            i++
        }
        console.log("======================================================================================")
        console.log("⏳ Modification de la couleur par défaut...")
        await this.setDefaultColorProduct(defaultColorProduct)
        if (productReadyToSale.length > 0) {
            console.log("⏳ Mise en ligne des nouvelles versions des produits...")
            await this.setProductsToSale(productReadyToSale)
            console.log("🗑️  Suppression des anciennes versions des produits...")
            await this.setProductsToDelete(productDeleted)
        }
        if (variantsOutOfStock.length > 0) {
            console.log("⏳ Modification des stocks en cours...")
            await this.setOutOfStockVariant(variantsOutOfStock)
        }
        if (variantDisabled.length > 0) {
            console.log("⏳ Désactivation des variants en cours...")
            await this.disableVariantAvailability(variantDisabled)
        }
        console.log("Terminé 👍\nNombre d'erreur : " + nbError)
    }

    public async getAllProduct({ page, nbProduct, reference }: { page: number, nbProduct: number, reference?: string }) {
        const response = await fetch(`https://wholesaler-api.parisfashionshops.com/api/v1/catalog/listProducts?page=${page}&per_page=${nbProduct}${reference ? "&reference=" + reference : ""}&status=ACTIVE`, {
            headers: { Authorization: "Bearer " + this.token?.access_token }
        })
        const products = await response.json()
        return products.data as Product[]
    }

    public async getProductInformation(id: string) {
        let response = await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/" + id + "/variants", {
            headers: { Authorization: "Bearer " + this.token?.access_token }
        })
        const variants = await response.json()
        response = await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/" + id, {
            headers: { Authorization: "Bearer " + this.token?.access_token }
        })
        const productInformation = await response.json()
        return { variants: variants.data as ProductVariant[], productInformation: productInformation.data as ProductInformation }
    }

    public getProductFormat(product: Product, variants: ProductVariant[], productInformation: ProductInformation) {
        // VERSION COPIER COLLER
        // const variantFormat = variants.map((v) => {
        //     if (v.type === "ITEM") {
        //         return new VariantItemFormat(v.colors[0].reference, v.item.size, v.price_sale.unit.value, v.weight, v.stock_qty)
        //     }
        // if (v.type === "PACK") {
        //     return new VariantPackFormat(v.colors[0].reference, v.packs[0].sizes[0].size, v.price_sale.unit.value, v.weight, v.stock_qty, [{ color: v.colors[0].reference, size: v.packs[0].sizes[0].size, qty: v.packs[0].sizes[0].qty }])
        // }
        // })

        // VERSION AJOUT PACK DE 12
        const { DEFAULT, ...imgs } = product.images
        const variantFormat: (VariantItemFormat | VariantPackFormat)[] = []
        for (const [color, links] of Object.entries(imgs)) {
            const stock_qty = variants.find(v => v.colors[0].reference == color)?.stock_qty
            if (stock_qty != undefined) {
                const havePack = variants.some(v => v.type === "PACK")
                const item_price = havePack ? Math.ceil(product.unit_price * 1.05 * 10) / 10 : product.unit_price
                const pack_price = havePack ? product.unit_price : Math.floor(product.unit_price / 1.05 * 10) / 10
                variantFormat.push(new VariantItemFormat(color, "TU", item_price, variants[0].weight, stock_qty))
                variantFormat.push(new VariantPackFormat(color, "TU", pack_price, variants[0].weight, (stock_qty >= 12 ? stock_qty : 0), [{ color, size: "TU", qty: 12 }]))
            }
        }

        const reference = product.reference.includes("VS") ? product.reference.split("VS")[0] + "VS" + (parseInt(product.reference.split("VS")[1]) + 1) : product.reference + "VS1"
        // Famille : Bijoux : a035J00000185J7QAI Vêtement : a0358000001JibCAAS
        //const productFormat = new ProductFormat(product.brand.name, product.gender, product.family, product.category.id, reference, product.category.labels, product.labels, productInformation.collection.reference, productInformation.country_of_manufacture, productInformation.material_composition.map(m => ({ id: m.id, value: m.percentage })), variantFormat)
        const productFormat = new ProductFormat(product.brand.name, product.gender, "a035J00000185J7QAI", product.category.id, reference, productInformation.size_details_tu, productInformation.label, productInformation.description, "PE2026", productInformation.country_of_manufacture, productInformation.material_composition.map(m => ({ id: m.id, value: m.percentage })), variantFormat)
        return productFormat
    }

    public async createProduct(productFormat: ProductFormat) {
        const response = await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products", {
            method: "POST",
            body: JSON.stringify({ data: [productFormat] }),
            headers: {
                Authorization: "Bearer " + this.token?.access_token,
                "Content-Type": "application/json",
            }
        })

        if (response.ok) {
            const newProduct = await response.json()
            if ("errors" in newProduct.data[0]) {
                throw new Error("❌ La nouvelle référence : " + productFormat.reference_code + " n'a pas pu se créer\n❌ Message d'erreur : " + JSON.stringify(newProduct.data[0].errors))
            }
            return newProduct.data[0] as NewProduct
        } else {
            console.log(await response.text())
            throw new Error("❌ Une erreur est survenue lors de la création de la référence : " + productFormat.reference_code)
        }
    }

    public async uploadImg(id: string, variants: ProductVariant[], imgs: { [key: string]: string[] }) {
        for (const [color, links] of Object.entries(imgs)) {
            if (variants.some(v => v.colors[0].reference == color)) {
                let slot = 1;
                for (const link of links) {
                    const downloadImgResponse = await fetch(link)
                    if (!downloadImgResponse.ok) {
                        console.log(await downloadImgResponse.text())
                        throw new Error("❌ Une erreur est survenue lors du téléchargement de l'image\n❗ Pense à renommer cette nouvelle référence en n'importe quoi et le supprimer")
                    }
                    const imgBuffer = Buffer.from(await downloadImgResponse.arrayBuffer())
                    const file = await sharp(imgBuffer).jpeg({ quality: 92 }).toBuffer()
                    const formData = new FormData()
                    formData.append("image", file, { filename: "img.jpg" })
                    formData.append("color", color)
                    formData.append("slot", slot)
                    const uploadImgResponse = await nodeFetch(`https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/${id}/image`, {
                        method: "POST",
                        body: formData,
                        headers: {
                            ...formData.getHeaders(),
                            Authorization: "Bearer " + this.token?.access_token
                        }
                    });
                    if (!uploadImgResponse.ok) {
                        console.log(await uploadImgResponse.text())
                        throw new Error("❌ Une erreur est survenue lors de l'upload de l'image\n❗ Pense à renommer cette nouvelle référence en n'importe quoi et le supprimer")
                    }
                    slot++
                }
            }

        }
    }

    public async setProductsToSale(ids: string[]) {
        await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/batch/updateStatus", {
            method: "PATCH",
            body: JSON.stringify({ data: ids.map(id => ({ id, status: "READY_FOR_SALE" })) }),
            headers: {
                Authorization: "Bearer " + this.token?.access_token,
                "Content-Type": "application/json"
            }
        })
    }

    public async setProductsToDelete(ids: string[]) {
        await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/batch/updateStatus", {
            method: "PATCH",
            body: JSON.stringify({ data: ids.map(id => ({ id, status: "DELETED" })) }),
            headers: {
                Authorization: "Bearer " + this.token?.access_token,
                "Content-Type": "application/json"
            }
        })
    }

    public async setOutOfStockVariant(variantIds: string[]) {
        await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/variants", {
            method: "PATCH",
            body: JSON.stringify({ data: variantIds.map(id => ({ variant_id: id, stock_qty: 0 })) }),
            headers: {
                Authorization: "Bearer " + this.token?.access_token,
                "Content-Type": "application/json"
            }
        })
    }

    public async disableVariantAvailability(variantIds: string[]) {
        await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/variants/batch/setAvailability", {
            method: "PATCH",
            body: JSON.stringify({ data: variantIds.map(id => ({ id, enable: false })) }),
            headers: {
                Authorization: "Bearer " + this.token?.access_token,
                "Content-Type": "application/json"
            }
        })
    }

    public async setDefaultColorProduct(productIdsColor: Map<string, string>) {
        for (const [id, default_color] of productIdsColor.entries()) {
            await fetch("https://wholesaler-api.parisfashionshops.com/api/v1/catalog/products/" + id, {
                method: "PATCH",
                body: JSON.stringify({data : {default_color}}),
                headers: {
                    Authorization: "Bearer " + this.token?.access_token,
                    "Content-Type": "application/json"
                }
            })
        }
    }
}

export default ParisFashionShop
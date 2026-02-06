import ParisFashionShop from "./PFS.js"

const pfs = await new ParisFashionShop().connect("MAIL", "MDP")
await pfs.refreshPage({page : 1, nbProduct : 1, reference : ""})
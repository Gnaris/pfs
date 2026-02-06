class Token{

    public access_token : string
    public token_type : string
    public expires_at : string
    public wholesaler_id : string
    public email : string
    public password : string

    constructor(access_token : string, token_type : string, expires_at : string, wholesaler_id : string, email : string, password : string)
    {
        this.access_token = access_token
        this.token_type = token_type
        this.expires_at = expires_at
        this.wholesaler_id = wholesaler_id
        this.email = email
        this.password = password
    }
}

export default Token
class Uri {
    readonly uriStr: string;

    readonly scheme: string | null;
    readonly authority: string | null;
    readonly path: string;
    readonly query: string | null;
    readonly fragment: string | null;

    readonly user: string | null;
    readonly password: string | null;
    readonly host: string | null;
    readonly port: string | null;

    readonly pathSegments: ReadonlyArray<string>;

    readonly queryParameters: ReadonlyMap<string, ReadonlyArray<string|null>>;

    constructor(uri: string) {
        this.uriStr = uri;
        const parseResult = new Uri.ParseResult(this.uriStr);
        this.scheme = parseResult.scheme;
        this.authority = parseResult.authority;
        this.path = parseResult.path;
        this.query = parseResult.query;
        this.fragment = parseResult.fragment;

        this.user = parseResult.user;
        this.password = parseResult.password;
        this.host = parseResult.host;
        this.port = parseResult.port;

        this.pathSegments = parseResult.pathSegments;
        this.queryParameters = parseResult.queryParameters;
    }

    public toString = () => this.uriStr;

    private static ParseResult = class {
        private static URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
        uri: string;

        scheme: string | null = null;
        authority: string | null = null;
        path: string = "";
        query: string | null = null;
        fragment: string | null = null;

        user: string | null = null;
        password: string | null = null;
        host: string | null = null;
        port: string | null = null;

        pathSegments: Array<string> = [];

        queryParameters: Map<string, Array<string|null>> = new Map();

        constructor(uri: string) {
            this.uri = uri;
            this.parseUri();
            this.parseAuthority();
            this.parsePath();
            this.parseQuery();
        }

        private parseUri() {
            const matches = this.uri.match(Uri.ParseResult.URL_REGEX);
            if(!matches) {
                throw Error("Invalid URI"); 
            }
            this.scheme = matches[2] ?? null;
            this.authority = matches[4] ?? null;
            this.path = matches[5] ?? null;
            this.query = matches[7] ?? null;
            this.fragment = matches[9] ?? null;
        }

        private parseAuthority() {
            if(!this.authority) {
                return;
            }

            enum State { HOST, PORT }
            const falsy2Null = (str: string) => str ? str : null;
            for(let start = 0, cur = 0, state = State.HOST, usepassSet = false;; cur++) {
                if(cur == this.authority.length) {
                    let str = this.authority.substring(start, cur);
                    if(state == State.HOST) {
                        this.host = falsy2Null(str);
                    } else {
                        this.port = falsy2Null(str);
                    }
                    break;
                }
                switch(this.authority.charAt(cur)) {
                    case ':':
                        if(state == State.HOST) {
                            this.host = falsy2Null(this.authority.substring(start, cur));
                            state = State.PORT;
                            start = cur + 1;
                        }
                        // else it's a part of the potentially invalid port
                        break;
                    case '@':
                        if(!usepassSet) {
                            // turns out we've actually been parsing user and/or password
                            usepassSet = true;
                            if(state == State.PORT) {
                                // we've seen a colon which caused us to think we were on port but were actually on password
                                this.user = this.host;
                                this.host = null;
                                this.password = falsy2Null(this.authority.substring(start, cur));
                            } else {
                                // we're still on host, but is actually the user
                                this.user = falsy2Null(this.authority.substring(start, cur));
                            }
                            state = State.HOST;
                            start = cur + 1;
                        }
                        // else it's part of the possibly invalid host name or port
                        break;
                    // else no special behavior
                }
            }
        }

        private parsePath() {
            if(!this.path) {
                return;
            }
            this.pathSegments = this.path.substring(1).split('/');
        }

        private parseQuery() {
            if(!this.query) {
                return;
            }

            const addQueryParam = (key: string | null, start: number, end: number) => {
                let value;
                if(key == null) {
                    key = this.query!!.substring(start, end);
                    value = null;
                } else {
                    value = this.query!!.substring(start, end);
                }
                if(!this.queryParameters.has(key)) {
                    this.queryParameters.set(key, new Array());
                }
                this.queryParameters.get(key)!!.push(value);
            }
            for(let start = 0, cur = 0, k = null;; cur++) {
                if(cur == this.query.length) {
                    addQueryParam(k, start, cur);
                    break;
                }
                switch(this.query.charAt(cur)) {
                    case "=":
                        if(!k) {
                            k = this.query.substring(start, cur);
                            start = cur + 1;
                        }
                        break;
                    case "&":
                        addQueryParam(k, start, cur);
                        start = cur + 1;
                        k = null;
                        break;
                    //anything besides = and & don't have any special meaning
                }
            }
        }
    }
}

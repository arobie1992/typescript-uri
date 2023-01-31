type Writeable = { -readonly [P in keyof Uri]: Uri[P] };

class Uri {
    private static URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

    readonly uri: string;

    readonly scheme: string | null = null;
    readonly authority: string | null = null;
    readonly path: string = "";
    readonly query: string | null = null;
    readonly fragment: string | null = null;

    readonly user: string | null = null;
    readonly password: string | null = null;
    readonly host: string | null = null;
    readonly port: string | null = null;

    readonly pathSegments: ReadonlyArray<string> = [];

    readonly queryParameters: ReadonlyMap<string, ReadonlyArray<string|null>> = new Map();

    constructor(uri: string) {
        this.uri = uri;
        this.parseUri();
        this.parseAuthority();
        this.parsePath();
        this.parseQuery();
    }

    private parseUri() {
        const matches = this.uri.match(Uri.URL_REGEX);
        if(!matches) {
            throw Error("Invalid URI"); 
        }
        (this as Writeable).scheme = matches[2] ?? null;
        (this as Writeable).authority = matches[4] ?? null;
        (this as Writeable).path = matches[5] ?? null;
        (this as Writeable).query = matches[7] ?? null;
        (this as Writeable).fragment = matches[9] ?? null;
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
                    (this as Writeable).host = falsy2Null(str);
                } else {
                    (this as Writeable).port = falsy2Null(str);
                }
                break;
            }
            switch(this.authority.charAt(cur)) {
                case ':':
                    if(state == State.HOST) {
                        (this as Writeable).host = falsy2Null(this.authority.substring(start, cur));
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
                            (this as Writeable).user = this.host;
                            (this as Writeable).host = null;
                            (this as Writeable).password = falsy2Null(this.authority.substring(start, cur));
                        } else {
                            // we're still on host, but is actually the user
                            (this as Writeable).user = falsy2Null(this.authority.substring(start, cur));
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
        (this as Writeable).pathSegments = this.path.substring(1).split('/');
    }

    private parseQuery() {
        if(!this.query) {
            return;
        }

        const addQueryParam = (key: string | null, start: number, end: number) => {
            let mutQps = this.queryParameters as Map<string, Array<string|null>>;
            let value;
            if(key == null) {
                key = this.query!!.substring(start, end);
                value = null;
            } else {
                value = this.query!!.substring(start, end);
            }
            if(!mutQps.has(key)) {
                mutQps.set(key, new Array());
            }
            mutQps.get(key)!!.push(value);
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

    public toString = () => this.uri;
    
}

type Writeable = { -readonly [P in keyof Uri]: Uri[P] };

class Uri {   
    private static URL_REGEX = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    private static AUTH_REGEX = /^(?:([^@]*)@)?(.*)$/;
    private static AUTH_SEG_REGEX = /^([^:]*)(?:\:(.*))?$/;

    readonly uri: string;

    readonly scheme: string | null = null;
    readonly authority: string | null = null;
    readonly path: string | null = null;
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
        const match = this.authority.match(Uri.AUTH_REGEX);
        if(!match) {
            return;
        }

        const parseAuthSeg = (seg: string): [string|null, string|null] => {
            if(!seg) {
                return [null, null];
            }
            const match = seg.match(Uri.AUTH_SEG_REGEX);
            if(!match) {
                return [null, null];
            }
            return [match[1] ?? null, match[2] ?? null];
        };
        [(this as Writeable).user, (this as Writeable).password] = parseAuthSeg(match[1]);
        [(this as Writeable).host, (this as Writeable).port] = parseAuthSeg(match[2]);
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

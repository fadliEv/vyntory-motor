export namespace main {
	
	export class Response {
	    success: boolean;
	    message?: string;
	    data?: any;
	    count?: number;
	
	    static createFrom(source: any = {}) {
	        return new Response(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.data = source["data"];
	        this.count = source["count"];
	    }
	}

}

